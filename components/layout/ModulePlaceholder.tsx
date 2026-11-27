import { PageHeader } from "./PageHeader";
import { EmptyState } from "@/components/ui";

export interface ModulePlaceholderProps {
  eyebrow: string;
  title: string;
  description: string;
  emptyTitle?: string;
  emptyDescription?: string;
}

/**
 * Used by every module page that isn't built yet (Rekonsiliasi, Cek
 * Selisih, Unggah Rekon, Database, Data Master on both roles). No
 * dummy numbers or sample rows — just an honest "belum tersedia"
 * state until each module's real phase.
 */
export function ModulePlaceholder({
  eyebrow,
  title,
  description,
  emptyTitle = "Belum tersedia",
  emptyDescription = "Modul ini akan dibangun pada phase berikutnya.",
}: ModulePlaceholderProps) {
  return (
    <>
      <PageHeader eyebrow={eyebrow} title={title} subtitle={description} />
      <EmptyState title={emptyTitle} description={emptyDescription} />
    </>
  );
}
