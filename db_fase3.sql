-- =================================================================================
-- 1. CREACIÓN DE TABLA SECUNDARIA PARA ZONAS CALIENTES
-- =================================================================================
CREATE TABLE IF NOT EXISTS public.high_priority_zones (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  center_location geography(POINT, 4326) NOT NULL,
  infraction_count int NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.high_priority_zones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lectura publica de high priority zones" ON public.high_priority_zones FOR SELECT USING (true);

-- =================================================================================
-- 2. TRIGGER DE "CONGESTIÓN / ALTA PRIORIDAD"
-- =================================================================================
CREATE OR REPLACE FUNCTION public.check_high_priority_zone()
RETURNS TRIGGER AS $$
DECLARE
  recent_count INT;
BEGIN
  -- Revisa si hay más de 5 infracciones en un radio de 100 metros en la última hora (incluyendo la nueva)
  SELECT count(*) INTO recent_count
  FROM public.infractions
  WHERE created_at > (now() - interval '1 hour')
    AND ST_DWithin(location, NEW.location, 100); -- Unidades en metros para Geography

  IF recent_count >= 5 THEN
    -- Insertamos el registro de la zona caliente;
    -- Se podría optimizar revisando si ya existe una zona para no duplicar.
    INSERT INTO public.high_priority_zones(center_location, infraction_count)
    VALUES (NEW.location, recent_count);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Eliminamos en caso de existir, luego creamos.
DROP TRIGGER IF EXISTS trigger_high_priority ON public.infractions;

CREATE TRIGGER trigger_high_priority
  AFTER INSERT ON public.infractions
  FOR EACH ROW
  EXECUTE FUNCTION check_high_priority_zone();


-- =================================================================================
-- 3. FUNCIONES ESPACIALES (RPC) DE BÚSQUEDA GEOGRÁFICA
-- =================================================================================
-- Retorna GeoJSON puro directamente de PostGIS pero ahora filtrado con ST_DWithin (Unidades en metros)
-- Adaptada acorde al RLS empresarial para Ciudadanos y Oficiales

CREATE OR REPLACE FUNCTION public.get_infractions_nearby(p_lat double precision, p_lng double precision, p_radius_meters double precision)
RETURNS jsonb AS $$
BEGIN
  RETURN (
    SELECT jsonb_build_object(
      'type', 'FeatureCollection',
      'features', COALESCE(jsonb_agg(
        jsonb_build_object(
          'type', 'Feature',
          'geometry', ST_AsGeoJSON(location)::jsonb,
          'properties', jsonb_build_object(
            'id', id,
            'image_url', image_url,
            'status', status,
            'type_name', type,
            'created_at', created_at,
            'is_new', false -- Propiedad para frontend
          )
        )
      ), '[]'::jsonb)
    )
    FROM public.infractions
    WHERE ST_DWithin(
      location,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography, 
      p_radius_meters
    )
    -- El SECURITY INVOKER filtrará automáticamente bajo la regla RLS configurada abajo
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY INVOKER;


-- =================================================================================
-- 4. POLÍTICAS DE SEGURIDAD RLS GLOBALES FINALES MIGRADO (Roles Ciudadano vs Oficial)
-- =================================================================================

-- Destruir reglas previas si existiesen
DROP POLICY IF EXISTS "Autenticados insertan sus propios reportes" ON public.infractions;
DROP POLICY IF EXISTS "Ver propios reportes o todos si admin/oficial" ON public.infractions;
DROP POLICY IF EXISTS "Autenticados pueden insertar sus reportes" ON public.infractions;
DROP POLICY IF EXISTS "Visualización aislada o nivel jerárquico global" ON public.infractions;

-- Ciudadano inserta sus multas
CREATE POLICY "ciudadano_inserta_infracciones" ON public.infractions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Ciudadano o Oficial Actualizan? (Solo oficial)
CREATE POLICY "oficial_actualiza_infracciones" ON public.infractions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() AND profiles.role = 'oficial'
    )
  );

-- Select general de mapa y dashboards (Regla Inteligente)
CREATE POLICY "lectura_inteligente_infracciones" ON public.infractions
  FOR SELECT USING (
    -- Si eres el creador, lo ves no importa el estado
    auth.uid() = user_id 
    OR 
    -- Si está aprobada, todo mundo la vel
    status = 'aprobada'::public.infraction_status
    OR
    -- Si es un oficial logeado, ve absolutamente todas para auditarlas o rechazarlas.
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() AND profiles.role = 'oficial'
    )
  );
