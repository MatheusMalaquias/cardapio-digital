"use client";
import { useEffect } from "react";
import { X } from "lucide-react";

export function Sheet({
  titulo, onClose, children, rodape,
}: { titulo: string; onClose: () => void; children: React.ReactNode; rodape?: React.ReactNode }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", h); document.body.style.overflow = ""; };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={titulo} onClick={(e) => e.stopPropagation()}
        className="flex max-h-[94dvh] w-full max-w-md flex-col rounded-t-3xl bg-white text-ink">
        <div className="flex items-center justify-between px-4 pb-2 pt-4">
          <h2 className="font-display text-xl font-bold">{titulo}</h2>
          <button type="button" onClick={onClose} aria-label="Fechar"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-sand">
            <X size={20} aria-hidden />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-4">{children}</div>
        {rodape && <div className="border-t border-sand p-4">{rodape}</div>}
      </div>
    </div>
  );
}
