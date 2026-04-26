-- =================================================================================
-- ESQUEMA CONSOLIDADO CIUDAD-AR (PRODUCCIÓN - VERSIÓN FINAL)
-- =================================================================================

-- 1. EXTENSIONES
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. ENUMS
DO $$ BEGIN
    CREATE TYPE public.infraction_status AS ENUM ('pendiente', 'en_revision', 'aprobada', 'rechazada');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. TABLAS NUCLEO
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username text UNIQUE NOT NULL,
  full_name text,
  avatar_url text,
  role text DEFAULT 'ciudadano'::text NOT NULL,
  jurisdiction text, -- Municipio o Provincia asignada al oficial para control zonal
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.infractions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  location geography(POINT, 4326) NOT NULL,
  image_url text NOT NULL,
  type text,
  description text,
  status public.infraction_status DEFAULT 'pendiente'::public.infraction_status NOT NULL,
  
  -- Datos Geográficos (Enriquecidos vía Georef)
  provincia_nombre text,
  municipio_nombre text,
  direccion text,
  
  ocr_data jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  read boolean DEFAULT false NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. ÍNDICES DE RENDIMIENTO
CREATE INDEX IF NOT EXISTS idx_infractions_user_id ON public.infractions(user_id);
CREATE INDEX IF NOT EXISTS idx_infractions_status ON public.infractions(status);
CREATE INDEX IF NOT EXISTS idx_infractions_municipio ON public.infractions(municipio_nombre);
CREATE INDEX IF NOT EXISTS idx_profiles_jurisdiction ON public.profiles(jurisdiction);
CREATE INDEX IF NOT EXISTS idx_infractions_location ON public.infractions USING GIST (location);

-- 5. FUNCIONES DE APOYO Y TRIGGERS
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.get_auth_user_role()
RETURNS text AS $$
  SELECT role FROM public.profiles WHERE id = (select auth.uid());
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_auth_user_jurisdiction()
RETURNS text AS $$
  SELECT jurisdiction FROM public.profiles WHERE id = (select auth.uid());
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Trigger para notificaciones automáticas
CREATE OR REPLACE FUNCTION public.handle_infraction_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF (OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO public.notifications (user_id, title, message)
    VALUES (
      NEW.user_id,
      'Actualización de Reporte',
      'El estado de tu reporte "' || NEW.type || '" ha cambiado de ' || OLD.status || ' a ' || NEW.status || '.'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_infraction_status_notification ON public.infractions;
CREATE TRIGGER trigger_infraction_status_notification
AFTER UPDATE ON public.infractions
FOR EACH ROW EXECUTE FUNCTION handle_infraction_status_change();

-- 6. SEGURIDAD RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.infractions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Perfil publico" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Auto-insercion perfil" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "ciudadano_inserta" ON public.infractions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "oficial_gestiona" ON public.infractions FOR UPDATE USING (
    public.get_auth_user_role() = 'oficial' AND 
    (public.get_auth_user_jurisdiction() IS NULL OR municipio_nombre = public.get_auth_user_jurisdiction() OR provincia_nombre = public.get_auth_user_jurisdiction())
);
CREATE POLICY "lectura_inteligente" ON public.infractions FOR SELECT USING (
    auth.uid() = user_id OR status = 'aprobada' OR 
    (public.get_auth_user_role() = 'oficial' AND (public.get_auth_user_jurisdiction() IS NULL OR municipio_nombre = public.get_auth_user_jurisdiction() OR provincia_nombre = public.get_auth_user_jurisdiction()))
);

CREATE POLICY "Usuarios ven sus notificaciones" ON public.notifications 
FOR SELECT USING (auth.uid() = user_id);

-- 7. FUNCIONES RPC (FRONTEND API)
-- Mapa Dinámico (Cercanía) con filtro de jurisdicción
CREATE OR REPLACE FUNCTION public.get_infractions_nearby(p_lat double precision, p_lng double precision, p_radius_meters double precision)
RETURNS jsonb AS $$
DECLARE
  v_jurisdiction text;
BEGIN
  v_jurisdiction := public.get_auth_user_jurisdiction();

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
            'created_at', created_at
          )
        )
      ), '[]'::jsonb)
    )
    FROM public.infractions
    WHERE ST_DWithin(location, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography, p_radius_meters)
    AND (v_jurisdiction IS NULL OR municipio_nombre = v_jurisdiction OR provincia_nombre = v_jurisdiction)
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY INVOKER;

-- Clustering Server-Side
CREATE OR REPLACE FUNCTION public.get_clustered_infractions(p_lat double precision, p_lng double precision, p_radius_meters double precision, p_grid_size double precision DEFAULT 0.01)
RETURNS jsonb AS $$
DECLARE
  v_jurisdiction text;
BEGIN
  v_jurisdiction := public.get_auth_user_jurisdiction();

  RETURN (
    SELECT jsonb_build_object(
      'type', 'FeatureCollection',
      'features', COALESCE(jsonb_agg(
        jsonb_build_object(
          'type', 'Feature',
          'geometry', ST_AsGeoJSON(ST_Centroid(ST_Collect(location::geometry)))::jsonb,
          'properties', jsonb_build_object(
            'is_cluster', count(*) > 1,
            'point_count', count(*),
            'id', (array_agg(id))[1],
            'image_url', (array_agg(image_url))[1],
            'status', (array_agg(status))[1],
            'type_name', (array_agg(type))[1],
            'created_at', (array_agg(created_at))[1]
          )
        )
      ), '[]'::jsonb)
    )
    FROM public.infractions
    WHERE ST_DWithin(location, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography, p_radius_meters)
    AND (v_jurisdiction IS NULL OR municipio_nombre = v_jurisdiction OR provincia_nombre = v_jurisdiction)
    GROUP BY ST_SnapToGrid(location::geometry, p_grid_size)
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY INVOKER;

-- Analítica avanzada
CREATE OR REPLACE FUNCTION public.get_infraction_stats(p_days_ago int DEFAULT 30)
RETURNS jsonb AS $$
DECLARE
  v_jurisdiction text;
BEGIN
  v_jurisdiction := public.get_auth_user_jurisdiction();

  RETURN (
    SELECT jsonb_build_object(
      'trends', (
        SELECT COALESCE(jsonb_agg(d), '[]'::jsonb) FROM (
          SELECT date_trunc('day', created_at)::date as date, type, count(*) as count
          FROM public.infractions
          WHERE created_at > (now() - (p_days_ago || ' days')::interval)
          AND (v_jurisdiction IS NULL OR municipio_nombre = v_jurisdiction OR provincia_nombre = v_jurisdiction)
          GROUP BY 1, 2
          ORDER BY 1 ASC
        ) d
      ),
      'status_dist', (
        SELECT COALESCE(jsonb_agg(s), '[]'::jsonb) FROM (
          SELECT status, count(*) as count
          FROM public.infractions
          WHERE (v_jurisdiction IS NULL OR municipio_nombre = v_jurisdiction OR provincia_nombre = v_jurisdiction)
          GROUP BY 1
        ) s
      ),
      'total_count', (SELECT count(*) FROM public.infractions WHERE (v_jurisdiction IS NULL OR municipio_nombre = v_jurisdiction OR provincia_nombre = v_jurisdiction)),
      'pending_count', (SELECT count(*) FROM public.infractions WHERE status = 'pendiente' AND (v_jurisdiction IS NULL OR municipio_nombre = v_jurisdiction OR provincia_nombre = v_jurisdiction)),
      'assigned_jurisdiction', v_jurisdiction
    )
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
