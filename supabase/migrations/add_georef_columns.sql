-- ============================================================
-- 🌐 Migración: Agregar campos geográficos de Georef Argentina
-- Tabla: infractions
-- Fecha: 2024-04-24
-- Descripción: Agrega columnas para almacenar la dirección
-- textual resuelta por la API Georef del gobierno argentino.
-- Alcance inicial: Provincia de Buenos Aires / CABA
-- ============================================================

-- Agregar columna para el nombre de la provincia
ALTER TABLE infractions
ADD COLUMN IF NOT EXISTS provincia TEXT DEFAULT NULL;

-- Agregar columna para el municipio o departamento
ALTER TABLE infractions
ADD COLUMN IF NOT EXISTS municipio TEXT DEFAULT NULL;

-- Agregar columna para la dirección completa (calle + altura + depto + provincia)
ALTER TABLE infractions
ADD COLUMN IF NOT EXISTS direccion TEXT DEFAULT NULL;

-- Índice parcial para consultas filtradas por provincia (optimización)
-- Solo indexa las filas de Buenos Aires para no desperdiciar espacio
CREATE INDEX IF NOT EXISTS idx_infractions_provincia
ON infractions (provincia)
WHERE provincia IS NOT NULL;

-- ============================================================
-- Verificación: ejecutá esto después para confirmar que se crearon
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'infractions' AND column_name IN ('provincia', 'municipio', 'direccion');
-- ============================================================
