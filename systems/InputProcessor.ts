import * as THREE from 'three';
import { OneEuroFilter } from '../utils/filters';
import { AIM, PINCH_THRESHOLD, MISSILE } from '../config/constants';

/**
 * InputProcessor
 * --------------
 * Pure utility for translating MediaPipe landmarks into smoothed aim rotations and gesture flags.
 * The heavy lifting (filtering, gesture thresholds) happens here so the render loop can stay lean.
 */

// Pooled result objects to prevent Garbage Collection churn
const _gestureResult = {
    isPauseGesture: false,
    isPinching: false,
    isFist: false,
    tip: null as any
};

export class InputProcessor {
    private filterYaw: OneEuroFilter;
    private filterPitch: OneEuroFilter;
    private smoothedRotation: THREE.Euler;

    constructor() {
        this.filterYaw = new OneEuroFilter(AIM.FILTER_MIN_CUTOFF, AIM.FILTER_BETA, 1.0);
        this.filterPitch = new OneEuroFilter(AIM.FILTER_MIN_CUTOFF, AIM.FILTER_BETA, 1.0);
        this.smoothedRotation = new THREE.Euler(0, 0, 0);
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
     * Convert raw landmarks into actionable gesture flags used by the game loop.
     * - Pause gesture: right hand open palm (ignores edge cases near the frame border)
     * - Pinch: thumb/index proximity below PINCH_THRESHOLD
     * - Fist: average distance of fingertips to wrist below MISSILE.FIST_THRESHOLD
     */
    public detectGestures(aimer: any, trigger: any) {
        // Reset pooled result
        _gestureResult.isPauseGesture = false;
        _gestureResult.isPinching = false;
        _gestureResult.isFist = false;
        _gestureResult.tip = null;

        if (aimer) {
            _gestureResult.tip = aimer[8];
            const indexUp = aimer[8].y < aimer[5].y;
            const middleUp = aimer[12].y < aimer[9].y;
            const ringUp = aimer[16].y < aimer[13].y;
            const pinkyUp = aimer[20].y < aimer[17].y;
            const isEdge = aimer[0].x < 0.05 || aimer[0].x > 0.95 || aimer[0].y < 0.05 || aimer[0].y > 0.95;

            if (indexUp && middleUp && ringUp && pinkyUp && !isEdge) {
                _gestureResult.isPauseGesture = true;
            }
        }

        if (trigger) {
            const t = trigger[4];
            const idx = trigger[8];
            const wrist = trigger[0];
            
            const distSq = (t.x - idx.x)**2 + (t.y - idx.y)**2;
            _gestureResult.isPinching = distSq < PINCH_THRESHOLD * PINCH_THRESHOLD;

            const tips = [8, 12, 16, 20];
            let avgDistToWrist = 0;
            for(let i=0; i<4; i++) {
               const tTip = trigger[tips[i]];
               avgDistToWrist += Math.sqrt((tTip.x - wrist.x)**2 + (tTip.y - wrist.y)**2);
            }
            avgDistToWrist /= 4;
            _gestureResult.isFist = avgDistToWrist < MISSILE.FIST_THRESHOLD;
        }

        return _gestureResult;
    }

    /**
     * Convert a single fingertip landmark into a smoothed camera rotation.
     * Applies the virtual mousepad model (sensitivity + tanh soft clamp), then runs the
     * OneEuroFilter and dynamic lerp to avoid overshooting on sudden flicks.
     */
    public calculateRotation(tip: any, calibrationPoint: {x: number, y: number}, now: number, target: THREE.Euler): void {
        const rawDx = (tip.x - calibrationPoint.x);
        const rawDy = (tip.y - calibrationPoint.y);

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
        
        const rotDiff = Math.sqrt(diffY*diffY + diffP*diffP);
        const dynamicLerp = Math.min(0.2 + (rotDiff * 1.5), 0.6); 

        this.smoothedRotation.y += (tY - this.smoothedRotation.y) * dynamicLerp;
        this.smoothedRotation.x += (tP - this.smoothedRotation.x) * dynamicLerp;

        target.set(this.smoothedRotation.x, this.smoothedRotation.y, this.smoothedRotation.z);
    }
}