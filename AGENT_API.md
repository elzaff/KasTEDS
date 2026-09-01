# KasTEDS Agent API

API ini membuat agentic AI dapat membaca rekap dan mengisi data KasTEDS. Endpoint berjalan sebagai Vercel Serverless Function dan hanya menerima API key server-to-server.

Base URL production:

```text
https://kasteds.vercel.app/api/agent
```

OpenAPI untuk import ke tool agent: `https://kasteds.vercel.app/openapi.json`.

## Vercel environment variables

Tambahkan di **Vercel → Project → Settings → Environment Variables**. Jangan masukkan service-role key ke `index.html` atau chat.

```text
SUPABASE_URL=https://project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
KASTEDS_AGENT_API_KEY=...
KASTEDS_AGENT_ACTOR_ID=uuid-profile-admin (opsional)
KASTEDS_TIMEZONE=Asia/Jakarta
```

Jalankan ulang `supabase/schema.sql` di Supabase SQL Editor sebelum memakai budget per bulan dan idempotensi pesan.

## Read

Semua request memakai header berikut:

```http
Authorization: Bearer KASTEDS_AGENT_API_KEY
```

```text
GET /api/agent?view=summary&month=2026-09
GET /api/agent?view=transactions&month=2026-09&type=EXPENSE&limit=20
GET /api/agent?view=budget&month=2026-09
```

`summary` mengembalikan saldo bulan aktif, total pemasukan, total pengeluaran, transaksi terbaru, dan budget. `transactions` mendukung `type`, `q`, dan `limit`.

## Write

Tambah transaksi:

```bash
curl -X POST https://kasteds.vercel.app/api/agent \
  -H "Authorization: Bearer KASTEDS_AGENT_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: wa-message-123" \
  -d '{
    "action": "add_transaction",
    "month": "2026-09",
    "type": "INCOME",
    "amount": 370000,
    "title": "Iuran September",
    "category": "Iuran Bulanan",
    "date": "2026-09-03",
    "description": "Transfer iuran"
  }'
```

`type` hanya `INCOME` atau `EXPENSE`. Nominal selalu positif. Tanggal harus berada pada bulan yang dikirim. Kategori harus aktif di tabel `categories`.

Simpan budget:

```json
{
  "action": "set_budget",
  "month": "2026-09",
  "items": [
    { "name": "Listrik", "amount": 200000 },
    { "name": "WiFi", "amount": 66000 },
    { "name": "Iuran", "amount": 30000 },
    { "name": "Air PDAM", "amount": 15000 },
    { "name": "Kas & kebutuhan lain", "amount": 59000 }
  ]
}
```

## WhatsApp Cloud API adapter

Webhook Meta:

```text
https://kasteds.vercel.app/api/whatsapp
```

Tambahkan env berikut:

```text
WHATSAPP_VERIFY_TOKEN=...
WHATSAPP_ACCESS_TOKEN=...
WHATSAPP_PHONE_NUMBER_ID=...
META_APP_SECRET=...
WHATSAPP_ALLOWED_NUMBERS=628xxxxxxxxxx
KASTEDS_AGENT_WEBHOOK_URL=https://agent-kamu.example/webhooks/kasteds
KASTEDS_AGENT_WEBHOOK_SECRET=...
```

`META_APP_SECRET` dan `WHATSAPP_ALLOWED_NUMBERS` wajib sebelum pesan diteruskan; ini mencegah webhook palsu atau nomor asing memakai bot.

Adapter meneruskan pesan teks ke `KASTEDS_AGENT_WEBHOOK_URL`:

```json
{
  "provider": "whatsapp_cloud_api",
  "from": "628xxxxxxxxxx",
  "message_id": "wamid...",
  "idempotency_key": "wamid...",
  "text": "catat pengeluaran listrik 200000 tanggal 2026-09-04",
  "received_at": "2026-09-01T10:00:00.000Z"
}
```

Agent membalas:

```json
{ "reply": "Pengeluaran listrik Rp200.000 berhasil dicatat untuk September 2026." }
```

Adapter mengirim `reply` kembali ke WhatsApp. Agent tetap bertugas memahami bahasa natural dan memanggil `/api/agent` dengan API key.

## Health check

```text
GET https://kasteds.vercel.app/api/health
```

Status `200` berarti env dasar sudah terpasang; `503` berarti env belum lengkap.
