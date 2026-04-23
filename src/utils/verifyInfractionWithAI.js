/**
 * verifyInfractionWithAI.js
 * 
 * Convierte la imagen a base64 y le pregunta a Gemini Vision si
 * la foto corresponde al tipo de infracción declarado.
 * Evita reportes maliciosos o erróneos.
 */

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY

const INFRACTION_DESCRIPTIONS = {
  'Mal Estacionamiento':     'un vehículo estacionado de forma incorrecta, en lugar prohibido, sobre la vereda, en parada de colectivo, o sobre una línea amarilla',
  'Obstrucción de rampa':    'un vehículo bloqueando una rampa de accesibilidad o entrada para personas con discapacidad',
  'Exceso de Velocidad':     'un vehículo circulando a alta velocidad, situación de tráfico peligroso',
  'Cruce en Rojo':           'un vehículo cruzando un semáforo en rojo o una señal de pare',
  'Uso Indebido Carril':     'un vehículo invadiendo un carril de tránsito que no le corresponde, como un carril bus, bici o exclusivo',
}

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
 * Verifica con Gemini Vision si la imagen coincide con el tipo de infracción.
 */
export const verifyInfractionImage = async (imageBlob, type) => {
  // Validamos si la clave existe Y si no es el placeholder de texto
  if (!GEMINI_API_KEY || GEMINI_API_KEY.includes('TU_API_KEY')) {
    console.warn('[Gemini] No hay una API Key válida configurada. Saltando verificación.')
    return { valid: true, reason: 'Verificación omitida (sin API Key real)' }
  }

  const description = INFRACTION_DESCRIPTIONS[type] || type
  const base64Image = await blobToBase64(imageBlob)

  const prompt = `Eres un inspector de tránsito experto y MUY ESTRICTO. 
  Analiza la imagen y determina si hay evidencia RAZONABLE de: "${description}".

  REGLAS CRÍTICAS:
  1. Si la foto es de una mano, un interior de una casa (muebles, cocina, etc), una persona sola (selfie sin entorno vial), una mascota, una captura de pantalla de otra cosa o cualquier imagen que NO sea un entorno vial/urbano, devuelve "valid": false.
  2. Debe haber al menos un vehículo, calle, señal de tránsito o elemento de infraestructura vial visible.
  3. No aceptes fotos de broma o que no tengan relación directa con el problema de tránsito reportado.

  Responde ÚNICAMENTE con un JSON con este formato exacto:
  {"valid": true, "reason": "brevísimo resumen"} o {"valid": false, "reason": "motivo del rechazo"}`

  try {
    const cleanKey = GEMINI_API_KEY.trim()
    
    // Usamos el modelo LITE: igual de capaz para esto pero con más disponibilidad
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${cleanKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inline_data: { mime_type: "image/webp", data: base64Image } }
            ]
          }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 100 }
        })
      }
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(`HTTP ${response.status}: ${errorData.error?.message || 'Error desconocido'}`)
    }

    const data = await response.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('Formato de respuesta inválido')
      
      const parsed = JSON.parse(jsonMatch[0])
      return {
        valid: !!parsed.valid,
        reason: parsed.reason || 'Sin motivo especificado'
      }
    } catch (parseErr) {
      const isOk = text.toLowerCase().includes('true') || text.toLowerCase().includes('válido')
      return { valid: isOk, reason: text.slice(0, 50) }
    }
  } catch (e) {
    console.error('[Gemini] Error de verificación:', e)
    return { valid: true, reason: 'Verificación temporal no disponible' }
  }
}
