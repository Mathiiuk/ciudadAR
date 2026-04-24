// Importamos el cliente de Supabase desde la librería oficial
import { createClient } from '@supabase/supabase-js'

// Obtenemos la URL y la Anon Key desde las variables de entorno de Vite (.env)
// Nota: Vite requiere el prefijo VITE_ para que las variables sean accesibles en el cliente
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Creamos e exportamos la instancia del cliente para usarla en toda la aplicación
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
