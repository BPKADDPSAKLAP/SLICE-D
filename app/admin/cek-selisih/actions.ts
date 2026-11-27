
"use server";

import { requireAdmin } from "@/lib/permissions";

import {
  activateRun,
  createRun,
  getActiveRun,
  listVersions,
  type CreateRunInput,
} from "@/lib/cek-selisih/repository";

export async function loadRunHistory(
  year: number,
  month: number
) {
  try {
    await requireAdmin();

    if (
      !Number.isInteger(year) ||
      year < 2000 ||
      year > 2200
    ) {
      return {
        ok: false as const,
        error: "Tahun anggaran tidak valid.",
      };
    }

    if (
      !Number.isInteger(month) ||
      month < 1 ||
      month > 12
    ) {
      return {
        ok: false as const,
        error: "Bulan pelaporan tidak valid.",
      };
    }

    const [activeResult, versionsResult] =
      await Promise.all([
        getActiveRun(year, month),
        listVersions(year, month),
      ]);

    if (!activeResult.ok) {
      return {
        ok: false as const,
        error: activeResult.error,
      };
    }

    if (!versionsResult.ok) {
      return {
        ok: false as const,
        error: versionsResult.error,
      };
    }

    return {
      ok: true as const,
      data: {
        active: activeResult.data,
        versions: versionsResult.data,
      },
    };
  } catch (error) {
    return {
      ok: false as const,
      error:
        error instanceof Error
          ? error.message
          : "Gagal mengambil riwayat versi.",
    };
  }
}

export async function saveRunSummary(
  input: CreateRunInput
) {
  try {
    await requireAdmin();

    if (
      !Number.isInteger(input.fiscalYear) ||
      input.fiscalYear < 2000 ||
      input.fiscalYear > 2200
    ) {
      return {
        ok: false as const,
        error: "Tahun anggaran tidak valid.",
      };
    }

    if (
      !Number.isInteger(input.reportingMonth) ||
      input.reportingMonth < 1 ||
      input.reportingMonth > 12
    ) {
      return {
        ok: false as const,
        error: "Bulan pelaporan tidak valid.",
      };
    }

    const result = await createRun(input);

    if (!result.ok) {
      return {
        ok: false as const,
        error: result.error,
      };
    }

    return {
      ok: true as const,
      data: result.data,
    };
  } catch (error) {
    return {
      ok: false as const,
      error:
        error instanceof Error
          ? error.message
          : "Gagal menyimpan versi.",
    };
  }
}

export async function activateSavedRun(id: string) {
  try {
    await requireAdmin();

    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!uuidPattern.test(id)) {
      return {
        ok: false as const,
        error: "ID versi tidak valid.",
      };
    }

    const result = await activateRun(id);

    if (!result.ok) {
      return {
        ok: false as const,
        error: result.error,
      };
    }

    return {
      ok: true as const,
      data: result.data,
    };
  } catch (error) {
    return {
      ok: false as const,
      error:
        error instanceof Error
          ? error.message
          : "Gagal mengaktifkan versi.",
    };
  }
}
