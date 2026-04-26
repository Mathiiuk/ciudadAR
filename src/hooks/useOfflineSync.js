import { useEffect } from 'react'
import { openDB } from 'idb'
import { supabase } from '../lib/supabaseClient'
import { verifyInfractionImage } from '../utils/verifyInfractionWithAI'

export const initDB = async () => {
  return openDB('ciudadar-offline', 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('reports')) {
        db.createObjectStore('reports', { keyPath: 'id', autoIncrement: true })
      }
    }
  })
}

export function useOfflineSync() {
  useEffect(() => {
    const syncReports = async () => {
      if (!navigator.onLine) return

      const db = await initDB()
      const tx = db.transaction('reports', 'readonly')
      const reports = await tx.objectStore('reports').getAll()

      if (reports.length > 0) {
        console.log(`[Offline Sync] Sincronizando ${reports.length} reportes encolados...`)
      }

      for (const report of reports) {
        try {
          // 1. Verificación
          const verification = await verifyInfractionImage(report.imageBlob, report.type)
          
          // 2. Subida de imagen
          const fileId = crypto.randomUUID()
          const fileName = `${fileId}.webp`
          const { error: storageError } = await supabase.storage
            .from('evidencia-infracciones')
            .upload(fileName, report.imageBlob, { contentType: 'image/webp' })
          
          if (storageError) throw storageError
          
          const { data: publicUrlData } = supabase.storage
            .from('evidencia-infracciones')
            .getPublicUrl(fileName)

          // 3. Insertar en DB
          const ewktPoint = `POINT(${report.position.lng} ${report.position.lat})`
          const { error: dbError } = await supabase.from('infractions').insert([{
            user_id: report.user_id,
            location: ewktPoint,
            image_url: publicUrlData.publicUrl,
            type: report.type,
            description: report.description,
            status: verification.valid ? 'aprobada' : 'pendiente',
            ...(report.locationData && {
              provincia: report.locationData.provincia,
              municipio: report.locationData.municipio || report.locationData.departamento,
              direccion: report.locationData.direccion_completa,
            }),
            created_at: new Date(report.timestamp).toISOString()
          }])

          if (dbError) throw dbError

          // 4. Eliminar de la cola (IDB)
          const deleteTx = db.transaction('reports', 'readwrite')
          await deleteTx.objectStore('reports').delete(report.id)
          await deleteTx.done

          console.log(`[Offline Sync] Reporte ${report.id} sincronizado con éxito.`)

        } catch (error) {
          console.error(`[Offline Sync] Error sincronizando reporte ${report.id}:`, error)
        }
      }
    }

    window.addEventListener('online', syncReports)
    
    // Si la app se carga con internet, intenta sincronizar de inmediato
    if (navigator.onLine) {
        syncReports()
    }

    return () => window.removeEventListener('online', syncReports)
  }, [])
}
