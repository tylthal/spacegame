import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

/**
 * HandTracker Service
 * Static singleton that handles the lifecycle of the MediaPipe HandLandmarker.
 * Configured for dual-hand GPU tracking in VIDEO mode.
 */
export class HandTracker {
    private static handLandmarker: HandLandmarker | null = null;
    private static delegate: 'GPU' | 'CPU' | null = null;

    /**
     * init
     * Fetches WASM assets and initializes the model.
     * numHands is set to 2 to support the dual-hand aiming/firing protocol.
     */
    static async init() {
        if (this.handLandmarker) return { delegate: this.delegate };

        const wasmPath = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";
        const modelPath = "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

        let lastError: unknown;

        try {
            const vision = await FilesetResolver.forVisionTasks(wasmPath);

            this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
                baseOptions: {
                    modelAssetPath: modelPath,
                    delegate: "GPU"
                },
                runningMode: "VIDEO",
                numHands: 2
            });
            this.delegate = 'GPU';
            console.log("HandTracker initialized (GPU)");
            return { delegate: 'GPU' as const };
        } catch (error) {
            lastError = error;
            console.warn("HandTracker GPU initialization failed, attempting CPU fallback:", error);
            try {
                const vision = await FilesetResolver.forVisionTasks(wasmPath);
                this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
                    baseOptions: {
                        modelAssetPath: modelPath,
                        delegate: "CPU"
                    },
                    runningMode: "VIDEO",
                    numHands: 2
                });
                this.delegate = 'CPU';
                console.log("HandTracker initialized (CPU)");
                return { delegate: 'CPU' as const };
            } catch (cpuError) {
                console.error("Failed to initialize HandTracker (CPU):", cpuError);
                // Log detailed error for debugging
                if (cpuError instanceof Error) {
                     console.error(cpuError.message, cpuError.stack);
                } else {
                     console.error(JSON.stringify(cpuError));
                }
                lastError = cpuError;
            }
        }

        this.handLandmarker = null;
        this.delegate = null;
        throw lastError ?? new Error('Unknown HandTracker initialization failure');
    }

    /**
     * detect
     * Runs inference on the current video frame.
     * Uses performance.now() as the timestamp for MediaPipe's internal temporal tracking.
     */
    static async detect(video: HTMLVideoElement) {
        // Relaxed readyState check to allow detection as soon as we have current data
        if (!this.handLandmarker || video.readyState < 2) return null;
        try {
            return this.handLandmarker.detectForVideo(video, performance.now());
        } catch (error) {
            console.warn("Hand tracking detection error:", error);
            return null;
        }
    }

    /**
     * dispose
     * Releases resources held by the landmarker.
     */
    static dispose() {
        if (this.handLandmarker) {
            this.handLandmarker.close();
            this.handLandmarker = null;
        }
    }
}