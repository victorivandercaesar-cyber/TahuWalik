-- ============================================
-- SQL Query untuk Tabel 'customers'
-- Jalankan di Supabase SQL Editor
-- ============================================

-- Buat tabel customers untuk fitur Memory Pelanggan
CREATE TABLE IF NOT EXISTS customers (
    id BIGSERIAL PRIMARY KEY,
    whatsapp TEXT UNIQUE NOT NULL,
    nama TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Aktifkan Row Level Security
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Policy: semua bisa SELECT
CREATE POLICY "Allow public read" ON customers
    FOR SELECT USING (true);

-- Policy: semua bisa INSERT
CREATE POLICY "Allow public insert" ON customers
    FOR INSERT WITH CHECK (true);

-- Policy: semua bisa UPDATE
CREATE POLICY "Allow public update" ON customers
    FOR UPDATE USING (true);

-- Index untuk pencarian cepat
CREATE INDEX IF NOT EXISTS idx_customers_whatsapp ON customers(whatsapp);
CREATE INDEX IF NOT EXISTS idx_customers_nama ON customers(nama);
