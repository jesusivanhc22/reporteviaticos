-- Create table for Mexican states with zone mapping
CREATE TABLE public.mexican_states (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  zone_type TEXT NOT NULL CHECK (zone_type IN ('A', 'B')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mexican_states ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to view states
CREATE POLICY "Authenticated users can view mexican states" 
ON public.mexican_states 
FOR SELECT 
USING (true);

-- Insert Mexican states with their zone classifications
INSERT INTO public.mexican_states (name, zone_type) VALUES
('Aguascalientes', 'B'),
('Baja California', 'B'),
('Baja California Sur', 'B'),
('Campeche', 'B'),
('Chiapas', 'B'),
('Chihuahua', 'B'),
('Ciudad de México', 'A'),
('Coahuila', 'B'),
('Colima', 'B'),
('Durango', 'B'),
('Estado de México', 'A'),
('Guanajuato', 'B'),
('Guerrero', 'B'),
('Hidalgo', 'B'),
('Jalisco', 'A'),
('Michoacán', 'B'),
('Morelos', 'B'),
('Nayarit', 'B'),
('Nuevo León', 'A'),
('Oaxaca', 'B'),
('Puebla', 'B'),
('Querétaro', 'B'),
('Quintana Roo', 'B'),
('San Luis Potosí', 'B'),
('Sinaloa', 'B'),
('Sonora', 'B'),
('Tabasco', 'B'),
('Tamaulipas', 'B'),
('Tlaxcala', 'B'),
('Veracruz', 'B'),
('Yucatán', 'B'),
('Zacatecas', 'B');