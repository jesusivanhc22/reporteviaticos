-- Create zones table
CREATE TABLE public.zones (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on zones table
ALTER TABLE public.zones ENABLE ROW LEVEL SECURITY;

-- Create policy for zones (readable by all authenticated users)
CREATE POLICY "Authenticated users can view zones" 
ON public.zones 
FOR SELECT 
TO authenticated
USING (true);

-- Create zone_expense_limits table
CREATE TABLE public.zone_expense_limits (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  zone_id uuid NOT NULL REFERENCES public.zones(id) ON DELETE CASCADE,
  category expense_category NOT NULL,
  max_amount numeric NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(zone_id, category)
);

-- Enable RLS on zone_expense_limits table
ALTER TABLE public.zone_expense_limits ENABLE ROW LEVEL SECURITY;

-- Create policy for zone_expense_limits (readable by all authenticated users)
CREATE POLICY "Authenticated users can view zone expense limits" 
ON public.zone_expense_limits 
FOR SELECT 
TO authenticated
USING (true);

-- Add zone_id column to travel_requests table
ALTER TABLE public.travel_requests 
ADD COLUMN zone_id uuid REFERENCES public.zones(id);

-- Insert initial zones data
INSERT INTO public.zones (name, description) VALUES 
('Zona A', 'Zona con límites de gastos más altos'),
('Zona B', 'Zona con límites de gastos estándar');

-- Insert zone expense limits for Zone A
INSERT INTO public.zone_expense_limits (zone_id, category, max_amount)
SELECT 
  (SELECT id FROM public.zones WHERE name = 'Zona A'),
  category,
  amount
FROM (VALUES 
  ('hospedaje'::expense_category, 1750),
  ('alimentos'::expense_category, 650),
  ('lavanderia'::expense_category, 350),
  ('transporte'::expense_category, 470)
) AS limits(category, amount);

-- Insert zone expense limits for Zone B
INSERT INTO public.zone_expense_limits (zone_id, category, max_amount)
SELECT 
  (SELECT id FROM public.zones WHERE name = 'Zona B'),
  category,
  amount
FROM (VALUES 
  ('hospedaje'::expense_category, 1520),
  ('alimentos'::expense_category, 590),
  ('lavanderia'::expense_category, 350),
  ('transporte'::expense_category, 300)
) AS limits(category, amount);