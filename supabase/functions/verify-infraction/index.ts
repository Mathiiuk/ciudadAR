import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { imageBase64, type } = await req.json()

    if (!imageBase64 || !type) {
        throw new Error("Se requiere 'imageBase64' y 'type' en el body.")
    }

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
    if (!GEMINI_API_KEY) {
        throw new Error("La clave GEMINI_API_KEY no está configurada en las variables de entorno.")
    }

    const prompt = `Analiza esta imagen para confirmar si muestra una infracción de tráfico del tipo: "${type}".
IMPORTANTE: Debes responder ÚNICAMENTE con un objeto JSON válido con esta estructura exacta, sin texto adicional ni formateo markdown:
{"valid": true/false, "confidence": número entre 0 y 1, "reason": "breve explicación en español de lo que ves y por qué es o no una infracción"}`

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inlineData: {
                    mimeType: "image/webp", // Asumiendo webp ya que el frontend guarda webp
                    data: imageBase64
                  }
                }
              ]
            }
          ]
        })
      }
    )

    const data = await response.json()
    
    if (data.error) {
        throw new Error(`Gemini API Error: ${data.error.message}`)
    }

    // Parse Gemini's response
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    
    let result;
    try {
        // Intentar limpiar la respuesta en caso de que devuelva bloques de código markdown
        const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        result = JSON.parse(cleanedText);
    } catch (e) {
        console.error("Error parseando JSON de Gemini:", text);
        result = { valid: false, confidence: 0, reason: "No se pudo procesar la respuesta de la IA de manera correcta." }
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
