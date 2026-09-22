# SLICE-D
Sistem Layanan Informasi Cerdas Denpasar

Aplikasi rekonsiliasi belanja untuk Pemerintah Kota Denpasar (36 OPD).
Dibangun baru dari nol (Next.js + TypeScript + Supabase). Repo lama
(`SLICE-D-main`, static HTML/GAS) dan `index_rekonsiliasi_belanja_opd_v3.html`
hanya dipakai sebagai referensi desain, workflow, field, dan business logic —
tidak ada kode lama yang di-reuse langsung.

## Stack
- Next.js (App Router) + TypeScript + Tailwind CSS — frontend & backend (Route Handlers / Server Actions)
- Supabase PostgreSQL — source of truth data, Auth, Row Level Security
- Google Drive + Google Apps Script — storage dokumen (BAR PDF), bukan database
- Vercel — hosting
- GitHub — source code

## Prinsip Arsitektur UI (standing rule — berlaku untuk semua phase berikutnya)

UI modular, terpisah total dari authentication/authorization/database/business logic/
calculation/API/Supabase. Semua styling terpusat lewat:

- `app/globals.css` — satu-satunya sumber design tokens (warna, shadow, radius)
- `components/ui/` — primitives murni presentasional (`Button`, `Input`, `Select`, `Card`,
  `Badge`, `Table`, `Modal`, `Drawer`) — tidak tahu apa-apa soal Supabase/auth/business logic
- `components/layout/` — shell layout generik (`Sidebar`, `Topbar`, `PageHeader`) — menerima
  item/slot sebagai props, tidak hardcode menu atau role
- `components/auth/`, `components/dashboard/`, `components/rekonsiliasi/`, dst. — komponen
  spesifik domain yang **menggabungkan** primitives `ui/` dengan data/logic dari `lib/`,
  tapi tidak pernah menaruh warna/style baru di luar token yang ada

Konsekuensi: redesain visual total nanti = edit `app/globals.css` + `components/ui/` saja,
tanpa menyentuh `lib/supabase`, `lib/permissions`, `lib/excel`, RLS, atau schema database.

## Status: PHASE 1 — Project Foundation ✅

Yang sudah ada di phase ini:
- Struktur folder (`app/`, `components/`, `lib/`, `supabase/`, `types/`, `scripts/`, `apps-script/`)
- Dependency inti: `@supabase/supabase-js`, `@supabase/ssr`, `xlsx`, `zod`
- Supabase client util: `lib/supabase/client.ts` (browser), `server.ts` (Server Components/Actions,
  tunduk RLS), `admin.ts` (service-role, bypass RLS — hanya untuk operasi admin yang sudah diverifikasi
  lewat `lib/permissions`)
- `middleware.ts` — refresh session + proteksi route kasar (`/admin/*`, `/opd/*`); RLS di Postgres
  tetap jadi lapisan keamanan sesungguhnya
- `lib/permissions` — helper `requireAdmin()` / `requireOpd()` untuk Server Actions/Route Handlers
- Design tokens (`app/globals.css`) — palet navy/gold/cream diwarisi dari sistem lama, gaya formal
  pemerintahan (lihat spec §35), plus token shadow/radius terpusat
- **Design system komponen** (`components/ui/`): `Button`, `Input`, `Select`, `Card`, `Badge`,
  `Table` (+ `TableRoot`/`THead`/`TBody`/`TR`/`TH`/`TD`), `Modal`, `Drawer` — semua presentasional
  murni, tidak menyentuh Supabase/auth/business logic
- **Layout shells** (`components/layout/`): `Sidebar`, `Topbar`, `PageHeader` — generik, menu/role
  ditentukan pemanggil (route layout Phase 5/7), bukan hardcode di sini
- `components/auth/LoginForm.tsx` — dibangun dari primitives di atas (bukan HTML mentah)
- Halaman `/` — shell UI login (username, password, tahun anggaran). **Belum terhubung ke Supabase
  Auth** — itu bagian PHASE 3, setelah tabel `profiles` & `fiscal_years` ada di PHASE 2.
- `types/database.ts` — placeholder minimal; akan digenerate ulang dari schema asli setelah migrasi
  Phase 2 dijalankan (`npx supabase gen types typescript`)

### Belum ada di phase ini (menyusul di phase berikutnya)
- Skema database, migrasi, RLS policy (PHASE 2)
- Login benar-benar berfungsi (PHASE 3)
- Dashboard, form rekonsiliasi, cek selisih, dst.

## Menjalankan secara lokal

```bash
npm install
cp .env.example .env.local   # isi dengan kredensial Supabase project Anda
npm run dev
```

Buka http://localhost:3000 — akan menampilkan halaman login (belum fungsional
sampai PHASE 3).

## Verifikasi Phase 1

```bash
npm run build   # harus sukses tanpa error TypeScript/ESLint
```

## Data yang belum tersedia (jangan dikarang — lihat spec §43)
- 36 nama & kode OPD resmi
- Username/password user OPD
- NIP, nama pejabat, nama petugas rekon
- Template data ini akan disiapkan di PHASE 4 (Data Master) melalui sistem seed/import,
  bukan hardcode.
