import type { FaceLandmarker } from '@mediapipe/tasks-vision';

export interface LoadedLandmarker {
  landmarker: FaceLandmarker;
  /** Pairs of landmark indexes that make up the face mesh (tessellation). */
  mesh: readonly { start: number; end: number }[];
  /** Outline of the face, eyes, eyebrows and lips, drawn a little firmer than the tessellation. */
  features: readonly { start: number; end: number }[];
}

// Self-hosted (public/mediapipe) so the guide works offline after the first visit and no third-party server sees the user.
const BASE = `${import.meta.env.BASE_URL}mediapipe`;

/**
 * Loads MediaPipe Face Landmarker lazily: the library is a dynamic import (its own chunk), and the wasm and model files are
 * only fetched when this is called, i.e. when the camera opens. Tries the GPU delegate first, then CPU.
 * Uses relaxed detection/presence/tracking confidence (0.3) so tilted (roll) and side-turned (yaw) faces in the dataset
 * continue tracking cleanly without dropping landmarks.
 */
export async function loadFaceLandmarker(): Promise<LoadedLandmarker> {
  const { FaceLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision');
  const fileset = await FilesetResolver.forVisionTasks(`${BASE}/wasm`);
  const make = (delegate: 'GPU' | 'CPU') =>
    FaceLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: `${BASE}/face_landmarker.task`, delegate },
      runningMode: 'VIDEO',
      numFaces: 1,
      minFaceDetectionConfidence: 0.3,
      minFacePresenceConfidence: 0.3,
      minTrackingConfidence: 0.3,
      outputFaceBlendshapes: false,
      outputFacialTransformationMatrixes: true,
    });
  let landmarker: FaceLandmarker;
  try {
    landmarker = await make('GPU');
  } catch {
    landmarker = await make('CPU');
  }
  const features = [
    ...FaceLandmarker.FACE_LANDMARKS_FACE_OVAL,
    ...FaceLandmarker.FACE_LANDMARKS_LEFT_EYE,
    ...FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE,
    ...FaceLandmarker.FACE_LANDMARKS_LEFT_EYEBROW,
    ...FaceLandmarker.FACE_LANDMARKS_RIGHT_EYEBROW,
    ...FaceLandmarker.FACE_LANDMARKS_LIPS,
  ];
  return { landmarker, mesh: FaceLandmarker.FACE_LANDMARKS_TESSELATION, features };
}
