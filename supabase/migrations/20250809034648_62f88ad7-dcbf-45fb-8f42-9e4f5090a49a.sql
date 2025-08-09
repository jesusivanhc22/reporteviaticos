-- 1) Enum para género de colaboradores
DO $$ BEGIN
  CREATE TYPE public.collaborator_gender AS ENUM ('male', 'female', 'other');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2) Tabla collaborators
CREATE TABLE IF NOT EXISTS public.collaborators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  gender public.collaborator_gender NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Trigger de updated_at
DO $$ BEGIN
  CREATE TRIGGER update_collaborators_updated_at
  BEFORE UPDATE ON public.collaborators
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- RLS
ALTER TABLE public.collaborators ENABLE ROW LEVEL SECURITY;

-- Admins pueden gestionar todo
DO $$ BEGIN
  CREATE POLICY "Admins can manage collaborators"
  ON public.collaborators
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Usuarios autenticados pueden ver solo activos
DO $$ BEGIN
  CREATE POLICY "Everyone can view active collaborators"
  ON public.collaborators
  FOR SELECT
  TO authenticated
  USING (is_active = true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3) Semilla de colaboradores solicitados
INSERT INTO public.collaborators (full_name, gender, is_active)
VALUES
  ('Georgina Janethe de la Rosa Román', 'female', true),
  ('Nora Elissa Barraza Sandoval', 'female', true),
  ('Juan Carlos Muñoz', 'male', true),
  ('Edgar Domínguez', 'male', true),
  ('Luis Freddy Resendez', 'male', true)
ON CONFLICT DO NOTHING;

-- 4) Tabla de relación N..N entre solicitudes y colaboradores
CREATE TABLE IF NOT EXISTS public.travel_request_collaborators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  travel_request_id uuid NOT NULL REFERENCES public.travel_requests(id) ON DELETE CASCADE,
  collaborator_id uuid NOT NULL REFERENCES public.collaborators(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (travel_request_id, collaborator_id)
);

ALTER TABLE public.travel_request_collaborators ENABLE ROW LEVEL SECURITY;

-- Admins gestionan todo
DO $$ BEGIN
  CREATE POLICY "Admins can manage request collaborators"
  ON public.travel_request_collaborators
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Usuarios: ver sus propias relaciones
DO $$ BEGIN
  CREATE POLICY "Users can view collaborators for their requests"
  ON public.travel_request_collaborators
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.travel_requests tr
      WHERE tr.id = travel_request_id AND tr.user_id = auth.uid()
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Usuarios: insertar para sus propias solicitudes, y sólo colaboradores activos
DO $$ BEGIN
  CREATE POLICY "Users can add collaborators to their requests"
  ON public.travel_request_collaborators
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.travel_requests tr
      WHERE tr.id = travel_request_id AND tr.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.collaborators c
      WHERE c.id = collaborator_id AND c.is_active = true
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Usuarios: eliminar de sus propias solicitudes
DO $$ BEGIN
  CREATE POLICY "Users can remove collaborators from their requests"
  ON public.travel_request_collaborators
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.travel_requests tr
      WHERE tr.id = travel_request_id AND tr.user_id = auth.uid()
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 5) Agregar columna number_of_rooms a travel_requests
DO $$ BEGIN
  ALTER TABLE public.travel_requests ADD COLUMN number_of_rooms integer;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;
