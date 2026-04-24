/**
 * 🌐 Servicio de Geocodificación - API Georef Argentina
 * 
 * Consulta la API oficial del gobierno argentino para resolver
 * coordenadas GPS en direcciones textuales (geocodificación inversa).
 * 
 * Documentación: https://datosgobar.github.io/georef-ar-api/
 * Endpoint principal: GET /api/v2.0/ubicacion?lat={lat}&lon={lng}
 */

// URL base de la API Georef del gobierno argentino
const GEOREF_BASE_URL = 'https://apis.datos.gob.ar/georef/api/v2.0'

// Timeout máximo en milisegundos para las consultas a la API
const REQUEST_TIMEOUT = 5000

// Cache en memoria para evitar llamadas repetidas con las mismas coordenadas
// Clave: "lat,lng" redondeado a 4 decimales (~11m de precisión)
const cache = new Map()

/**
 * Redondea las coordenadas a 4 decimales para usar como clave de cache.
 * 4 decimales = ~11 metros de precisión, suficiente para una dirección.
 * @param {number} lat - Latitud
 * @param {number} lng - Longitud
 * @returns {string} Clave del cache (ej: "-34.6037,-58.3816")
 */
const getCacheKey = (lat, lng) => `${lat.toFixed(4)},${lng.toFixed(4)}`

/**
 * Ejecuta un fetch con un timeout máximo para evitar que la app se cuelgue
 * si la API del gobierno no responde.
 * @param {string} url - URL a consultar
 * @param {number} timeout - Tiempo máximo en milisegundos
 * @returns {Promise<Response>}
 */
const fetchWithTimeout = async (url, timeout = REQUEST_TIMEOUT) => {
  // AbortController permite cancelar la petición si excede el tiempo
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, { signal: controller.signal })
    clearTimeout(timer) // Si respondió a tiempo, cancelamos el timer
    return response
  } catch (error) {
    clearTimeout(timer)
    throw error
  }
}

/**
 * 📍 Geocodificación Inversa (Coordenadas → Dirección)
 * 
 * Dadas unas coordenadas GPS, devuelve la dirección textual oficial
 * según los datos del gobierno argentino.
 * 
 * @param {number} lat - Latitud (ej: -34.6037)
 * @param {number} lng - Longitud (ej: -58.3816)
 * @returns {Promise<{
 *   provincia: string,
 *   departamento: string,
 *   municipio: string,
 *   direccion: string,
 *   direccion_completa: string,
 *   raw: object
 * }>}
 */
export async function reverseGeocode(lat, lng) {
  // 1️⃣ Verificar si ya tenemos este resultado en cache
  const key = getCacheKey(lat, lng)
  if (cache.has(key)) {
    return cache.get(key) // Devolvemos directamente sin llamar a la API
  }

  try {
    // 2️⃣ Construir la URL de la API Georef
    const url = `${GEOREF_BASE_URL}/ubicacion?lat=${lat}&lon=${lng}`

    // 3️⃣ Hacer la petición con timeout de seguridad
    const response = await fetchWithTimeout(url)

    if (!response.ok) {
      throw new Error(`API Georef respondió con status ${response.status}`)
    }

    const data = await response.json()

    // 4️⃣ Extraer los datos relevantes de la respuesta
    const ubicacion = data.ubicacion || {}
    const provincia = ubicacion.provincia?.nombre || 'Desconocida'
    const departamento = ubicacion.departamento?.nombre || ''
    const municipio = ubicacion.municipio?.nombre || ''

    // Construir la dirección legible
    // Si hay calle y altura, armar la dirección completa
    const calle = ubicacion.calle?.nombre || ''
    const altura = ubicacion.calle?.altura?.valor || ''
    const direccion = calle
      ? `${calle}${altura ? ` ${altura}` : ''}`
      : ''

    // Dirección completa con todos los niveles administrativos
    const partes = [direccion, departamento, provincia].filter(Boolean)
    const direccion_completa = partes.join(', ')

    // 5️⃣ Crear el objeto resultado
    const result = {
      provincia,
      departamento,
      municipio,
      direccion,
      direccion_completa: direccion_completa || `${provincia}, Argentina`,
      raw: ubicacion, // Datos crudos por si se necesita más info
    }

    // 6️⃣ Guardar en cache para futuras consultas
    cache.set(key, result)

    return result

  } catch (error) {
    // 🛡️ Fallback graceful: si la API falla, devolvemos datos mínimos
    // para que la app no se rompa
    console.warn('⚠️ Georef API no disponible:', error.message)

    return {
      provincia: 'Argentina',
      departamento: '',
      municipio: '',
      direccion: '',
      direccion_completa: 'Argentina',
      raw: null,
    }
  }
}

/**
 * Limpia el cache de geocodificación (útil para testing)
 */
export function clearGeorefCache() {
  cache.clear()
}

/**
 * Obtiene la lista de provincias de Argentina.
 * @returns {Promise<Array<{id: string, nombre: string}>>}
 */
export async function getProvincias() {
  try {
    const response = await fetchWithTimeout(`${GEOREF_BASE_URL}/provincias?campos=id,nombre&max=100`)
    if (!response.ok) throw new Error('Error al obtener provincias')
    const data = await response.json()
    // Ordenar alfabéticamente
    return data.provincias.sort((a, b) => a.nombre.localeCompare(b.nombre))
  } catch (error) {
    console.error('Error fetching provincias:', error)
    return []
  }
}

/**
 * Obtiene los municipios o departamentos de una provincia.
 * @param {string} provinciaId - ID de la provincia
 * @returns {Promise<Array<{id: string, nombre: string}>>}
 */
export async function getMunicipios(provinciaId) {
  if (!provinciaId) return []
  try {
    // Para algunas provincias (como CABA), la subdivisión es "departamentos" (comunas) en lugar de "municipios"
    // Consultamos ambas y unimos los resultados si es necesario, o priorizamos municipios y fallback a departamentos
    
    let localidades = []
    
    // Primero intentamos municipios
    const responseMuni = await fetchWithTimeout(`${GEOREF_BASE_URL}/municipios?provincia=${provinciaId}&campos=id,nombre&max=200`)
    if (responseMuni.ok) {
      const dataMuni = await responseMuni.json()
      localidades = dataMuni.municipios
    }

    // Si no hay municipios (ej. CABA), probamos departamentos
    if (localidades.length === 0) {
      const responseDepto = await fetchWithTimeout(`${GEOREF_BASE_URL}/departamentos?provincia=${provinciaId}&campos=id,nombre&max=200`)
      if (responseDepto.ok) {
        const dataDepto = await responseDepto.json()
        localidades = dataDepto.departamentos
      }
    }

    // Ordenar alfabéticamente
    return localidades.sort((a, b) => a.nombre.localeCompare(b.nombre))
  } catch (error) {
    console.error(`Error fetching municipios for provincia ${provinciaId}:`, error)
    return []
  }
}

/**
 * Obtiene las localidades (y sus centroides) dentro de un municipio.
 * @param {string} municipioId - ID del municipio o departamento
 * @returns {Promise<Array<{id: string, nombre: string, lat: number, lon: number}>>}
 */
export async function getLocalidades(municipioId) {
  if (!municipioId) return []
  try {
    let localidades = []
    
    // 1. Intentar buscar como gobierno_local (Municipios)
    let url = `${GEOREF_BASE_URL}/localidades?gobierno_local=${municipioId}&campos=id,nombre,centroide.lat,centroide.lon&max=200`
    let response = await fetchWithTimeout(url)
    
    if (response.ok) {
      let data = await response.json()
      localidades = data.localidades || []
    }

    // 2. Si falló o no hay resultados, probar como departamento (Ej: CABA o provincias sin municipios)
    if (localidades.length === 0) {
      url = `${GEOREF_BASE_URL}/localidades?departamento=${municipioId}&campos=id,nombre,centroide.lat,centroide.lon&max=200`
      response = await fetchWithTimeout(url)
      
      if (response.ok) {
        let data = await response.json()
        localidades = data.localidades || []
      }
    }

    // Mapeamos para aplanar el objeto centroide y ordenamos alfabéticamente
    return localidades.map(loc => ({
      id: loc.id,
      nombre: loc.nombre,
      lat: loc.centroide.lat,
      lon: loc.centroide.lon
    })).sort((a, b) => a.nombre.localeCompare(b.nombre))

  } catch (error) {
    console.error(`Error fetching localidades for municipio ${municipioId}:`, error)
    return []
  }
}
