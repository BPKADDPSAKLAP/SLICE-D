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

## Status: PHASE 1 — Project Foundation ✅ / PHASE 2 — Supabase Database ✅

### Phase 1 (fondasi proyek)
- Struktur folder (`app/`, `components/`, `lib/`, `supabase/`, `types/`, `scripts/`, `apps-script/`)
- Dependency inti: `@supabase/supabase-js`, `@supabase/ssr`, `xlsx`, `zod`
- Supabase client util: `lib/supabase/client.ts` (browser), `server.ts` (Server Components/Actions,
  tunduk RLS), `admin.ts` (service-role, bypass RLS — hanya untuk operasi admin yang sudah diverifikasi
  lewat `lib/permissions`)
- **Route protection**: `proxy.ts` di root (nama convention Next.js 16 untuk apa yang sebelumnya
  disebut `middleware.ts`) memanggil `lib/supabase/middleware.ts` (`updateSession()`), yang
  me-refresh session Supabase dan melakukan redirect kasar berbasis role. Ini **hanya UX** — RLS
  di Postgres (lihat Phase 2) adalah lapisan keamanan sesungguhnya.
- `lib/permissions` — helper `requireAdmin()` / `requireOpd()` untuk Server Actions/Route Handlers
- Design tokens (`app/globals.css`) + **design system komponen** (`components/ui/`, `components/layout/`)
  — lihat "Prinsip Arsitektur UI" di atas
- `components/auth/LoginForm.tsx` + halaman `/` — shell UI login. **Belum terhubung ke Supabase
  Auth** — itu PHASE 3.

### Phase 2 (database)
- 15 migration SQL versioned di `supabase/migrations/` mencakup 10 tabel (`opd_master`, `profiles`,
  `fiscal_years`, `recon_headers`, `recon_opd_values`, `recon_admin_values`, `attachments`,
  `audit_logs`, `system_settings`, `subunit_mapping`) + 1 view (`recon_summary`)
- RLS aktif di semua tabel, helper `is_admin()` / `get_my_opd_id()`, plus 3 trigger keamanan
  tambahan (`protect_profile_columns`, `enforce_recon_header_edit_rules`,
  `enforce_recon_opd_values_edit_lock`) untuk kasus yang tak bisa ditangani policy baris murni
  (proteksi kolom, edit-lock setelah submit)
- `supabase/seed.sql` — placeholder NON-PRODUKSI (2 contoh OPD, bukan 36 nama resmi)
- `supabase/tests/rls_test_suite.sql` — 13 assertion RLS otomatis, **sudah dijalankan dan lolos**
  terhadap Postgres lokal sungguhan (bukan cuma review sintaks) — lihat bagian testing di bawah
- `types/database.ts` — digenerate dari schema asli (bukan lagi placeholder Phase 1)

### Belum ada di phase ini (menyusul di phase berikutnya)
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

## Verifikasi

```bash
npm run build   # harus sukses tanpa error TypeScript/ESLint
npm run lint
```

## Setup Supabase (Phase 2)

1. **Buat project Supabase** di https://supabase.com/dashboard (atau pakai Supabase CLI /
   self-hosted). Catat Project URL, anon/publishable key, dan service_role/secret key.
2. **Isi environment variables** — salin `.env.example` ke `.env.local` (lokal) dan ke
   pengaturan environment Vercel (produksi):
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — dari dashboard project
   - `SUPABASE_SECRET_KEY` — service_role key. **Jangan pernah** expose ke client / commit ke git
   - `AUTH_INTERNAL_EMAIL_DOMAIN` — domain sintetis untuk email internal (Phase 3)
3. **Jalankan migration** ke project Supabase Anda:
   ```bash
   npx supabase login
   npx supabase link --project-ref <project-ref>
   npx supabase db push   # menjalankan semua file di supabase/migrations/ secara berurutan
   ```
4. **Jalankan seed** (opsional, untuk data contoh non-produksi):
   ```bash
   npx supabase db execute -f supabase/seed.sql
   ```
   Ingat: isi `opd_master` di seed ini **placeholder**, ganti dengan 36 nama OPD resmi lewat
   Data Master (Phase 4) sebelum go-live.
5. **Generate TypeScript types** dari project asli (menggantikan hasil introspeksi lokal yang
   dipakai untuk membangun Phase 2 ini):
   ```bash
   npx supabase gen types typescript --project-id <project-ref> > types/database.ts
   ```
   (Alternatif tanpa Docker/CLI: `node scripts/generate-types.js` — arahkan connection string
   di dalamnya ke database Anda. Dipakai untuk membangun Phase 2 ini karena Supabase CLI di
   sandbox pengembangan tidak punya akses Docker.)
6. **Membuat admin pertama** — Phase 2 sengaja **tidak** membuat UI/flow ini (spec §17: "jangan
   membuat login berfungsi dulu"). Untuk sekarang, buat manual lewat SQL Editor Supabase:
   ```sql
   -- 1) Buat user di Supabase Auth (dashboard: Authentication > Add user),
   --    gunakan email internal sintetis, misal admin1@internal.slice-d.local
   -- 2) Ambil id user tsb, lalu:
   insert into public.profiles (id, username, role, opd_id)
   values ('<auth-user-id>', 'admin1', 'admin', null);
   ```
   Phase 3 akan membangun flow resmi (Admin create OPD account, reset password) di atas
   fondasi RLS yang sudah ada.
7. **Mengecek RLS** — dua cara:
   - **Otomatis (dianjurkan)**: jalankan `supabase/tests/rls_test_suite.sql` terhadap database
     test (lihat "Menjalankan test RLS secara lokal" di bawah). 13 assertion mencakup: OPD A
     tidak bisa membuat/melihat/mengubah data OPD B, OPD tidak bisa membaca `recon_admin_values`
     sama sekali, OPD tidak bisa mengubah `role/opd_id/aktif` sendiri, OPD terkunci setelah
     submit, Admin read-only terhadap `recon_opd_values`, `anon` hanya bisa baca `fiscal_years`
     aktif.
   - **Manual** di Supabase SQL Editor: `select * from pg_policies where schemaname = 'public';`
     untuk melihat semua policy, atau login sebagai user tertentu lewat dashboard "Impersonate"
     dan coba query tabel yang seharusnya tidak bisa diakses.

### Menjalankan test RLS secara lokal

Test suite butuh Postgres sungguhan (bukan mock) plus stub schema `auth` minimal, karena
Supabase CLI's `db start` butuh Docker yang mungkin tidak tersedia di semua environment:

```bash
# 1) Buat database kosong, lalu jalankan stub auth.users + auth.uid()
#    (lihat komentar di kepala supabase/tests/rls_test_suite.sql untuk apa yang perlu distub)
# 2) Jalankan semua file di supabase/migrations/ secara berurutan
# 3) Jalankan:
psql -d <db> -f supabase/tests/rls_test_suite.sql
# Output diakhiri "ALL RLS TESTS PASSED" jika semua 13 assertion lolos.
```

Jika Anda punya Docker, cara resmi Supabase lebih singkat:
```bash
npx supabase start
npx supabase db reset   # menjalankan migrations + seed ke local stack
psql "$(npx supabase status -o env | grep DB_URL)" -f supabase/tests/rls_test_suite.sql
```

## Data yang belum tersedia (jangan dikarang — lihat spec §43)
- 36 nama & kode OPD resmi
- Username/password user OPD
- NIP, nama pejabat, nama petugas rekon
- Template data ini akan disiapkan di PHASE 4 (Data Master) melalui sistem seed/import,
  bukan hardcode.
