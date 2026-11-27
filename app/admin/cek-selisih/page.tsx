
"use client";

import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";

import {
  loadRunHistory,
  saveRunSummary,
  activateSavedRun,
} from "./actions";

import {
  parseManualWorkbook,
  parseProgramWorkbook,
  reconcileWorkbooks,
  reconciliationSummary,
  type ReconciliationRow,
  type ManualTransaction,
} from "@/lib/cek-selisih/processor";

type SavedVersion = {
  id: string;
  version: number;
  status: "ACTIVE" | "SUPERSEDED";
  createdAt: string;
  totalManual: number;
  totalProgram: number;
  totalSelisih: number;
  jumlahTransaksi: number;
  jumlahRekening: number;
  jumlahSesuai: number;
  jumlahSelisih: number;
  catatan: string | null;
};

const MONTHS = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const money = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Math.round(n || 0));

const signedMoney = (n: number) =>
  Math.abs(n) < 0.005
    ? money(0)
    : `${n > 0 ? "+" : "−"}${money(Math.abs(n))}`;

function mapVersions(items: any[]): SavedVersion[] {
  return items.map((item) => ({
    id: item.id,
    version: item.version,
    status: item.status as "ACTIVE" | "SUPERSEDED",
    createdAt: item.createdAt,
    totalManual: Number(item.totalSp2d ?? 0),
    totalProgram: Number(item.totalLraProgram ?? 0),
    totalSelisih: Number(item.totalSelisih ?? 0),
    jumlahTransaksi: Number(item.jumlahTransaksi ?? 0),
    jumlahRekening: Number(item.jumlahRekening ?? 0),
    jumlahSesuai: Number(item.jumlahSesuai ?? 0),
    jumlahSelisih: Number(item.jumlahSelisih ?? 0),
    catatan: item.catatan ?? null,
  }));
}

export default function CekSelisihPage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);

  const [manualFile, setManualFile] = useState<File | null>(null);
  const [programFile, setProgramFile] = useState<File | null>(null);

  const [rows, setRows] = useState<ReconciliationRow[]>([]);
  const [transactions, setTransactions] =
    useState<ManualTransaction[]>([]);

  const [status, setStatus] =
    useState<"ALL" | "SESUAI" | "SELISIH">("ALL");

  const [opd, setOpd] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] =
    useState<ReconciliationRow | null>(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [versions, setVersions] = useState<SavedVersion[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const summary = useMemo(
    () => reconciliationSummary(rows, transactions),
    [rows, transactions]
  );

  const opdOptions = useMemo(
    () => [...new Set(rows.map((r) => r.opd))].sort((a, b) =>
      a.localeCompare(b, "id")
    ),
    [rows]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLocaleUpperCase("id-ID");

    return rows.filter(
      (r) =>
        (status === "ALL" || r.status === status) &&
        (!opd || r.opd === opd) &&
        (!q ||
          `${r.opd} ${r.code} ${r.uraian}`
            .toLocaleUpperCase("id-ID")
            .includes(q))
    );
  }, [rows, status, opd, search]);

  // Memuat riwayat versi berdasarkan tahun dan bulan.
  useEffect(() => {
    let cancelled = false;

    async function fetchHistory() {
      setHistoryLoading(true);

      try {
        const result = await loadRunHistory(year, month);

        if (cancelled) return;

        if (!result.ok) {
          setError(result.error);
          setVersions([]);
        } else {
          setVersions(mapVersions(result.data.versions));
        }
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error
              ? e.message
              : "Riwayat versi gagal dimuat."
          );
          setVersions([]);
        }
      } finally {
        if (!cancelled) {
          setHistoryLoading(false);
        }
      }
    }

    void fetchHistory();

    return () => {
      cancelled = true;
    };
  }, [year, month]);

  // Memproses kedua file Excel.
  async function processFiles() {
    setError("");
    setNotice("");

    if (!manualFile || !programFile) {
      setError("Pilih kedua file Excel terlebih dahulu.");
      return;
    }

    setBusy(true);

    try {
      const [manualBuffer, programBuffer] = await Promise.all([
        manualFile.arrayBuffer(),
        programFile.arrayBuffer(),
      ]);

      const manualWorkbook = XLSX.read(manualBuffer, {
        type: "array",
        cellDates: true,
        raw: true,
      });

      const programWorkbook = XLSX.read(programBuffer, {
        type: "array",
        cellDates: true,
        raw: true,
      });

      const tx = parseManualWorkbook(manualWorkbook);
      const src = parseProgramWorkbook(programWorkbook);
      const reconciled = reconcileWorkbooks(tx, src);

      setTransactions(tx);
      setRows(reconciled);
      setStatus("ALL");
      setOpd("");
      setSearch("");
      setSelected(null);

      setNotice(
        `Pemrosesan selesai: ${reconciled.length.toLocaleString(
          "id-ID"
        )} kombinasi OPD dan rekening berhasil dibandingkan.`
      );
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "File tidak dapat diproses. Periksa format kedua file."
      );
    } finally {
      setBusy(false);
    }
  }

  // Menyimpan ringkasan hasil sebagai versi baru.
  async function saveVersion() {
    setError("");
    setNotice("");

    if (rows.length === 0) {
      setError("Belum ada hasil rekonsiliasi yang dapat disimpan.");
      return;
    }

    setBusy(true);

    try {
      const result = await saveRunSummary({
        fiscalYear: year,
        reportingMonth: month,
        totalSp2d: summary.totalManual,
        totalLraProgram: summary.totalProgram,
        totalSelisih: summary.totalSelisih,
        jumlahTransaksi: summary.jumlahTransaksi,
        jumlahRekening: summary.jumlahRekening,
        jumlahSesuai: summary.jumlahSesuai,
        jumlahSelisih: summary.jumlahSelisih,
        catatan: "",
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      const history = await loadRunHistory(year, month);

      if (history.ok) {
        setVersions(mapVersions(history.data.versions));
      }

      setNotice("Versi hasil rekonsiliasi berhasil disimpan.");
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Terjadi kesalahan saat menyimpan versi."
      );
    } finally {
      setBusy(false);
    }
  }

  // Mengaktifkan versi yang dipilih.
  async function activateVersion(id: string) {
    setError("");
    setNotice("");
    setBusy(true);

    try {
      const result = await activateSavedRun(id);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      const history = await loadRunHistory(year, month);

      if (history.ok) {
        setVersions(mapVersions(history.data.versions));
      }

      setNotice("Versi berhasil diaktifkan.");
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Terjadi kesalahan saat mengaktifkan versi."
      );
    } finally {
      setBusy(false);
    }
  }

  // Ekspor hasil rekonsiliasi ke Excel.
  function exportExcel() {
    if (!rows.length) return;

    const data = rows.map((r) => ({
      OPD: r.opd,
      "KODE REKENING": r.code,
      URAIAN: r.uraian,
      "LRA MANUAL (SP2D)": r.manual,
      "REALISASI OPERASI (G)": r.g,
      "REALISASI MODAL (I)": r.i,
      "REALISASI TRANSFER (M)": r.m,
      "REALISASI TAK TERDUGA (K)": r.k,
      "LRA PROGRAM": r.program,
      "SELISIH (PROGRAM-SP2D)": r.delta,
      STATUS: r.status,
    }));

    const wb = XLSX.utils.book_new();

    const reportData = [
      ["LAPORAN HASIL CEK SELISIH LRA BELANJA"],
      [`Tahun Anggaran: ${year}`],
      [
        `Periode: ${new Date(
          Number(year),
          Number(month) - 1,
          1
        ).toLocaleDateString("id-ID", {
          month: "long",
          year: "numeric",
        })}`,
      ],
      ["Sumber Data: LRA Manual SP2D dan LRA Program"],
      [],
      ...(
        XLSX.utils.sheet_to_json(
          XLSX.utils.json_to_sheet(data),
          { header: 1 }
        ) as unknown[][]
      ),
    ];

    const ws = XLSX.utils.aoa_to_sheet(reportData);

    XLSX.utils.book_append_sheet(wb, ws, "Rekonsiliasi");

    XLSX.writeFile(
      wb,
      `Cek_Selisih_${year}_${String(month).padStart(2, "0")}.xlsx`
    );
  }

  return (
    <main className="mx-auto max-w-[1600px] space-y-6 p-4 md:p-8">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.22em] text-amber-700">
            SLICE-D · ADMINISTRATOR
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            Cek Selisih LRA Belanja
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            Bandingkan LRA Manual berbasis SP2D dengan LRA Program,
            sampai ke rincian sumber angka.
          </p>
        </div>

        <div className="flex flex-wrap gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <label className="text-xs font-semibold text-slate-600">
            Tahun Anggaran
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="mt-1 block rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
            >
              {Array.from(
                { length: 8 },
                (_, i) => new Date().getFullYear() - 3 + i
              ).map((y) => (
                <option key={y}>{y}</option>
              ))}
            </select>
          </label>

          <label className="text-xs font-semibold text-slate-600">
            Bulan
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="mt-1 block rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
            >
              {MONTHS.map((m, i) => (
                <option key={m} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="flex flex-col justify-between gap-2 md:flex-row md:items-center">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Sumber Data
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Pilih file untuk periode {MONTHS[month - 1]} {year}.
              File diproses di browser.
            </p>
          </div>

          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
            Excel .xlsx / .xls
          </span>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="cursor-pointer rounded-xl border-2 border-dashed border-slate-300 p-5 transition hover:border-amber-500 hover:bg-amber-50/30">
            <span className="text-sm font-bold text-slate-800">
              1. LRA Manual (SP2D)
            </span>
            <span className="mt-1 block text-xs text-slate-500">
              Harus memiliki sheet bernama <code>belanja</code>.
            </span>
            <input
              type="file"
              accept=".xlsx,.xls"
              className="mt-4 block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-xs file:font-semibold"
              onChange={(e) =>
                setManualFile(e.target.files?.[0] ?? null)
              }
            />
            <span className="mt-2 block break-all text-xs text-slate-700">
              {manualFile?.name ?? "Belum ada file dipilih"}
            </span>
          </label>

          <label className="cursor-pointer rounded-xl border-2 border-dashed border-slate-300 p-5 transition hover:border-amber-500 hover:bg-amber-50/30">
            <span className="text-sm font-bold text-slate-800">
              2. LRA Program
            </span>
            <span className="mt-1 block text-xs text-slate-500">
              Rincian rekening diambil dari worksheet pertama.
            </span>
            <input
              type="file"
              accept=".xlsx,.xls"
              className="mt-4 block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-xs file:font-semibold"
              onChange={(e) =>
                setProgramFile(e.target.files?.[0] ?? null)
              }
            />
            <span className="mt-2 block break-all text-xs text-slate-700">
              {programFile?.name ?? "Belum ada file dipilih"}
            </span>
          </label>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            onClick={processFiles}
            disabled={busy}
            className="rounded-lg bg-slate-900 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-slate-700 disabled:cursor-wait disabled:opacity-60"
          >
            {busy ? "Memproses file…" : "Proses & Bandingkan"}
          </button>

          {rows.length > 0 && (
            <>
              <button
                onClick={exportExcel}
                className="rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-800 hover:bg-slate-50"
              >
                Ekspor Semua Hasil ke Excel
              </button>

              <button
                onClick={saveVersion}
                disabled={busy}
                className="rounded-lg bg-amber-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-amber-700 disabled:cursor-wait disabled:opacity-60"
              >
                Simpan Versi
              </button>
            </>
          )}
        </div>

        {error && (
          <p
            role="alert"
            className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
          >
            {error}
          </p>
        )}

        {notice && (
          <p
            role="status"
            className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
          >
            {notice}
          </p>
        )}

        <p className="mt-4 text-xs leading-5 text-slate-500">
          Hasil Excel diproses pada sesi browser. Simpan Versi
          menyimpan ringkasan hasil ke database SLICE-D.
        </p>
      </section>

      {/* Riwayat versi tersimpan */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5">
          <h2 className="text-lg font-bold text-slate-900">
            Riwayat Versi Rekonsiliasi
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Periode {MONTHS[month - 1]} {year}
          </p>
        </div>

        {historyLoading ? (
          <p className="p-5 text-sm text-slate-500">
            Memuat riwayat versi...
          </p>
        ) : versions.length === 0 ? (
          <p className="p-5 text-sm text-slate-500">
            Belum ada versi tersimpan untuk periode ini.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  {[
                    "Versi",
                    "Tanggal Simpan",
                    "Total Manual",
                    "Total Program",
                    "Selisih",
                    "Status",
                    "Aksi",
                  ].map((h) => (
                    <th
                      key={h}
                      className="border-b border-slate-200 px-4 py-3 font-bold"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {versions.map((v) => (
                  <tr key={v.id}>
                    <td className="border-b border-slate-100 px-4 py-3 font-bold">
                      Versi {v.version}
                    </td>

                    <td className="border-b border-slate-100 px-4 py-3 text-slate-600">
                      {new Date(v.createdAt).toLocaleString("id-ID")}
                    </td>

                    <td className="border-b border-slate-100 px-4 py-3 whitespace-nowrap">
                      {money(v.totalManual)}
                    </td>

                    <td className="border-b border-slate-100 px-4 py-3 whitespace-nowrap">
                      {money(v.totalProgram)}
                    </td>

                    <td className="border-b border-slate-100 px-4 py-3 whitespace-nowrap">
                      {signedMoney(v.totalSelisih)}
                    </td>

                    <td className="border-b border-slate-100 px-4 py-3">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          v.status === "ACTIVE"
                            ? "bg-emerald-50 text-emerald-800"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {v.status === "ACTIVE"
                          ? "AKTIF"
                          : "TERSIMPAN"}
                      </span>
                    </td>

                    <td className="border-b border-slate-100 px-4 py-3">
                      {v.status !== "ACTIVE" && (
                        <button
                          onClick={() => activateVersion(v.id)}
                          disabled={busy}
                          className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800 hover:bg-amber-100 disabled:opacity-50"
                        >
                          Aktifkan
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {rows.length > 0 && (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: "Total LRA Manual (SP2D)",
                value: money(summary.totalManual),
              },
              {
                label: "Total LRA Program",
                value: money(summary.totalProgram),
              },
              {
                label: "Total Selisih",
                value: signedMoney(summary.totalSelisih),
              },
              {
                label: "Jumlah Transaksi SP2D",
                value: summary.jumlahTransaksi.toLocaleString("id-ID"),
              },
            ].map((card) => (
              <div
                key={card.label}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <p className="text-xs font-semibold text-slate-500">
                  {card.label}
                </p>
                <p className="mt-2 break-words text-xl font-bold text-slate-900">
                  {card.value}
                </p>
              </div>
            ))}
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Hasil Rekonsiliasi
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Pilih baris untuk melihat rincian sumber angka
                    dan penyebab selisih.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-slate-100 px-3 py-2 font-semibold text-slate-700">
                    {summary.jumlahRekening.toLocaleString("id-ID")} rekening
                  </span>
                  <span className="rounded-full bg-emerald-50 px-3 py-2 font-semibold text-emerald-800">
                    {summary.jumlahSesuai.toLocaleString("id-ID")} sesuai
                  </span>
                  <span className="rounded-full bg-red-50 px-3 py-2 font-semibold text-red-800">
                    {summary.jumlahSelisih.toLocaleString("id-ID")} selisih
                  </span>
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-3 md:flex-row">
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      { id: "ALL", label: "Semua" },
                      { id: "SELISIH", label: "Selisih" },
                      { id: "SESUAI", label: "Sesuai" },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setStatus(tab.id)}
                      className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                        status === tab.id
                          ? "bg-slate-900 text-white"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <select
                  value={opd}
                  onChange={(e) => setOpd(e.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="">Semua OPD</option>
                  {opdOptions.map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>

                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari OPD, kode rekening, uraian…"
                  className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                />
              </div>
            </div>

            <div className="max-h-[65vh] overflow-auto">
              <table className="min-w-[1000px] w-full border-collapse text-left text-sm">
                <thead className="sticky top-0 z-10 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    {[
                      "OPD",
                      "Kode Rekening",
                      "Uraian",
                      "LRA Manual (SP2D)",
                      "LRA Program",
                      "Selisih (Program − SP2D)",
                      "Status",
                    ].map((h) => (
                      <th
                        key={h}
                        className="border-b border-slate-200 px-4 py-3 font-bold"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {filtered.map((r, i) => (
                    <tr
                      key={`${r.opd}|${r.code}|${i}`}
                      onClick={() => setSelected(r)}
                      className="cursor-pointer hover:bg-amber-50/60"
                    >
                      <td className="max-w-[230px] border-b border-slate-100 px-4 py-3 font-semibold text-slate-800">
                        {r.opd}
                      </td>

                      <td className="whitespace-nowrap border-b border-slate-100 px-4 py-3 font-mono text-xs text-slate-700">
                        {r.code}
                      </td>

                      <td className="max-w-[260px] border-b border-slate-100 px-4 py-3 text-slate-600">
                        {r.uraian}
                      </td>

                      <td className="whitespace-nowrap border-b border-slate-100 px-4 py-3 text-right tabular-nums">
                        {money(r.manual)}
                      </td>

                      <td className="whitespace-nowrap border-b border-slate-100 px-4 py-3 text-right tabular-nums">
                        {money(r.program)}
                      </td>

                      <td
                        className={`whitespace-nowrap border-b border-slate-100 px-4 py-3 text-right font-semibold tabular-nums ${
                          Math.abs(r.delta) < 0.01
                            ? "text-slate-500"
                            : "text-red-700"
                        }`}
                      >
                        {signedMoney(r.delta)}
                      </td>

                      <td className="border-b border-slate-100 px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                            r.status === "SESUAI"
                              ? "bg-emerald-50 text-emerald-800"
                              : "bg-red-50 text-red-800"
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filtered.length === 0 && (
                <p className="p-10 text-center text-sm text-slate-500">
                  Tidak ada data yang sesuai dengan filter.
                </p>
              )}
            </div>
          </section>
        </>
      )}

      {selected && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-slate-950/40"
          onClick={() => setSelected(null)}
        >
          <aside
            onClick={(e) => e.stopPropagation()}
            className="h-full w-full max-w-2xl overflow-y-auto bg-white p-5 shadow-2xl md:p-7"
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-amber-700">
                  Rincian Rekonsiliasi
                </p>
                <h2 className="mt-2 text-xl font-bold text-slate-900">
                  {selected.status === "SELISIH"
                    ? "Mengapa Selisih?"
                    : "Detail Rekonsiliasi"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {selected.opd} ·{" "}
                  <span className="font-mono">{selected.code}</span>
                </p>
              </div>

              <button
                onClick={() => setSelected(null)}
                aria-label="Tutup rincian"
                className="rounded-lg border border-slate-200 px-3 py-2 text-slate-600 hover:bg-slate-50"
              >
                Tutup ✕
              </button>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <Detail
                label="LRA Manual / SP2D"
                value={money(selected.manual)}
              />
              <Detail
                label="LRA Program"
                value={money(selected.program)}
              />
              <Detail
                label="Selisih (Program − SP2D)"
                value={signedMoney(selected.delta)}
              />
              <Detail label="Status" value={selected.status} />
            </div>

            {(!selected.tx.length || !selected.src.length) && (
              <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                Catatan pencocokan:{" "}
                {selected.tx.length === 0
                  ? "kode rekening ini tidak ditemukan pada data SP2D."
                  : "kode rekening ini tidak ditemukan pada LRA Program."}
              </p>
            )}

            <h3 className="mb-2 mt-6 font-bold text-slate-900">
              Komponen LRA Program
            </h3>

            <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 px-4">
              {[
                ["Realisasi Operasi (G)", selected.g],
                ["Realisasi Modal (I)", selected.i],
                ["Realisasi Tak Terduga (K)", selected.k],
                ["Realisasi Transfer (M)", selected.m],
              ].map(([label, value]) => (
                <div
                  key={String(label)}
                  className="flex justify-between gap-4 py-3 text-sm"
                >
                  <span className="text-slate-600">{label}</span>
                  <b className="tabular-nums text-slate-900">
                    {money(Number(value))}
                  </b>
                </div>
              ))}

              <div className="flex justify-between gap-4 py-3 text-sm">
                <b>Total LRA Program</b>
                <b>{money(selected.program)}</b>
              </div>
            </div>

            <h3 className="mb-2 mt-6 font-bold text-slate-900">
              Sumber SP2D
            </h3>

            {selected.tx.length ? (
              <div className="overflow-auto rounded-xl border border-slate-200">
                <table className="min-w-full text-xs">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="p-2 text-left">Tanggal</th>
                      <th className="p-2 text-left">No. SP2D</th>
                      <th className="p-2 text-left">Uraian</th>
                      <th className="p-2 text-right">Jumlah</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.tx.map((t, i) => (
                      <tr
                        key={`${t.row}-${i}`}
                        className="border-t border-slate-100"
                      >
                        <td className="p-2">{formatDate(t.date)}</td>
                        <td className="p-2">{t.noSp2d}</td>
                        <td className="p-2">{t.uraian}</td>
                        <td className="whitespace-nowrap p-2 text-right">
                          {money(t.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">
                Tidak ada transaksi SP2D yang cocok.
              </p>
            )}

            <h3 className="mb-2 mt-6 font-bold text-slate-900">
              Sumber LRA Program
            </h3>

            {selected.src.length ? (
              <div className="overflow-auto rounded-xl border border-slate-200">
                <table className="min-w-full text-xs">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="p-2 text-left">Baris Excel</th>
                      <th className="p-2 text-left">Uraian</th>
                      <th className="p-2 text-right">Realisasi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.src.map((s, i) => (
                      <tr
                        key={`${s.row}-${i}`}
                        className="border-t border-slate-100"
                      >
                        <td className="p-2">{s.row}</td>
                        <td className="p-2">{s.uraian}</td>
                        <td className="whitespace-nowrap p-2 text-right">
                          {money(s.g + s.i + s.k + s.m)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">
                Kode rekening tidak ditemukan pada LRA Program.
              </p>
            )}
          </aside>
        </div>
      )}
    </main>
  );
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className="mt-2 break-words text-sm font-bold text-slate-900">
        {value}
      </p>
    </div>
  );
}

function formatDate(value: unknown): string {
  if (value instanceof Date) {
    return value.toLocaleDateString("id-ID");
  }

  if (typeof value === "number") {
    const date = XLSX.SSF.parse_date_code(value);

    if (date) {
      return `${String(date.d).padStart(2, "0")}/${String(
        date.m
      ).padStart(2, "0")}/${date.y}`;
    }
  }

  return value == null ? "" : String(value);
}
