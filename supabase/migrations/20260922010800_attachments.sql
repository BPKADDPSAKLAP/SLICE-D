-- ============================================================
-- 0009: attachments
-- ============================================================
-- Metadata only (spec §27/§28) — the physical file lives in Google
-- Drive, uploaded via the Apps Script middleware. This table must
-- never become the file store itself.

create table public.attachments (
  id                  uuid primary key default gen_random_uuid(),
  recon_id            uuid not null references public.recon_headers(id) on delete cascade,
  file_name           text not null,
  drive_file_id       text not null,
  drive_view_url      text,
  drive_download_url  text,
  mime_type           text,
  file_size           bigint,
  uploaded_by         uuid references auth.users(id),
  uploaded_at         timestamptz not null default now()
);

comment on table public.attachments is
  'Metadata for BAR PDFs and other documents stored in Google Drive. drive_file_id/urls come back from the Apps Script upload endpoint — no binary data here.';
