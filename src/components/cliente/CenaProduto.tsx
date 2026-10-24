"use client";
import { Flame, Plus } from "lucide-react";
import { formatBRL } from "@/lib/format";
import type { Produto } from "@/types";

/** Um produto = uma foto em tela cheia. As características só aparecem ao escolher o produto. */
export function CenaProduto({ p, maisPedido, onAbrir }: { p: Produto; maisPedido: boolean; onAbrir: (id: string) => void }) {
  const promo = p.preco_atual < p.preco;
  return (
    <li data-cena className="cena">
      <button type="button" disabled={p.esgotado} onClick={() => onAbrir(p.id)} aria-label={`Escolher ${p.nome}`} className="cena-btn">
        {p.foto_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.foto_url} alt={p.nome} loading="lazy" className="cena-img" />
        )}
        <span className="cena-vinheta" aria-hidden />

        <span className="absolute left-4 top-28 z-10 flex flex-col items-start gap-1.5">
          {maisPedido && (
            <span className="brilho flex items-center gap-1 rounded-full bg-[var(--accent)] px-3 py-1 text-xs font-semibold text-white">
              <Flame size={13} aria-hidden /> Mais pedido hoje
            </span>
          )}
          {promo && !p.esgotado && (
            <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[#7a2608]">−{Math.round((1 - p.preco_atual / p.preco) * 100)}% hoje</span>
          )}
        </span>

        <span className="cena-texto">
          {p.tamanho_descricao && <span className="mb-1 block text-sm text-stone-300">{p.tamanho_descricao}</span>}
          <span className="block font-display text-4xl font-bold leading-[1.05]">{p.nome}</span>
          <span className="mt-3 flex items-center justify-between gap-3">
            <span className="font-display font-bold leading-tight">
              {p.esgotado ? <span className="text-lg text-stone-300">Esgotado</span> : (
                <>
                  {promo && <span className="block text-sm font-normal text-stone-300 line-through">{formatBRL(p.preco)}</span>}
                  <span className="grad-accent text-3xl">{formatBRL(p.preco_atual)}</span>
                </>
              )}
            </span>
            {!p.esgotado && (
              <span className="brilho flex h-12 items-center gap-1.5 rounded-full bg-[var(--accent)] pl-5 pr-4 text-base font-semibold text-white">
                Escolher <Plus size={20} aria-hidden />
              </span>
            )}
          </span>
        </span>
      </button>
    </li>
  );
}
