import { FaceLandmarker, FilesetResolver, type FaceLandmarkerResult, type ImageSource } from '@mediapipe/tasks-vision';

// MediaPipe's emscripten runtime routes all log levels (including INFO) through
// console.error. Patch at module load time so the WASM captures the filtered version.
if (typeof window !== 'undefined') {
  const _consoleError = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    if (typeof args[0] === 'string' && args[0].startsWith('INFO:')) return;
    _consoleError(...args);
  };
}

export type { FaceLandmarkerResult, ImageSource };

class MediaPipeService {
  private static instance: MediaPipeService;
  private faceLandmarker: FaceLandmarker | null = null;
  private initPromise: Promise<void> | null = null;

  private constructor() {}

  public static getInstance(): MediaPipeService {
    if (!MediaPipeService.instance) {
      MediaPipeService.instance = new MediaPipeService();
    }
    return MediaPipeService.instance;
  }

  public async initialize(): Promise<void> {
    if (this.faceLandmarker) return;

    // Deduplicate concurrent calls — return the same promise if already in flight
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );

      // Try GPU first, fall back to CPU if unavailable
      for (const delegate of ['GPU', 'CPU'] as const) {
        try {
          this.faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath:
                'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
              delegate,
            },
            runningMode: 'IMAGE',
            numFaces: 1,
            // blendshapes disabled — not consumed by the UI
            outputFaceBlendshapes: false,
          });
          break;
        } catch {
          if (delegate === 'CPU') {
            throw new Error('MediaPipe initialization failed on both GPU and CPU delegates.');
          }
        }
      }
    })();

    return this.initPromise;
  }

  // detect() is synchronous in the MediaPipe API — async here only to await initialize()
  public async detect(image: ImageSource): Promise<FaceLandmarkerResult | null> {
    await this.initialize();
    if (!this.faceLandmarker) return null;
    return this.faceLandmarker.detect(image);
  }
}

export const mediaPipeService = MediaPipeService.getInstance();
