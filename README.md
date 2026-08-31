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

## Catatan data

Project dimulai kosong. Masukkan transaksi dan breakdown budget sendiri melalui UI. Data saat ini bersifat in-memory dan akan reset ketika halaman direfresh.

## Login admin demo

- Email: `admin@kasteds.local`
- Password: `kasteds123`

Login ini adalah gate client-side untuk prototype static. Untuk production, pindahkan autentikasi ke Supabase Auth atau backend server-side sebelum menyimpan data sensitif.

## Deploy

Project ini static dan bisa dideploy langsung ke GitHub Pages, Vercel, atau hosting static lain tanpa build step.
