import { openDB } from 'idb';

const DB_NAME = 'CiudadAR_Offline';
const STORE_NAME = 'pending_infractions';

const dbPromise = openDB(DB_NAME, 1, {
  upgrade(db) {
    if (!db.objectStoreNames.contains(STORE_NAME)) {
      db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
    }
  },
});

/**
 * Guarda una infracción localmente cuando no hay conexión.
 */
export const saveInfractionOffline = async (infractionData) => {
  const db = await dbPromise;
  const id = await db.add(STORE_NAME, {
    ...infractionData,
    timestamp: new Date().toISOString(),
  });
  return id;
};

/**
 * Recupera todas las infracciones pendientes de subir.
 */
export const getOfflineInfractions = async () => {
  const db = await dbPromise;
  return await db.getAll(STORE_NAME);
};

/**
 * Elimina una infracción tras haberla subido con éxito.
 */
export const deleteOfflineInfraction = async (id) => {
  const db = await dbPromise;
  await db.delete(STORE_NAME, id);
};

/**
 * Cuenta cuántos reportes están pendientes.
 */
export const getOfflineCount = async () => {
  const db = await dbPromise;
  const all = await db.getAll(STORE_NAME);
  return all.length;
};
