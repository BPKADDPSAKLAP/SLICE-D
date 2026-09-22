"use client";

import { type ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

/**
 * Generic right-side sliding drawer. Used later (Phase 9, Cek
 * Selisih) for the "Mengapa Selisih?" detail panel — but this
 * component has no idea what a "selisih" is; it just renders
 * whatever children it's given.
 */
export function Drawer({
  open,
  onClose,
  title,
  description,
  children,
  className,
}: DrawerProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      <div
        className="absolute inset-0 bg-navy/35"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={cn(
          "absolute right-0 top-0 flex h-full w-full max-w-xl flex-col bg-white shadow-[var(--shadow-overlay)]",
          className
        )}
      >
        {(title || description) && (
          <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div>
              {title && <h2 className="text-base font-bold text-navy">{title}</h2>}
              {description && (
                <p className="mt-1 text-xs text-muted">{description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-[var(--radius-control)] bg-soft text-muted hover:text-navy"
            >
              ✕
            </button>
          </div>
        )}
        <div className="flex-1 overflow-auto px-5 py-4">{children}</div>
      </div>
    </div>,
    document.body
  );
}
