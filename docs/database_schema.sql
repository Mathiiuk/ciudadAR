-- =================================================================================
-- ESQUEMA CONSOLIDADO CIUDAD-AR (PRODUCCIÓN - VERSIÓN FINAL ROBUSTA)
-- =================================================================================

-- 1. EXTENSIONES
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. ENUMS
DO $$ BEGIN
    CREATE TYPE public.infraction_status AS ENUM ('pendiente', 'en_revision', 'aprobada', 'rechazada');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. TABLAS NUCLEO (Usando IF NOT EXISTS para no romper si ya existen)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username text UNIQUE NOT NULL,
  full_name text,
  avatar_url text,
  role text DEFAULT 'ciudadano'::text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.infraction_types (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text UNIQUE NOT NULL,
  description text,
  severity_level integer DEFAULT 1,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.infractions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  location geography(POINT, 4326) NOT NULL,
  image_url text NOT NULL,
  ocr_data jsonb,
  status public.infraction_status DEFAULT 'pendiente'::public.infraction_status NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.high_priority_zones (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  center_location geography(POINT, 4326) NOT NULL,
  infraction_count int NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. GARANTÍA DE COLUMNAS (Para arreglar tablas que ya existían pero estaban incompletas)
ALTER TABLE public.infractions ADD COLUMN IF NOT EXISTS type text;
ALTER TABLE public.infractions ADD COLUMN IF NOT EXISTS description text;

-- 5. FUNCIONES Y TRIGGERS (Re-creables)
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.check_high_priority_zone()
RETURNS TRIGGER AS $$
DECLARE
  recent_count INT;
BEGIN
  SELECT count(*) INTO recent_count FROM public.infractions
  WHERE created_at > (now() - interval '1 hour')
    AND ST_DWithin(location, NEW.location, 100);

  IF recent_count >= 5 THEN
    INSERT INTO public.high_priority_zones(center_location, infraction_count)
    VALUES (NEW.location, recent_count);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Instancia de triggers con limpieza previa
DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_infractions_updated_at ON public.infractions;
CREATE TRIGGER set_infractions_updated_at BEFORE UPDATE ON public.infractions FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_high_priority ON public.infractions;
CREATE TRIGGER trigger_high_priority AFTER INSERT ON public.infractions FOR EACH ROW EXECUTE FUNCTION check_high_priority_zone();

-- 6. FUNCIONES RPC (PARA EL FRONTEND)
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
            'created_at', created_at
          )
        )
      ), '[]'::jsonb)
    )
    FROM public.infractions
    WHERE ST_DWithin(location, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography, p_radius_meters)
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY INVOKER;

-- 7. SEGURIDAD RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.infractions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.high_priority_zones ENABLE ROW LEVEL SECURITY;

-- Limpieza de políticas existentes para evitar errores de duplicados
DROP POLICY IF EXISTS "Perfil publico" ON public.profiles;
DROP POLICY IF EXISTS "Auto-insercion perfil" ON public.profiles;
DROP POLICY IF EXISTS "ciudadano_inserta" ON public.infractions;
DROP POLICY IF EXISTS "oficial_gestiona" ON public.infractions;
DROP POLICY IF EXISTS "lectura_inteligente" ON public.infractions;
DROP POLICY IF EXISTS "Zonas publicas" ON public.high_priority_zones;

CREATE POLICY "Perfil publico" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Auto-insercion perfil" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "ciudadano_inserta" ON public.infractions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "oficial_gestiona" ON public.infractions FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'oficial')
);
CREATE POLICY "lectura_inteligente" ON public.infractions FOR SELECT USING (
    auth.uid() = user_id OR status = 'aprobada' OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'oficial')
);
CREATE POLICY "Zonas publicas" ON public.high_priority_zones FOR SELECT USING (true);
