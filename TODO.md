# TODO - Supabase Integration

## Task: Setiap pelanggan pesan, data masuk ke tabel orders di Supabase dan muncul di halaman admin

### Steps:

- [x] 1. Update script.js - Perbaiki handleFormSubmit agar data pesanan masuk ke Supabase
- [x] 2. Update feedback.js - Kritik/saran masuk ke Supabase dengan visibility (public/private)
- [x] 3. Verifikasi feedback.html - Sudah ada opsi visibility (public/private)
- [x] 4. Verifikasi admin_new.js - Sudah ada filter untuk public/private feedback

---

## Progress Log:

### Step 1: Update script.js
**Status:** COMPLETED ✅  
**Action:** Modified handleFormSubmit to:
- Try to insert to Supabase FIRST
- If Supabase succeeds, also save to localStorage as backup
- If Supabase fails, use localStorage as fallback

### Step 2: Update feedback.js
**Status:** COMPLETED ✅  
**Action:** Modified handleFeedbackSubmit to:
- Get visibility value (public/private) from form
- Insert to Supabase FIRST with visibility field
- If Supabase succeeds, save to localStorage as backup
- If Supabase fails, use localStorage as fallback

### Step 3: Verify feedback.html
**Status:** COMPLETED ✅  
**Action:** Already has visibility radio buttons:
- Public (🌐) - default checked
- Private (🔒)

### Step 4: Verify admin_new.js
**Status:** COMPLETED ✅  
**Action:** Already has functions:
- isPrivateFeedback(feedback) - returns true if visibility === 'private'
- isPublicFeedback(feedback) - returns true if visibility === 'public' or no visibility field
- fetchFeedback() - filters public feedback only
- fetchMailbox() - filters private feedback only

---

## Catatan Penting - Supabase:

Jika data tidak masuk ke Supabase, kemungkinan penyebabnya:
1. **Tabel belum dibuat** - Buat tabel di Supabase Dashboard:
   - Tabel `orders` dengan kolom: customer_id, nama, whatsapp, menu, jumlah, harga, cabe, detail, status, created_at
   - Tabel `feedback` dengan kolom: rating, pesan, nama, whatsapp, jenis, visibility, created_at
2. **RLS memblokir insert** - Nonaktifkan RLS atau buat policy untuk anonymous users

Buka console browser (F12) untuk melihat debug log.
