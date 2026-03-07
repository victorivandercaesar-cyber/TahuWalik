-- ============================================
-- SUPABASE DATABASE SETUP
-- SQL untuk membuat tabel-tabel yang diperlukan
-- ============================================

-- 1. CREATE TABLE: orders
-- Tabel untuk menyimpan data pesanan pelanggan

CREATE TABLE IF NOT EXISTS public.orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id TEXT,
    nama TEXT NOT NULL,
    whatsapp TEXT NOT NULL,
    menu TEXT NOT NULL,
    jumlah INTEGER NOT NULL,
    harga INTEGER NOT NULL,
    cabe TEXT DEFAULT 'tidak pake cabe',
    detail JSONB,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. CREATE TABLE: feedback
-- Tabel untuk menyimpan kritik dan saran

CREATE TABLE IF NOT EXISTS public.feedback (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    rating INTEGER NOT NULL,
    pesan TEXT NOT NULL,
    nama TEXT,
    whatsapp TEXT,
    jenis TEXT DEFAULT 'lainnya',
    visibility TEXT DEFAULT 'public',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. CREATE TABLE: system_status
-- Tabel untuk menyimpan status pemesanan (open/close)

CREATE TABLE IF NOT EXISTS public.system_status (
    id INTEGER PRIMARY KEY DEFAULT 1,
    order_status TEXT DEFAULT 'open',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default system status
INSERT INTO public.system_status (id, order_status)
VALUES (1, 'open')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on orders table
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Enable RLS on feedback table
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Enable RLS on system_status table
ALTER TABLE public.system_status ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES
-- ============================================

-- Orders: Allow anonymous read (for admin) and insert (for customers)
CREATE POLICY "Allow public read orders" ON public.orders
    FOR SELECT USING (true);

CREATE POLICY "Allow public insert orders" ON public.orders
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update orders" ON public.orders
    FOR UPDATE USING (true);

-- Feedback: Allow anonymous read and insert
CREATE POLICY "Allow public read feedback" ON public.feedback
    FOR SELECT USING (true);

CREATE POLICY "Allow public insert feedback" ON public.feedback
    FOR INSERT WITH CHECK (true);

-- System Status: Allow read and update
CREATE POLICY "Allow public read system_status" ON public.system_status
    FOR SELECT USING (true);

CREATE POLICY "Allow public update system_status" ON public.system_status
    FOR UPDATE USING (true);

-- ============================================
-- INDEXES (Optional - untuk performa)
-- ============================================

CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON public.feedback(created_at DESC);
