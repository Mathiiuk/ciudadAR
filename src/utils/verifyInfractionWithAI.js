/**
 * verifyInfractionWithAI.js
 * 
 * Convierte la imagen a base64 y le pregunta a la Edge Function si
 * la foto corresponde al tipo de infracción declarado.
 * Evita reportes maliciosos o erróneos.
 */
import { supabase } from '../lib/supabaseClient'

/**
 * Convierte un Blob a base64.
 */
const blobToBase64 = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => resolve(reader.result.split(',')[1])
  reader.onerror = reject
  reader.readAsDataURL(blob)
})

/**
 * Verifica con Gemini Vision (via Edge Function) si la imagen coincide con el tipo de infracción.
 */
export const verifyInfractionImage = async (imageBlob, type) => {
  try {
    const base64Image = await blobToBase64(imageBlob)

    const response = await supabase.functions.invoke('verify-infraction', {
      body: { imageBase64: base64Image, type }
    })

    if (response.error) {
      throw new Error(response.error.message)
    }

    const { valid, reason } = response.data
    return { valid: !!valid, reason: reason || 'Sin motivo especificado' }
  } catch (e) {
    console.error('[Supabase Edge Function] Error de verificación:', e)
    // En caso de error en la red o en el servicio, evitamos bloquear al usuario y dejamos en revisión
    return { valid: true, reason: 'Verificación temporal no disponible, pasará a revisión manual.' }
  }
}
