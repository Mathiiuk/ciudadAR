import { FaceDetector, FilesetResolver } from "@mediapipe/tasks-vision";

let faceDetector = null;

/**
 * Inicializa el detector de caras de MediaPipe.
 * Solo se inicializa una vez para ahorrar recursos.
 */
export const initFaceDetector = async () => {
  if (faceDetector) return faceDetector;

  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm"
  );
  
  faceDetector = await FaceDetector.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite`,
      delegate: "GPU"
    },
    runningMode: "IMAGE"
  });

  return faceDetector;
};

/**
 * Detecta caras en una imagen y devuelve los cuadros delimitadores.
 * @param {HTMLImageElement|HTMLCanvasElement} image 
 * @returns {Promise<Array>} Coordenadas de las caras
 */
export const detectFaces = async (image) => {
  const detector = await initFaceDetector();
  const detectionResult = detector.detect(image);
  return detectionResult.detections;
};
