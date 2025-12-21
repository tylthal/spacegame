import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

/**
 * HandTracker Service
 * Static singleton that handles the lifecycle of the MediaPipe HandLandmarker.
 * Configured for dual-hand GPU tracking in VIDEO mode.
 */
type AssetSource = {
    label: 'cdn';
    wasmPath: string;
    modelPath: string;
};

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

        try {
            const source = this.getCdnAssetSource();
            await this.verifyAssetAvailability(source);
            return await this.initializeWithSource(source);
        } catch (error) {
            this.handLandmarker = null;
            this.delegate = null;
            throw error;
        }
    }

    private static getCdnAssetSource() {
        return {
            label: 'cdn',
            wasmPath: this.normalizeBasePath("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"),
            modelPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task"
        };
    }

    private static normalizeBasePath(path: string) {
        return path.replace(/\/+$/, '');
    }

    private static joinUrl(base: string, resource: string) {
        const normalizedBase = this.normalizeBasePath(base);
        const normalizedResource = resource.replace(/^\/+/, '');
        return `${normalizedBase}/${normalizedResource}`;
    }

    private static async verifyAssetAvailability(source: AssetSource, timeoutMs = 5000) {
        const assets = [
            { url: this.joinUrl(source.wasmPath, 'vision_wasm_internal.wasm'), label: 'WASM core' },
            { url: source.modelPath, label: 'hand model' }
        ];

        const results = await Promise.all(
            assets.map(async ({ url, label }) => {
                try {
                    await this.checkUrl(url, timeoutMs);
                    return { ok: true };
                } catch (error) {
                    return { ok: false, label, error };
                }
            })
        );

        const failures = results.filter(result => !result.ok);
        if (failures.length) {
            const reasons = failures
                .map(failure => {
                    const error = failure.error instanceof Error ? failure.error.message : String(failure.error);
                    return `${failure.label}: ${error}`;
                })
                .join('; ');
            throw new Error(`Failed to load hand-tracking assets from ${source.label} (${reasons})`);
        }
    }

    private static async checkUrl(url: string, timeoutMs: number) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);
        try {
            const response = await fetch(url, { method: 'GET', cache: 'no-store', signal: controller.signal });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
        } catch (error: unknown) {
            if ((error as Error)?.name === 'AbortError') {
                throw new Error(`Timeout after ${timeoutMs}ms`);
            }
            throw error;
        } finally {
            clearTimeout(timeout);
        }
    }

    private static async initializeWithSource(source: AssetSource) {
        let lastError: unknown;
        let vision: Awaited<ReturnType<typeof FilesetResolver.forVisionTasks>>;
        const wasmPath = this.normalizeBasePath(source.wasmPath);
        const modelPath = source.modelPath;

        console.info('HandTracker resolving MediaPipe assets', {
            source: source.label,
            wasmPath,
            modelPath,
            baseUrl: import.meta.env.BASE_URL
        });
        try {
            vision = await FilesetResolver.forVisionTasks(wasmPath);
            console.info('FilesetResolver ready', {
                wasmCoreUrl: this.joinUrl(wasmPath, 'vision_wasm_internal.wasm'),
                wasmJsUrl: this.joinUrl(wasmPath, 'vision_wasm_internal.js'),
                wasmLoaderUrl: this.joinUrl(wasmPath, 'vision_wasm_nosimd_internal.wasm')
            });
        } catch (resolverError) {
            throw new Error(`Unable to load WASM assets from ${source.label}: ${resolverError instanceof Error ? resolverError.message : String(resolverError)}`);
        }

        try {
            this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
                baseOptions: {
                    modelAssetPath: modelPath,
                    delegate: "GPU"
                },
                runningMode: "VIDEO",
                numHands: 2
            });
            this.delegate = 'GPU';
            console.log(`HandTracker initialized (GPU) using ${source.label} assets`);
            return { delegate: 'GPU' as const };
        } catch (error) {
            lastError = error;
            console.warn(`HandTracker GPU initialization failed for ${source.label} assets, attempting CPU fallback:`, error);
            try {
                this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
                    baseOptions: {
                        modelAssetPath: modelPath,
                        delegate: "CPU",
                    },
                    runningMode: "VIDEO",
                    numHands: 2
                });
                this.delegate = 'CPU';
                console.log(`HandTracker initialized (CPU) using ${source.label} assets`);
                return { delegate: 'CPU' as const };
            } catch (cpuError) {
                console.error(`Failed to initialize HandTracker (CPU) with ${source.label} assets:`, cpuError);
                // Log detailed error for debugging
                if (cpuError instanceof Error) {
                     console.error(cpuError.message, cpuError.stack);
                } else {
                     console.error(JSON.stringify(cpuError));
                }
                lastError = cpuError;
                throw lastError;
            }
        }
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
