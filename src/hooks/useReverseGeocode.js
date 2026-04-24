/**
 * 📍 Hook useReverseGeocode
 * 
 * Hook de React que toma coordenadas GPS y devuelve la dirección
 * textual oficial usando la API Georef Argentina.
 * 
 * Se ejecuta automáticamente cuando cambian las coordenadas.
 * Incluye estados de carga y manejo de errores.
 * 
 * @example
 * const { locationData, isLoading, error } = useReverseGeocode({ lat: -34.6037, lng: -58.3816 })
 * // locationData.direccion_completa → "Av. Rivadavia 100, Monserrat, Ciudad Autónoma de Buenos Aires"
 */
import { useState, useEffect } from 'react'
import { reverseGeocode } from '../services/georefService'

export function useReverseGeocode(position) {
  // Estado para almacenar los datos de ubicación resueltos
  const [locationData, setLocationData] = useState(null)
  // Indicador de carga mientras se consulta la API
  const [isLoading, setIsLoading] = useState(false)
  // Mensaje de error si la consulta falla
  const [error, setError] = useState(null)

  useEffect(() => {
    // Si no hay coordenadas válidas, no hacer nada
    if (!position || !position.lat || !position.lng) return

    // Flag para evitar actualizar estado si el componente se desmonta
    let cancelled = false

    const resolve = async () => {
      setIsLoading(true)
      setError(null)

      try {
        // Llamar al servicio de geocodificación inversa
        const result = await reverseGeocode(position.lat, position.lng)
        
        // Solo actualizar si el componente sigue montado
        if (!cancelled) {
          setLocationData(result)
        }
      } catch (err) {
        if (!cancelled) {
          setError('No se pudo resolver la ubicación')
          console.error('useReverseGeocode error:', err)
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    resolve()

    // Cleanup: marcar como cancelado si el componente se desmonta
    return () => {
      cancelled = true
    }
  }, [position?.lat, position?.lng]) // Solo re-ejecutar si cambian las coordenadas

  return { locationData, isLoading, error }
}
