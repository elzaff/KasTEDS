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
- `app.js` — navigasi, filter, Supabase Auth, transaksi, budget, dan rekap saldo
- `KASTEDS_DESIGN_SYSTEM.md` — sumber aturan desain
- `supabase/schema.sql` — schema tabel dan RLS untuk Supabase
- `AGENT_API.md` — kontrak API untuk agentic AI dan adapter WhatsApp
- `openapi.json` — spesifikasi yang bisa di-import ke tool agent

## Catatan data

Project dimulai kosong. Masukkan transaksi dan breakdown budget sendiri melalui UI. Transaksi dan budget disimpan di Supabase; kategori bawaan hanya metadata pilihan.

## Mulai September 2026

KasTEDS membuka bulan aktif **September 2026**. Panah di header mengganti bulan aktif; rekap dashboard, transaksi, laporan, dan budget mengikuti bulan tersebut.

1. Login sebagai admin.
2. Buka **Pengaturan**, isi breakdown budget September, lalu pilih **Simpan perubahan**.
3. Pilih **Tambah pemasukan** atau **Tambah pengeluaran**, isi nominal, kategori, tanggal, dan catatan opsional.
4. Pastikan tanggal transaksi berada di bulan aktif. Aplikasi menolak tanggal dari bulan lain agar rekap tidak tercampur.

Jika schema lama sudah pernah dijalankan, jalankan ulang seluruh `supabase/schema.sql` di SQL Editor. Script ini menambahkan kolom bulan pada budget dan membuat budget tiap bulan tersimpan terpisah.

## Login admin

Login admin menggunakan Supabase Auth (email + password) dan tabel `public.profiles` dengan `role = 'ADMIN'`.

Dashboard, transaksi, dan laporan dapat dibaca tanpa login. Login admin hanya diminta saat menambah transaksi atau membuka pengaturan.

## Setup Supabase

1. Buka **SQL Editor**, jalankan isi `supabase/schema.sql` (schema ini memberi akses baca publik dan menulis hanya untuk admin).
2. Buat user admin di **Authentication → Users**.
3. Tambahkan row user tersebut ke `public.profiles` dengan query berikut (ganti emailnya):

   ```sql
   insert into public.profiles (id, display_name, role)
   select id, 'Admin kas', 'ADMIN'
   from auth.users
   where email = 'email-admin-kamu@example.com'
   on conflict (id) do update set role = 'ADMIN';
   ```

4. `Project URL` dan publishable/anon key sudah dipasang di `index.html`; key ini memang aman untuk client selama RLS aktif.

## Deploy

Project ini static dan bisa dideploy langsung ke GitHub Pages, Vercel, atau hosting static lain tanpa build step.

## Agentic AI & WhatsApp

Endpoint server-side `/api/agent` memungkinkan agent membaca rekap dan mencatat transaksi atau budget tanpa membuka service-role key ke browser. Adapter `/api/whatsapp` mendukung WhatsApp Cloud API dan meneruskan pesan ke webhook agent. Lihat [AGENT_API.md](AGENT_API.md) untuk kontrak request, env Vercel, dan langkah koneksi.
