-- Migración: Añadir campos de ubicación (Georef) a la tabla profiles

-- 1. Agregamos las columnas si no existen
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS provincia_id VARCHAR(50),
ADD COLUMN IF NOT EXISTS provincia_nombre VARCHAR(100),
ADD COLUMN IF NOT EXISTS municipio_id VARCHAR(50),
ADD COLUMN IF NOT EXISTS municipio_nombre VARCHAR(100);

-- 2. Actualizamos la política de seguridad (RLS) si es necesario
-- La política actual probablemente permite a los usuarios actualizar su propio perfil, 
-- pero nos aseguramos de que puedan editar estos nuevos campos.

-- Si la tabla profiles no tiene RLS activado, habilitarlo:
-- ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Política para que un usuario pueda actualizar su propio perfil (si no existe ya):
-- CREATE POLICY "Users can update own profile."
-- ON profiles FOR UPDATE
-- USING ( auth.uid() = id );

-- Opcional: Crear índices para facilitar futuras búsquedas de usuarios por localidad
CREATE INDEX IF NOT EXISTS idx_profiles_provincia ON profiles(provincia_id);
CREATE INDEX IF NOT EXISTS idx_profiles_municipio ON profiles(municipio_id);

-- Comentario para la tabla
COMMENT ON COLUMN profiles.provincia_id IS 'ID de la provincia según API Georef';
COMMENT ON COLUMN profiles.provincia_nombre IS 'Nombre de la provincia según API Georef';
COMMENT ON COLUMN profiles.municipio_id IS 'ID del municipio/departamento/comuna según API Georef';
COMMENT ON COLUMN profiles.municipio_nombre IS 'Nombre del municipio/departamento/comuna según API Georef';
