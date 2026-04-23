import { FaceDetector, FilesetResolver } from "@mediapipe/tasks-vision";

let faceDetector = null;

/**
 * Inicializa el detector de caras de MediaPipe.
 * Solo se inicializa una vez (singleton) para ahorrar memoria.
 */
export const initFaceDetector = async () => {
  if (faceDetector) return faceDetector;

  // Usamos jsDelivr (npm mirror) — más estable que storage.googleapis.com en móviles
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
  );
  
  try {
    faceDetector = await FaceDetector.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite`,
        delegate: "GPU"
      },
      runningMode: "IMAGE",
      minDetectionConfidence: 0.2, // Muy sensible para detectar caras lejanas
    });
  } catch (gpuErr) {
    console.warn("GPU no disponible, usando CPU:", gpuErr);
    faceDetector = await FaceDetector.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite`,
        delegate: "CPU"
      },
      runningMode: "IMAGE",
      minDetectionConfidence: 0.2,
    });
  }

  return faceDetector;
};

/**
 * Detecta caras en una imagen y devuelve los bounding boxes.
 * @param {HTMLImageElement} image - Debe tener crossOrigin = 'anonymous' si es externa.
 * @returns {Promise<Array>} Lista de detecciones
 */
export const detectFaces = async (image) => {
  try {
    const detector = await initFaceDetector();
    const result = detector.detect(image);
    console.log(`[MediaPipe] Detecciones: ${result.detections.length}`);
    return result.detections;
  } catch (e) {
    console.error("[MediaPipe] detectFaces error:", e);
    return [];
  }
};
