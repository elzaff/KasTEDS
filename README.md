# KasTEDS

KasTEDS adalah dashboard kas komunal yang ringan dan mobile-first. Fokusnya hanya pada saldo, pemasukan, pengeluaran, transaksi, laporan, dan budget operasional—tanpa data penghuni atau data contoh.

## Jalankan lokal

Buka `index.html` langsung di browser, atau jalankan server statis:

```bash
python -m http.server 3000
```

Lalu buka <http://localhost:3000>.

## Struktur

- `index.html` — halaman dan komponen UI
- `styles.css` — design tokens, layout responsive, dan komponen
- `app.js` — navigasi, filter, modal transaksi, dan rekap saldo
- `KASTEDS_DESIGN_SYSTEM.md` — sumber aturan desain
- `supabase/schema.sql` — schema tabel dan RLS untuk Supabase

## Catatan data

Project dimulai kosong. Masukkan transaksi dan breakdown budget sendiri melalui UI. Data saat ini bersifat in-memory dan akan reset ketika halaman direfresh.

## Login admin

Login diverifikasi server-side melalui `api/login.js`. Atur dua environment variable di Vercel:

- `ADMIN_EMAIL`
- `ADMIN_PASSWORD` (simpan sebagai sensitive production secret)

Tanpa `ADMIN_PASSWORD`, semua percobaan login akan ditolak.

Dashboard, transaksi, dan laporan dapat dibaca tanpa login. Login admin hanya diminta saat menambah transaksi atau membuka pengaturan.

## Setup Supabase

1. Buat project baru di Supabase.
2. Buka **SQL Editor**, jalankan isi `supabase/schema.sql`.
3. Buat user admin di **Authentication → Users**.
4. Tambahkan row user tersebut ke `public.profiles` dengan `role = 'ADMIN'`.
5. Simpan `Project URL` dan `anon key` sebagai environment variable saat frontend mulai dihubungkan ke database.

## Deploy

Project ini static dan bisa dideploy langsung ke GitHub Pages, Vercel, atau hosting static lain tanpa build step.
