# Kontrakan Cash Tracker — Design System & Product UI Specification

> Source of truth untuk implementasi UI/UX aplikasi pencatatan uang kas kontrakan.
> Target deployment: Vercel.
> Primary platform: responsive web app.
> Design direction: playful, friendly, colorful, rounded, flat-illustration inspired — mengambil nuansa visual modern seperti Duolingo dan Kurzgesagt, tetapi **bukan** gamified app dan **bukan** meniru identitas visual mereka secara langsung.

---

# 1. Product Overview

Aplikasi ini digunakan untuk mencatat dan memantau keuangan kontrakan.

Fungsi utama:

- melihat saldo kas saat ini;
- melihat pemasukan dan pengeluaran;
- melihat histori transaksi;
- melihat tagihan bulanan tiap penghuni;
- melihat siapa yang sudah dan belum membayar;
- mencatat transaksi pemasukan;
- mencatat transaksi pengeluaran;
- mengelola status pembayaran;
- mengelola anggota kontrakan;
- menampilkan laporan keuangan sederhana.

Aplikasi **tidak menggunakan gamification**.

Tidak ada:

- XP;
- leaderboard;
- streak;
- badge;
- achievement;
- level;
- progress challenge;
- minimum saldo kas;
- target saldo kas.

Fokus aplikasi adalah:

> **Simple, transparent household finance tracking.**

---

# 2. Monthly Contribution

Nominal standar per penghuni:

## Rp370.000 / orang / bulan

Breakdown default:

| Category | Amount |
| --- | ---: |
| Listrik | Rp200.000 |
| WiFi | Rp66.000 |
| Iuran | Rp30.000 |
| Air PDAM | Rp15.000 |
| Kas / kebutuhan lain | Rp59.000 |
| **Total** | **Rp370.000** |

Nominal ini harus dapat diedit oleh admin melalui Settings.

Jangan membuat visual berupa target/minimum threshold saldo.

---

# 3. User Roles

Gunakan dua role utama:

```ts
type UserRole = "ADMIN" | "MEMBER";
```

## MEMBER

Boleh:

- melihat dashboard;
- melihat saldo;
- melihat transaksi;
- melihat detail transaksi;
- melihat status pembayaran anggota;
- melihat laporan;
- melihat profil anggota.

Tidak boleh:

- menambah transaksi;
- mengedit transaksi;
- menghapus transaksi;
- mengubah pembayaran;
- mengubah anggota;
- mengubah konfigurasi.

## ADMIN

Memiliki seluruh hak MEMBER ditambah:

- tambah transaksi;
- edit transaksi;
- hapus transaksi;
- mark payment as paid;
- mark payment as unpaid;
- mengelola anggota;
- mengubah nominal iuran;
- mengelola kategori transaksi.

Authorization harus divalidasi di server.

Jangan hanya menyembunyikan tombol admin di frontend.

---

# 4. Design Principles

UI harus terasa:

- friendly;
- clean;
- playful;
- modern;
- approachable;
- lightweight;
- transparent;
- easy to scan.

Tetapi jangan terasa:

- childish;
- seperti game;
- seperti dashboard enterprise;
- seperti aplikasi bank;
- terlalu banyak grafik;
- terlalu padat;
- terlalu formal.

Prioritas visual:

1. Saldo
2. Tagihan bulan berjalan
3. Status pembayaran anggota
4. Pemasukan dan pengeluaran bulan berjalan
5. Transaksi terbaru
6. Breakdown pengeluaran

---

# 5. Visual Direction

Gunakan:

- rounded cards;
- large corner radius;
- chunky but clean buttons;
- flat icons;
- friendly empty states;
- expressive but simple illustrations;
- bold heading;
- soft background;
- colorful category accents;
- generous whitespace.

Ilustrasi harus berupa:

- flat vector;
- simple geometric forms;
- minimal detail;
- no photorealism;
- no gradients berlebihan;
- no 3D glossy fintech style.

Contoh objek ilustrasi:

- rumah;
- dompet;
- koin;
- lampu;
- router;
- keran air;
- sapu;
- toolbox;
- receipt.

Gunakan ilustrasi hanya sebagai pendukung.

Data keuangan tetap harus menjadi fokus utama.

---

# 6. Color System

## Core Colors

```css
--navy-900: #171A3D;
--navy-800: #202550;

--purple-600: #6C63FF;
--purple-500: #8178FF;

--blue-500: #4AB7FF;
--blue-100: #EAF7FF;

--yellow-500: #FFD65A;
--yellow-100: #FFF7D6;

--coral-500: #FF6B6B;
--coral-100: #FFE8E8;

--mint-500: #55D6A9;
--mint-100: #E5FAF3;

--orange-500: #FF9F43;
--orange-100: #FFF0DE;
```

## Neutral Colors

```css
--background: #F7F7F2;
--surface: #FFFFFF;

--text-primary: #171A2C;
--text-secondary: #696B7A;
--text-muted: #999BA7;

--border: #E8E8E2;
--border-strong: #DADAD3;
```

## Semantic Colors

### Income

```css
--income: #38B987;
--income-bg: #E7F8F1;
```

### Expense

```css
--expense: #EF6464;
--expense-bg: #FDEAEA;
```

### Paid

```css
--paid: #38B987;
--paid-bg: #E7F8F1;
```

### Unpaid

```css
--unpaid: #F3A83B;
--unpaid-bg: #FFF4DE;
```

### Destructive

```css
--danger: #E64D4D;
--danger-hover: #D64242;
```

---

# 7. Color Usage Rules

Jangan menggunakan semua warna sekaligus.

Aturan:

- Navy = navigation / strong contrast.
- Purple = primary action.
- Green = pemasukan / paid.
- Coral/red = pengeluaran / destructive.
- Blue = informasi.
- Yellow/orange = unpaid / warning.
- Background utama = warm off-white.

Jangan gunakan red hanya sebagai decorative accent.

Red harus memiliki arti:

- expense;
- delete;
- error;
- destructive action.

---

# 8. Typography

Recommended font:

```txt
Geist
```

Fallback:

```css
font-family:
  Geist,
  Inter,
  ui-sans-serif,
  system-ui,
  sans-serif;
```

## Typography Scale

### Display

```css
font-size: 40px;
line-height: 48px;
font-weight: 700;
```

Digunakan untuk:

- current balance.

### Heading 1

```css
font-size: 30px;
line-height: 38px;
font-weight: 700;
```

### Heading 2

```css
font-size: 24px;
line-height: 32px;
font-weight: 700;
```

### Heading 3

```css
font-size: 18px;
line-height: 26px;
font-weight: 650;
```

### Body

```css
font-size: 15px;
line-height: 24px;
font-weight: 400;
```

### Small

```css
font-size: 13px;
line-height: 20px;
font-weight: 500;
```

### Label

```css
font-size: 12px;
line-height: 16px;
font-weight: 600;
text-transform: none;
```

Hindari penggunaan ALL CAPS kecuali label kecil tertentu.

---

# 9. Currency Formatting

Gunakan format Indonesia.

Contoh:

```txt
Rp370.000
Rp1.850.000
Rp66.000
```

Jangan:

```txt
Rp 370,000
IDR 370000
370K
```

Pada angka besar dashboard:

```txt
Rp 1.850.000
```

boleh menggunakan spasi setelah `Rp`.

Pada list:

```txt
+Rp370.000
-Rp200.000
```

---

# 10. Spacing System

Gunakan 4px base grid.

```txt
4
8
12
16
20
24
32
40
48
64
```

Recommended:

- card padding: 20–24px;
- section gap: 24–32px;
- page horizontal padding desktop: 32px;
- mobile: 16px;
- table/list row: 14–18px vertical.

---

# 11. Border Radius

```css
--radius-sm: 10px;
--radius-md: 14px;
--radius-lg: 20px;
--radius-xl: 24px;
--radius-pill: 999px;
```

Usage:

- buttons: 12–14px;
- cards: 20px;
- modal: 24px;
- badges: pill;
- input: 12px.

---

# 12. Shadows

Gunakan shadow sangat ringan.

```css
--shadow-card:
  0 2px 4px rgba(23, 26, 61, 0.03),
  0 8px 24px rgba(23, 26, 61, 0.05);

--shadow-button:
  0 3px 0 rgba(23, 26, 61, 0.14);
```

Primary button boleh memiliki sedikit downward shadow untuk memberikan visual character.

Jangan gunakan:

- heavy floating shadow;
- glassmorphism;
- neon glow.

---

# 13. Layout

Desktop:

```txt
Sidebar
+
Main Content
```

Sidebar width:

```txt
240px
```

Main max width:

```txt
1440px
```

Main content:

```txt
padding: 32px
```

Desktop grid:

```txt
12 columns
24px gap
```

Tablet:

- collapsible sidebar;
- 2-column cards.

Mobile:

- sidebar berubah menjadi bottom navigation;
- single-column;
- sticky primary action untuk admin jika diperlukan.

---

# 14. Navigation

Desktop sidebar:

```txt
[Logo] KasTEDS

Home
Transactions
Members
Reports

ADMIN ONLY
Settings
```

Icons:

- Home → House
- Transactions → ReceiptText
- Members → Users
- Reports → ChartPie
- Settings → Settings

Gunakan Lucide icons.

Navigation item:

```txt
height: 44px
radius: 12px
```

Active state:

- purple/light purple background;
- dark text;
- icon purple.

---

# 15. Mobile Navigation

Bottom navigation:

```txt
Home
Transactions
Members
Reports
```

Admin action `+` dapat tampil sebagai floating action button.

Settings dapat diakses melalui profile menu.

---

# 16. Core Components

## 16.1 Balance Card

Komponen paling penting.

Isi:

```txt
Saldo saat ini

Rp 1.850.000

Pemasukan bulan ini
+Rp1.480.000

Pengeluaran bulan ini
-Rp630.000
```

Style:

- large card;
- optional flat house/coin illustration;
- navy or white background;
- high text contrast.

Jangan tampilkan:

- target saldo;
- minimum saldo;
- progress target.

---

# 17. Monthly Bill Card

Contoh:

```txt
Tagihan Agustus

Rp370.000 / orang

Listrik       Rp200.000
WiFi           Rp66.000
Iuran          Rp30.000
Air PDAM       Rp15.000
Kas            Rp59.000
```

Admin dapat mengklik:

```txt
Edit breakdown
```

Member hanya read-only.

---

# 18. Payment Summary

Card:

```txt
Pembayaran Agustus

6 dari 8 sudah bayar

6 Paid
2 Belum
```

Progress bar boleh digunakan hanya untuk menunjukkan:

> jumlah anggota yang sudah membayar bulan tersebut.

Ini adalah data visualization, bukan gamification.

---

# 19. Member Payment Card

Desktop:

```txt
┌────────────────────────────┐
│ [Avatar] Fasel             │
│                            │
│ Rp370.000                  │
│                            │
│ [Lunas]                    │
└────────────────────────────┘
```

Unpaid:

```txt
┌────────────────────────────┐
│ [Avatar] Ferel             │
│                            │
│ Rp370.000                  │
│                            │
│ [Belum bayar]              │
│                            │
│ Admin: [Tandai lunas]      │
└────────────────────────────┘
```

---

# 20. Transaction Item

Gunakan list, bukan table berat.

Contoh:

```txt
[icon] WiFi Agustus
       Internet · 29 Aug 2026

                       -Rp264.000
```

Income:

```txt
[coin icon] Kas — Fasel
            Iuran Bulanan · 28 Aug 2026

                       +Rp370.000
```

Transaction item harus memiliki:

- category icon;
- title;
- category;
- date;
- nominal;
- income/expense color.

---

# 21. Transaction Detail

Gunakan drawer pada desktop/mobile.

Fields:

```txt
Title
Amount
Type
Category
Date
Description
Created by
Receipt
Created at
Last updated
```

ADMIN:

```txt
Edit
Delete
```

MEMBER:

read-only.

---

# 22. Add Transaction Flow

ADMIN ONLY.

Gunakan modal atau sheet.

Tidak perlu gamified step-by-step wizard.

Gunakan compact form agar input cepat.

## Fields

```txt
Type
Amount
Category
Member (conditional)
Date
Description
Receipt (optional)
```

### Type

Segmented control:

```txt
[ Pemasukan ] [ Pengeluaran ]
```

### Conditional Member Field

Jika:

```txt
category === MONTHLY_CONTRIBUTION
```

maka tampilkan member selector.

### Submit

Primary:

```txt
Simpan transaksi
```

Secondary:

```txt
Batal
```

---

# 23. Transaction Categories

Default categories:

```ts
const categories = [
  "Iuran Bulanan",
  "Listrik",
  "WiFi",
  "Air PDAM",
  "Kebersihan",
  "Perbaikan",
  "Perlengkapan Rumah",
  "Kas",
  "Lainnya",
];
```

Icon mapping:

```txt
Iuran Bulanan      Coins
Listrik            Zap
WiFi               Wifi
Air PDAM            Droplets
Kebersihan         Sparkles
Perbaikan          Wrench
Perlengkapan Rumah ShoppingBasket
Kas                Wallet
Lainnya            Shapes
```

---

# 24. Dashboard Page

Route:

```txt
/
```

atau:

```txt
/dashboard
```

Recommended hierarchy:

```txt
Greeting / month selector

Balance Card

Monthly summary:
- income
- expenses
- monthly contribution

Payment status

Recent transactions

Expense breakdown
```

Desktop composition:

```txt
┌───────────────────────────────────────────────┐
│ Header                                        │
├───────────────────────┬───────────────────────┤
│ Balance               │ Monthly Bill          │
│                       │                       │
├───────────────────────┼───────────────────────┤
│ Payment Status        │ Monthly Summary       │
├───────────────────────┴───────────────────────┤
│ Recent Transactions                           │
├───────────────────────────────────────────────┤
│ Expense Breakdown                             │
└───────────────────────────────────────────────┘
```

---

# 25. Transactions Page

Route:

```txt
/transactions
```

Header:

```txt
Transactions

[Search] [Month] [Category] [Type]

ADMIN:
[+ Tambah transaksi]
```

List grouping:

```txt
Today

Yesterday

August 2026
```

Filters:

- search;
- month;
- category;
- income/expense;
- member.

---

# 26. Members Page

Route:

```txt
/members
```

Header:

```txt
Penghuni
Agustus 2026
```

Summary:

```txt
8 penghuni

6 sudah bayar
2 belum bayar
```

Grid of member cards.

ADMIN controls:

```txt
Tambah anggota
Tandai lunas
Ubah anggota
Deactivate member
```

Jangan benar-benar delete historical member records.

Use:

```ts
active: boolean
```

---

# 27. Reports Page

Route:

```txt
/reports
```

Gunakan maksimal 3 visualisasi utama.

## Chart 1

Monthly cash flow.

```txt
Income vs Expense
```

Recommended:

bar chart.

## Chart 2

Expense breakdown.

Recommended:

donut chart.

## Chart 3

Balance over time.

Recommended:

line chart.

Tambahkan summary:

```txt
Total pemasukan
Total pengeluaran
Net cash flow
```

Jangan membuat dashboard terlalu chart-heavy.

---

# 28. Settings Page

ADMIN ONLY.

Route:

```txt
/settings
```

Sections:

## Monthly Contribution

```txt
Default contribution
Rp370.000
```

## Breakdown

```txt
Listrik
Rp200.000

WiFi
Rp66.000

Iuran
Rp30.000

Air PDAM
Rp15.000

Kas
Rp59.000
```

Total harus dihitung otomatis.

Validation:

```ts
sum(breakdown) === monthlyContribution
```

## Members

Manage active users.

## Categories

Manage category name + icon.

---

# 29. Authentication

Recommended:

```txt
Google OAuth
```

Gunakan whitelist user.

Contoh schema:

```ts
User {
  id
  name
  email
  avatarUrl
  role
  active
}
```

User hanya dapat masuk jika:

```ts
user.active === true
```

---

# 30. Authorization

Harus dilakukan server-side.

Pseudo logic:

```ts
if (!session.user) {
  throw new UnauthorizedError();
}

if (actionRequiresAdmin && session.user.role !== "ADMIN") {
  throw new ForbiddenError();
}
```

Jangan bergantung pada:

```txt
display: none
```

untuk security.

---

# 31. Data Model

Recommended conceptual schema:

```ts
User {
  id
  name
  email
  avatarUrl?
  role
  active
  createdAt
}

MonthlyBill {
  id
  month
  year
  totalPerMember
  electricity
  wifi
  contribution
  water
  cash
  createdAt
  updatedAt
}

Payment {
  id
  userId
  monthlyBillId
  amount
  status
  paidAt?
  transactionId?
}

Transaction {
  id
  type
  amount
  categoryId
  title
  description?
  transactionDate
  createdBy
  receiptUrl?
  createdAt
  updatedAt
}

Category {
  id
  name
  type?
  icon
  active
}
```

---

# 32. Transaction Types

```ts
type TransactionType =
  | "INCOME"
  | "EXPENSE";
```

Payment status:

```ts
type PaymentStatus =
  | "PAID"
  | "UNPAID"
  | "PARTIAL";
```

---

# 33. Payment Logic

Ketika admin menandai member sebagai paid:

1. update `Payment.status = PAID`;
2. set `paidAt`;
3. create INCOME transaction jika belum ada;
4. link transaction ke payment.

Jika status dibatalkan:

- jangan menghasilkan duplicate transactions;
- rollback atau void transaction yang terkait;
- simpan audit trail bila memungkinkan.

---

# 34. Empty States

Gunakan visual kecil dan friendly.

Contoh transaksi kosong:

```txt
Belum ada transaksi bulan ini.

Transaksi pemasukan dan pengeluaran
akan muncul di sini.
```

ADMIN:

```txt
[Tambah transaksi]
```

MEMBER:

tanpa CTA admin.

---

# 35. Loading States

Gunakan:

- skeleton card;
- skeleton list;
- skeleton chart.

Jangan gunakan spinner besar di tengah halaman kecuali initial auth check.

---

# 36. Error States

Gunakan bahasa sederhana.

Contoh:

```txt
Transaksi gagal disimpan.
Coba lagi sebentar.
```

Jangan tampilkan raw server error ke user.

---

# 37. Confirmation Dialog

Gunakan untuk destructive action.

Contoh:

```txt
Hapus transaksi?

Transaksi "WiFi Agustus" senilai Rp264.000
akan dihapus dari catatan.

[Batal]
[Hapus transaksi]
```

---

# 38. Toasts

Success:

```txt
Transaksi berhasil disimpan.
```

Payment:

```txt
Fasel ditandai sudah membayar.
```

Error:

```txt
Gagal menyimpan perubahan.
```

Toast harus singkat.

---

# 39. Buttons

## Primary

Purple background.

```txt
Simpan
Tambah transaksi
Tandai lunas
```

## Secondary

White surface + border.

```txt
Batal
Filter
Edit
```

## Destructive

Red.

```txt
Hapus
```

Button height:

```txt
40–44px
```

Primary large action:

```txt
48px
```

---

# 40. Inputs

Standard height:

```txt
44px
```

Style:

- white;
- subtle border;
- 12px radius;
- visible focus ring.

Focus:

```css
outline: 3px solid rgba(108, 99, 255, 0.18);
border-color: #6C63FF;
```

---

# 41. Badges

Paid:

```txt
Lunas
```

Green.

Unpaid:

```txt
Belum bayar
```

Orange.

Partial:

```txt
Sebagian
```

Blue.

Income:

```txt
Pemasukan
```

Green.

Expense:

```txt
Pengeluaran
```

Red.

---

# 42. Month Selector

Month navigation harus sederhana.

Desktop:

```txt
‹  August 2026  ›
```

Mobile:

dropdown / sheet.

Default selalu current month.

---

# 43. Iconography

Recommended:

```txt
lucide-react
```

Rules:

- stroke width consistent;
- size 18–22px standard;
- 24px section icon;
- 32–40px empty-state icon.

Jangan mencampur icon libraries.

---

# 44. Illustration Style

Jika membuat custom illustration:

```txt
Flat vector
Simple geometry
Rounded shapes
Bold silhouettes
Minimal shading
Clean outlines or outline-free
2–5 colors per illustration
```

Gunakan ilustrasi untuk:

- login;
- empty states;
- balance card;
- no-data state.

Jangan gunakan ilustrasi sebagai pengganti data.

---

# 45. Responsive Rules

## Desktop ≥ 1024px

- sidebar visible;
- dashboard 2-column;
- transaction details use side drawer.

## Tablet 768–1023px

- sidebar collapsible;
- cards max 2 columns.

## Mobile < 768px

- bottom navigation;
- single-column;
- stacked cards;
- charts full width;
- modal becomes bottom sheet;
- transaction rows remain readable without horizontal scroll.

---

# 46. Accessibility

Minimum requirements:

- WCAG-friendly contrast;
- visible focus states;
- all icon-only buttons have aria-label;
- keyboard navigation;
- status not communicated using color alone;
- form errors include text;
- chart values have textual summaries.

---

# 47. Motion

Keep motion subtle.

Allowed:

```txt
150–220ms
ease-out
```

For:

- button hover;
- drawer;
- modal;
- card hover;
- filter popover.

No:

- bouncing;
- confetti;
- celebration animation;
- game-like effects.

---

# 48. Copywriting Tone

Gunakan Bahasa Indonesia yang ringan dan natural.

Recommended:

```txt
Saldo saat ini
Tagihan bulan ini
Sudah bayar
Belum bayar
Transaksi terbaru
Tambah transaksi
Lihat semua
Pengeluaran
Pemasukan
```

Avoid overly corporate:

```txt
Financial Performance
Asset Management
Budget Utilization
```

Avoid excessive playful copy:

```txt
Dompet kita lagi happy!
Yay, uang masuk!
Kas naik level!
```

---

# 49. Recommended Tech Stack

Frontend:

```txt
Next.js
TypeScript
Tailwind CSS
shadcn/ui
Lucide React
Recharts
```

Backend / data:

```txt
Supabase
PostgreSQL
Supabase Auth
Supabase Storage
```

Deployment:

```txt
Vercel
```

Alternative ORM:

```txt
Drizzle
```

or:

```txt
Prisma
```

---

# 50. Suggested Project Structure

```txt
src/
├── app/
│   ├── (auth)/
│   │   └── login/
│   │
│   ├── (dashboard)/
│   │   ├── page.tsx
│   │   ├── transactions/
│   │   ├── members/
│   │   ├── reports/
│   │   └── settings/
│   │
│   └── api/
│
├── components/
│   ├── ui/
│   ├── dashboard/
│   ├── transactions/
│   ├── members/
│   └── charts/
│
├── lib/
│   ├── auth/
│   ├── db/
│   ├── permissions/
│   ├── formatting/
│   └── validations/
│
├── hooks/
│
├── types/
│
└── styles/
```

---

# 51. Main Dashboard Example

```txt
┌───────────────────────────────────────────────────────────┐
│ KasTEDS                              Agustus 2026    User │
├──────────────┬────────────────────────────────────────────┤
│              │                                            │
│ Home         │ Selamat malam                              │
│ Transactions │ Ringkasan keuangan kontrakan               │
│ Members      │                                            │
│ Reports      │ ┌──────────────────────────────────────┐   │
│              │ │ Saldo saat ini                      │   │
│ Settings*    │ │                                     │   │
│              │ │ Rp 1.850.000                        │   │
│              │ │                                     │   │
│              │ │ +Rp1.480.000   -Rp630.000           │   │
│              │ └──────────────────────────────────────┘   │
│              │                                            │
│              │ ┌────────────────┐ ┌───────────────────┐  │
│              │ │ Tagihan       │ │ Pembayaran        │  │
│              │ │ Rp370.000     │ │ 6 dari 8 lunas    │  │
│              │ │ / orang       │ │                   │  │
│              │ └────────────────┘ └───────────────────┘  │
│              │                                            │
│              │ Transaksi terbaru                          │
│              │                                            │
│              │ ⚡ Listrik        -Rp1.600.000             │
│              │ 🌐 WiFi            -Rp528.000              │
│              │ 💰 Kas — Fasel     +Rp370.000              │
│              │                                            │
│              │                    [Lihat semua]            │
└──────────────┴────────────────────────────────────────────┘
```

`Settings*` hanya ADMIN.

---

# 52. Interaction Rules

## Add Transaction

```txt
Admin clicks "+ Tambah transaksi"
→ modal opens
→ fill fields
→ validate
→ submit
→ optimistic disabled state
→ server action
→ update transaction list
→ update balance
→ success toast
```

## Mark Paid

```txt
Admin clicks "Tandai lunas"
→ confirmation optional
→ create/update payment
→ linked income transaction
→ update payment summary
→ update balance
→ toast
```

---

# 53. Balance Calculation

```ts
balance =
  totalIncome -
  totalExpense;
```

Do not manually store balance unless required for accounting snapshot.

Prefer derived value from transactions.

---

# 54. Financial Integrity Rules

Important:

- transaction amount must be positive;
- transaction type determines sign;
- never store expense as negative amount;
- do not silently delete historical transactions;
- track creator;
- track createdAt;
- track updatedAt;
- use database transaction when payment creates income transaction.

Recommended:

```ts
amount = 200000;
type = "EXPENSE";
```

Not:

```ts
amount = -200000;
```

---

# 55. Receipt Support

Optional upload:

```txt
JPG
PNG
PDF
```

Store receipt in Supabase Storage.

Transaction stores:

```ts
receiptUrl?: string;
```

Receipt button:

```txt
Lihat bukti
```

---

# 56. Search & Filtering

Transactions support:

```txt
Search
Month
Type
Category
Member
```

Default:

```txt
current month
```

URL search params recommended:

```txt
/transactions?month=2026-08&type=expense
```

---

# 57. Reports Calculations

Monthly:

```ts
income = sum(INCOME);
expense = sum(EXPENSE);
net = income - expense;
```

Category breakdown:

```ts
categoryExpense / totalExpense
```

Payment rate:

```ts
paidMembers / activeMembers
```

---

# 58. Do Not Implement

Explicitly avoid:

```txt
XP
streak
leaderboard
badges
achievements
daily challenges
financial score
minimum balance threshold
emergency target meter
cash health score
confetti
competitive member ranking
```

---

# 59. Initial MVP

MVP should contain:

```txt
1. Authentication
2. Dashboard
3. Transactions
4. Members
5. Monthly payments
6. Reports
7. Admin settings
```

Optional after MVP:

```txt
Receipt uploads
CSV export
PDF monthly report
Audit history
Notifications
```

---

# 60. Codex Implementation Instruction

When implementing this project:

1. Treat this file as the design source of truth.
2. Preserve the visual hierarchy and spacing system.
3. Do not introduce gamification.
4. Do not introduce minimum/target balance.
5. Keep financial data visually dominant.
6. Use reusable components.
7. Keep authorization server-side.
8. Use responsive mobile-first behavior.
9. Avoid excessive visual effects.
10. Keep the interface playful through shape, color, typography, iconography, and illustration — not through game mechanics.
11. Default monthly contribution is Rp370.000/person.
12. Default monthly breakdown:
    - Rp200.000 electricity
    - Rp66.000 WiFi
    - Rp30.000 contribution
    - Rp15.000 PDAM water
    - Rp59.000 cash / other needs
13. All financial values must use Indonesian currency formatting.
14. Design desktop and mobile simultaneously.
15. Maintain a consistent component and token system.

---

# Final Product Character

The finished interface should feel like:

> **A friendly illustrated household finance dashboard that makes shared expenses easy to understand.**

It should combine:

- the friendliness of consumer apps;
- colorful flat visual language;
- clear financial hierarchy;
- transparent transaction records;
- simple administration.

The user should understand the financial condition of the house within a few seconds of opening the dashboard.
