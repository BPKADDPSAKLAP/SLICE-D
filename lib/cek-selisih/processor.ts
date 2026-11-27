import * as XLSX from "xlsx";
import type { WorkBook, WorkSheet } from "xlsx";

export interface ManualTransaction {
  row: number; opdRaw: string; opd: string; code: string; amount: number;
  date: unknown; cashDate: unknown; uraian: string; noSp2d: string;
}
export interface ProgramSource {
  row: number; opdRaw: string; opd: string; code: string; uraian: string;
  g: number; i: number; k: number; m: number;
}
export interface ReconciliationRow {
  opd: string; code: string; uraian: string; manual: number; program: number; delta: number;
  status: "SESUAI" | "SELISIH"; g: number; i: number; k: number; m: number;
  tx: ManualTransaction[]; src: ProgramSource[];
}

const SUBUNIT_MAP = new Map<string, string>([
  ['PUSKESMAS I DENPASAR TIMUR', 'DINAS KESEHATAN'],
  ['PUSKESMAS II DENPASAR TIMUR', 'DINAS KESEHATAN'],
  ['PUSKESMAS I DENPASAR BARAT', 'DINAS KESEHATAN'],
  ['PUSKESMAS II DENPASAR BARAT', 'DINAS KESEHATAN'],
  ['PUSKESMAS I DENPASAR SELATAN', 'DINAS KESEHATAN'],
  ['PUSKESMAS II DENPASAR SELATAN', 'DINAS KESEHATAN'],
  ['PUSKESMAS III DENPASAR SELATAN', 'DINAS KESEHATAN'],
  ['PUSKESMAS IV DENPASAR SELATAN', 'DINAS KESEHATAN'],
  ['PUSKESMAS I DENPASAR UTARA', 'DINAS KESEHATAN'],
  ['PUSKESMAS II DENPASAR UTARA', 'DINAS KESEHATAN'],
  ['PUSKESMAS III DENPASAR UTARA', 'DINAS KESEHATAN'],
  ['UPTD PUSKESMAS III DENPASAR UTARA', 'DINAS KESEHATAN'],
  ['PUSKESMAS III DINAS KESEHATAN DENPASAR UTARA', 'DINAS KESEHATAN'],
  ['UPTD PUSKESMAS III DINAS KESEHATAN KEC DENPASAR UTARA', 'DINAS KESEHATAN'],
  ['BLUD RSUD WANGAYA', 'DINAS KESEHATAN'],
  ['BAGIAN UMUM', 'SEKRETARIAT DAERAH'],
  ['BAGIAN HUKUM', 'SEKRETARIAT DAERAH'],
  ['BAGIAN PEREKONOMIAN', 'SEKRETARIAT DAERAH'],
  ['BAGIAN ORGANISASI', 'SEKRETARIAT DAERAH'],
  ['BAGIAN ADMINISTRASI PEMBANGUNAN', 'SEKRETARIAT DAERAH'],
  ['BAGIAN PROTOKOL DAN KOMUNIKASI PIMPINAN', 'SEKRETARIAT DAERAH'],
  ['BAGIAN TATA PEMERINTAHAN', 'SEKRETARIAT DAERAH'],
  ['BAGIAN KESEJAHTERAAN RAKYAT', 'SEKRETARIAT DAERAH'],
  ['BAGIAN KERJASAMA', 'SEKRETARIAT DAERAH'],
  ['BAGIAN PENGADAAN BARANG DAN JASA', 'SEKRETARIAT DAERAH'],
  ['KELURAHAN PEMECUTAN', 'KECAMATAN DENPASAR BARAT'],
  ['KELURAHAN PADANGSAMBIAN', 'KECAMATAN DENPASAR BARAT'],
  ['KELURAHAN DAUH PURI', 'KECAMATAN DENPASAR BARAT'],
  ['KELURAHAN KESIMAN', 'KECAMATAN DENPASAR TIMUR'],
  ['KELURAHAN SUMERTA', 'KECAMATAN DENPASAR TIMUR'],
  ['KELURAHAN DANGIN PURI', 'KECAMATAN DENPASAR TIMUR'],
  ['KELURAHAN PENATIH', 'KECAMATAN DENPASAR TIMUR'],
  ['KELURAHAN PEDUNGAN', 'KECAMATAN DENPASAR SELATAN'],
  ['KELURAHAN SESETAN', 'KECAMATAN DENPASAR SELATAN'],
  ['KELURAHAN SERANGAN', 'KECAMATAN DENPASAR SELATAN'],
  ['KELURAHAN PANJER', 'KECAMATAN DENPASAR SELATAN'],
  ['KELURAHAN RENON', 'KECAMATAN DENPASAR SELATAN'],
  ['KELURAHAN SANUR', 'KECAMATAN DENPASAR SELATAN'],
  ['KELURAHAN TONJA', 'KECAMATAN DENPASAR UTARA'],
  ['KELURAHAN UBUNG', 'KECAMATAN DENPASAR UTARA'],
  ['KELURAHAN PEGUYANGAN', 'KECAMATAN DENPASAR UTARA'],
]);

function clean(value: unknown): string { return value == null ? "" : String(value).trim(); }
function normOpd(value: unknown): string {
  const s = clean(value).toUpperCase().replace(/[.,;:]+/g, " ").replace(/\s+/g, " ").trim();
  if (SUBUNIT_MAP.has(s)) return SUBUNIT_MAP.get(s)!;
  const compact = s.replace(/\bUPTD\b/g, " ").replace(/\bDINAS KESEHATAN\b/g, " ").replace(/\bKEC(?:AMATAN)?\b/g, " ").replace(/\s+/g, " ").trim();
  if (SUBUNIT_MAP.has(compact)) return SUBUNIT_MAP.get(compact)!;
  return s;
}
function normCode(value: unknown): string { return value == null ? "" : String(value).trim().replace(/\s+/g, ""); }
function amount(value: unknown): number {
  if (value == null || value === "") return 0;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  let s = String(value).trim().replace(/\s/g, "");
  if (!s) return 0;
  if (s.includes(",") && s.includes(".")) s = s.replace(/\./g, "").replace(",", ".");
  else if (s.includes(",")) s = s.replace(",", ".");
  else if (/^[-+]?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
  const n = Number(s.replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}
function isLeafCode(code: string): boolean { return code.split(".").length === 6; }
function matrix(sheet: WorkSheet): unknown[][] {
  // XLSX is imported only in the browser-side feature; raw values preserve the prototype's parsing.
  return XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: null, blankrows: false }) as unknown[][];
}
function getSheet(workbook: WorkBook, name: string): WorkSheet | null {
  const found = workbook.SheetNames.find(n => n.trim().toLowerCase() === name.trim().toLowerCase());
  return found ? workbook.Sheets[found] ?? null : null;
}

export function parseManualWorkbook(workbook: WorkBook): ManualTransaction[] {
  const sheet = getSheet(workbook, "belanja");
  if (!sheet) throw new Error('Sheet "belanja" tidak ditemukan pada LRA Manual.');
  const rows = matrix(sheet); const tx: ManualTransaction[] = [];
  let header = 1;
  for (let i = 0; i < Math.min(rows.length, 20); i++) {
    if (clean(rows[i]?.[2]).toUpperCase() === "OPD") { header = i; break; }
  }
  for (let i = header + 1; i < rows.length; i++) {
    const r = rows[i] ?? [];
    const opdRaw = clean(r[2]); const code = normCode(r[5]); const value = amount(r[7]);
    if (!opdRaw && !code && !r[7]) continue;
    if (!code || (value === 0 && (r[7] == null || r[7] === ""))) continue;
    tx.push({ row: i + 1, opdRaw, opd: normOpd(opdRaw), code, amount: value,
      date: r[3], cashDate: r[4], uraian: clean(r[6]), noSp2d: clean(r[8]) });
  }
  if (!tx.length) throw new Error('Tidak ada transaksi terbaca pada sheet "belanja" LRA Manual. Periksa posisi kolom OPD, kode rekening, dan jumlah.');
  return tx;
}

export function parseProgramWorkbook(workbook: WorkBook): ProgramSource[] {
  const sheetName = workbook.SheetNames[0];
  const sheet = sheetName ? workbook.Sheets[sheetName] : undefined;
  if (!sheet) throw new Error("Sheet LRA Program tidak ditemukan.");
  const rows = matrix(sheet); const src: ProgramSource[] = [];
  let currentRaw = ""; let currentOpd = "";
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i] ?? [];
    const a = clean(r[0]); const b = clean(r[1]); const c = clean(r[2]);
    const code = normCode(r[3]); const uraian = clean(r[4]);
    if (a && b && !c && !code && uraian) { currentRaw = uraian; currentOpd = normOpd(uraian); continue; }
    if (!currentOpd || !code || !isLeafCode(code)) continue;
    src.push({ row: i + 1, opdRaw: currentRaw, opd: currentOpd, code, uraian,
      g: amount(r[6]), i: amount(r[8]), k: amount(r[10]), m: amount(r[12]) });
  }
  if (!src.length) throw new Error("Tidak ada rekening detail 6-segment yang terbaca pada LRA Program.");
  return src;
}

export function reconcileWorkbooks(manualTx: ManualTransaction[], programSrc: ProgramSource[]): ReconciliationRow[] {
  const manual = new Map<string, { opd: string; code: string; manual: number; tx: ManualTransaction[]; uraian: string }>();
  const program = new Map<string, { opd: string; code: string; g: number; i: number; k: number; m: number; program: number; src: ProgramSource[]; uraian: string }>();
  const makeKey = (opd: string, code: string) => `${opd}|${code}`;
  for (const t of manualTx) {
    const key = makeKey(t.opd, t.code); let entry = manual.get(key);
    if (!entry) { entry = { opd: t.opd, code: t.code, manual: 0, tx: [], uraian: t.uraian }; manual.set(key, entry); }
    entry.manual += t.amount; entry.tx.push(t); if (!entry.uraian && t.uraian) entry.uraian = t.uraian;
  }
  for (const r of programSrc) {
    const key = makeKey(r.opd, r.code); let entry = program.get(key);
    if (!entry) { entry = { opd: r.opd, code: r.code, g: 0, i: 0, k: 0, m: 0, program: 0, src: [], uraian: r.uraian }; program.set(key, entry); }
    entry.g += r.g; entry.i += r.i; entry.k += r.k; entry.m += r.m;
    entry.program += r.g + r.i + r.k + r.m; entry.src.push(r); if (!entry.uraian && r.uraian) entry.uraian = r.uraian;
  }
  const keys = new Set([...manual.keys(), ...program.keys()]); const result: ReconciliationRow[] = [];
  for (const key of keys) {
    const a = manual.get(key); const b = program.get(key);
    const manualTotal = a?.manual ?? 0; const programTotal = b?.program ?? 0; const delta = programTotal - manualTotal;
    result.push({ opd: (a ?? b)!.opd, code: (a ?? b)!.code, uraian: a?.uraian || b?.uraian || "",
      manual: manualTotal, program: programTotal, delta, status: Math.abs(delta) < 0.01 ? "SESUAI" : "SELISIH",
      g: b?.g ?? 0, i: b?.i ?? 0, k: b?.k ?? 0, m: b?.m ?? 0, tx: a?.tx ?? [], src: b?.src ?? [] });
  }
  return result.sort((a, b) => a.opd.localeCompare(b.opd, "id") || a.code.localeCompare(b.code, "id"));
}

export function reconciliationSummary(rows: ReconciliationRow[], manualTx: ManualTransaction[]) {
  return {
    totalManual: rows.reduce((sum, row) => sum + row.manual, 0),
    totalProgram: rows.reduce((sum, row) => sum + row.program, 0),
    totalSelisih: rows.reduce((sum, row) => sum + row.delta, 0),
    jumlahRekening: rows.length,
    jumlahSesuai: rows.filter(row => row.status === "SESUAI").length,
    jumlahSelisih: rows.filter(row => row.status === "SELISIH").length,
    jumlahTransaksi: manualTx.length,
  };
}
