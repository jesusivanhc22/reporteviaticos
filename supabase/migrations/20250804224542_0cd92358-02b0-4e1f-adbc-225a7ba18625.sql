-- Create enum for travel request status
CREATE TYPE public.travel_request_status AS ENUM ('draft', 'pending', 'approved', 'rejected', 'completed');

-- Create enum for expense categories
CREATE TYPE public.expense_category AS ENUM ('accommodation', 'transportation', 'meals', 'other');

-- Create travel_requests table
CREATE TABLE public.travel_requests (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    destination TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    estimated_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    status travel_request_status NOT NULL DEFAULT 'draft',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create travel_expenses table
CREATE TABLE public.travel_expenses (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    travel_request_id UUID NOT NULL REFERENCES public.travel_requests(id) ON DELETE CASCADE,
    category expense_category NOT NULL,
    description TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    expense_date DATE NOT NULL,
    receipt_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.travel_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.travel_expenses ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for travel_requests
CREATE POLICY "Users can view their own travel requests" 
ON public.travel_requests 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own travel requests" 
ON public.travel_requests 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own travel requests" 
ON public.travel_requests 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own travel requests" 
ON public.travel_requests 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create RLS policies for travel_expenses
CREATE POLICY "Users can view expenses for their travel requests" 
ON public.travel_expenses 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.travel_requests 
        WHERE id = travel_request_id AND user_id = auth.uid()
    )
);

CREATE POLICY "Users can create expenses for their travel requests" 
ON public.travel_expenses 
FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.travel_requests 
        WHERE id = travel_request_id AND user_id = auth.uid()
    )
);

CREATE POLICY "Users can update expenses for their travel requests" 
ON public.travel_expenses 
FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM public.travel_requests 
        WHERE id = travel_request_id AND user_id = auth.uid()
    )
);

CREATE POLICY "Users can delete expenses for their travel requests" 
ON public.travel_expenses 
FOR DELETE 
USING (
    EXISTS (
        SELECT 1 FROM public.travel_requests 
        WHERE id = travel_request_id AND user_id = auth.uid()
    )
);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_travel_requests_updated_at
    BEFORE UPDATE ON public.travel_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_travel_requests_user_id ON public.travel_requests(user_id);
CREATE INDEX idx_travel_requests_status ON public.travel_requests(status);
CREATE INDEX idx_travel_expenses_travel_request_id ON public.travel_expenses(travel_request_id);