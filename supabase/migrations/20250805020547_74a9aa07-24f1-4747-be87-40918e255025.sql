-- First, add new enum values (these need to be in a separate transaction)
ALTER TYPE expense_category ADD VALUE IF NOT EXISTS 'hospedaje';
ALTER TYPE expense_category ADD VALUE IF NOT EXISTS 'alimentos';
ALTER TYPE expense_category ADD VALUE IF NOT EXISTS 'lavanderia';
ALTER TYPE expense_category ADD VALUE IF NOT EXISTS 'transporte';