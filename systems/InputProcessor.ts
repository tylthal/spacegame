import * as THREE from 'three';
import { OneEuroFilter } from '../utils/filters';
import { AIM, PINCH_THRESHOLD, MISSILE } from '../config/constants';
import { InputSnapshot } from '../types';

/**
 * InputProcessor
 * --------------
 * Pure utility for translating MediaPipe landmarks into smoothed aim rotations and gesture flags.
 * The heavy lifting (filtering, gesture thresholds) happens here so the render loop can stay lean.
 */

interface GestureResult {
  isPauseGesture: boolean;
  isPinching: boolean;
  isFist: boolean;
  tip: { x: number; y: number } | null;
}

const GESTURE_DEBOUNCE_MS = 120;

export class InputProcessor {
    private filterYaw: OneEuroFilter;
    private filterPitch: OneEuroFilter;
    private smoothedRotation: THREE.Euler;
    private aimDirection: THREE.Vector3;
    private aimOffset: { x: number; y: number };
    private gestureState: { pause: boolean; pinch: boolean; fist: boolean };
    private gestureTimestamps: { pause: number; pinch: number; fist: number };
    private lastAimerSeen = 0;
    private lastTriggerSeen = 0;
    private snapshot: InputSnapshot;

    constructor() {
        this.filterYaw = new OneEuroFilter(AIM.FILTER_MIN_CUTOFF, AIM.FILTER_BETA, 1.0);
        this.filterPitch = new OneEuroFilter(AIM.FILTER_MIN_CUTOFF, AIM.FILTER_BETA, 1.0);
        this.smoothedRotation = new THREE.Euler(0, 0, 0);
        this.aimDirection = new THREE.Vector3(0, 0, -1);
        this.aimOffset = { x: 0, y: 0 };
        this.gestureState = { pause: false, pinch: false, fist: false };
        this.gestureTimestamps = { pause: 0, pinch: 0, fist: 0 };
        this.snapshot = {
            aim: { rotation: this.smoothedRotation, direction: this.aimDirection, offset: this.aimOffset, tip: null },
            gestures: { pause: false, pinch: false, fist: false, tip: null },
            tracking: { aimer: false, trigger: false, health: 0 },
        };
    }

    /**
     * Extract the right/left hand landmarks out of the MediaPipe result.
     * Returns nulls if the hand is not present to keep downstream logic simple.
     */
    public getHandData(result: any) {
        const landmarks = result?.landmarks || [];
        const handednesses = result?.handednesses || [];
        let aimer = null;
        let trigger = null;

        for (let i = 0; i < landmarks.length; i++) {
            const label = handednesses[i]?.[0]?.displayName || handednesses[i]?.[0]?.label;
            if (label === "Right") aimer = landmarks[i];
            if (label === "Left") trigger = landmarks[i];
        }
        return { aimer, trigger };
    }

    /**
     * High-level per-frame snapshot: combines tracking state, debounced gestures,
     * and smoothed aim vectors. Keeps the OneEuro filter state encapsulated.
     */
    public processFrame(result: any, calibrationPoint: { x: number; y: number }, now: number): InputSnapshot {
        const { aimer, trigger } = this.getHandData(result);

        if (aimer) this.lastAimerSeen = now;
        if (trigger) this.lastTriggerSeen = now;

        const rawGestures = this.detectGestures(aimer, trigger);
        this.applyGestureDebounce(rawGestures, now);

        const tip = rawGestures.tip;
        this.snapshot.gestures.pause = this.gestureState.pause;
        this.snapshot.gestures.pinch = this.gestureState.pinch;
        this.snapshot.gestures.fist = this.gestureState.fist;
        this.snapshot.gestures.tip = tip;

        if (tip) {
            this.updateAim(tip, calibrationPoint, now);
        } else {
            this.aimOffset.x = 0;
            this.aimOffset.y = 0;
            this.snapshot.aim.tip = null;
        }

        this.snapshot.tracking.aimer = !!aimer;
        this.snapshot.tracking.trigger = !!trigger;
        const lastSeen = Math.max(now - this.lastAimerSeen, now - this.lastTriggerSeen);
        const health = Math.max(0, Math.min(1, 1 - (lastSeen / 800)));
        this.snapshot.tracking.health = health;

        return this.snapshot;
    }

    private detectGestures(aimer: any, trigger: any): GestureResult {
        const result: GestureResult = { isPauseGesture: false, isPinching: false, isFist: false, tip: null };

        if (aimer) {
            result.tip = { x: aimer[8].x, y: aimer[8].y };
            const indexUp = aimer[8].y < aimer[5].y;
            const middleUp = aimer[12].y < aimer[9].y;
            const ringUp = aimer[16].y < aimer[13].y;
            const pinkyUp = aimer[20].y < aimer[17].y;
            const isEdge = aimer[0].x < 0.05 || aimer[0].x > 0.95 || aimer[0].y < 0.05 || aimer[0].y > 0.95;

            if (indexUp && middleUp && ringUp && pinkyUp && !isEdge) {
                result.isPauseGesture = true;
            }
        }

        if (trigger) {
            const t = trigger[4];
            const idx = trigger[8];
            const wrist = trigger[0];

            const distSq = (t.x - idx.x) ** 2 + (t.y - idx.y) ** 2;
            result.isPinching = distSq < PINCH_THRESHOLD * PINCH_THRESHOLD;

            const tips = [8, 12, 16, 20];
            let avgDistToWrist = 0;
            for (let i = 0; i < 4; i++) {
                const tTip = trigger[tips[i]];
                avgDistToWrist += Math.sqrt((tTip.x - wrist.x) ** 2 + (tTip.y - wrist.y) ** 2);
            }
            avgDistToWrist /= 4;
            result.isFist = avgDistToWrist < MISSILE.FIST_THRESHOLD;
        }

        return result;
    }

    private applyGestureDebounce(result: GestureResult, now: number) {
        this.gestureState.pause = this.updateGestureState('pause', result.isPauseGesture, now);
        this.gestureState.pinch = this.updateGestureState('pinch', result.isPinching, now);
        this.gestureState.fist = this.updateGestureState('fist', result.isFist, now);
    }

    private updateGestureState(key: 'pause' | 'pinch' | 'fist', isActive: boolean, now: number) {
        if (this.gestureState[key] === isActive) return this.gestureState[key];

        if (now - this.gestureTimestamps[key] >= GESTURE_DEBOUNCE_MS) {
            this.gestureState[key] = isActive;
            this.gestureTimestamps[key] = now;
        }

        return this.gestureState[key];
    }

    /**
     * Convert a single fingertip landmark into a smoothed camera rotation.
     * Applies the virtual mousepad model (sensitivity + tanh soft clamp), then runs the
     * OneEuroFilter and dynamic lerp to avoid overshooting on sudden flicks.
     */
    private updateAim(tip: { x: number; y: number }, calibrationPoint: { x: number; y: number }, now: number): void {
        const rawDx = (tip.x - calibrationPoint.x);
        const rawDy = (tip.y - calibrationPoint.y);

        this.aimOffset.x = rawDx;
        this.aimOffset.y = rawDy;
        this.snapshot.aim.tip = tip;

        const scaledDx = rawDx * AIM.INPUT_SENSITIVITY;
        const scaledDy = rawDy * AIM.INPUT_SENSITIVITY;

        const clampedX = Math.tanh(scaledDx);
        const clampedY = Math.tanh(scaledDy);

        const targetYaw = clampedX * AIM.MAX_YAW;
        const targetPitch = -clampedY * AIM.MAX_PITCH;

        const tY = this.filterYaw.filter(targetYaw, now);
        const tP = this.filterPitch.filter(targetPitch, now);

        const diffY = Math.abs(tY - this.smoothedRotation.y);
        const diffP = Math.abs(tP - this.smoothedRotation.x);

        const rotDiff = Math.sqrt(diffY * diffY + diffP * diffP);
        const dynamicLerp = Math.min(0.2 + (rotDiff * 1.5), 0.6);

        this.smoothedRotation.y += (tY - this.smoothedRotation.y) * dynamicLerp;
        this.smoothedRotation.x += (tP - this.smoothedRotation.x) * dynamicLerp;

        this.snapshot.aim.rotation.set(this.smoothedRotation.x, this.smoothedRotation.y, this.smoothedRotation.z);
        this.snapshot.aim.direction.set(0, 0, -1).applyEuler(this.snapshot.aim.rotation);
    }
}