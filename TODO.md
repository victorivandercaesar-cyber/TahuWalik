# TODO - Menu Availability Settings

## Task Summary
Create a feature where admin can control which menu options (Tahu Walik/Pangsit Goreng) are available on the ordering page. The setting is stored in Supabase and persists until changed by admin.

---

## Step 1: SQL for Supabase
- [x] Create table `menu_settings` in Supabase

## Step 2: Admin Panel - HTML
- [x] Add menu settings section in admin_new.html

## Step 3: Admin Panel - JavaScript  
- [x] Add functions to fetch/save menu settings in admin_new_final.js

## Step 4: Ordering Page - JavaScript
- [x] Modify script.js to fetch menu settings and control visibility

---

## SQL untuk Supabase (Jalankan di SQL Editor Supabase)

```sql
-- Tabel untuk menyimpan pengaturan menu
CREATE TABLE menu_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enable_tahu_walik BOOLEAN DEFAULT true,
    enable_pangsit_goreng BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default settings (semua menu aktif)
INSERT INTO menu_settings (enable_tahu_walik, enable_pangsit_goreng) VALUES (true, true);
```

## Cara Penggunaan
1. Jalankan SQL di atas di Supabase SQL Editor
2. Buka halaman admin (admin_new.html)
3. Di bagian "Pengaturan Menu", admin dapat mengaktifkan/mematikan menu Tahu Walik dan Pangsit Goreng
4. Pengaturan akan tersimpan di database dan berlaku di halaman pemesanan

## Notes
- ✅ Semua step telah selesai diimplementasikan

