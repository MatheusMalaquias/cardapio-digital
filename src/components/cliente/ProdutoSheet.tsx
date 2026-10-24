"use client";
import { useEffect, useMemo, useState } from "react";
import { Check, Minus, Plus, X } from "lucide-react";
import { formatBRL } from "@/lib/format";
import type { Adicional, ItemCarrinho, Produto, Variacao } from "@/types";

type Combo = { produto: Produto; variacao: Variacao | null; specs: Record<string, string> };
const padroes = (p: Produto) => Object.fromEntries(p.opcoes.map((o) => [o.nome, o.escolhas[0]]));
const sel = "h-11 rounded-xl border border-stone-300 bg-white px-2 text-sm";

export function ProdutoSheet({
  produto, todos, categorias, onClose, onAdd, onAbrir,
}: {
  produto: Produto; todos: Produto[]; categorias: { id: string; nome: string; produtos: Produto[] }[];
  onClose: () => void; onAdd: (i: Omit<ItemCarrinho, "key">[]) => void; onAbrir: (id: string) => void;
}) {
  const [variacao, setVariacao] = useState<Variacao | null>(produto.variacoes[0] ?? null);
  const [specs, setSpecs] = useState<Record<string, string>>(() => padroes(produto));
  const [extras, setExtras] = useState<Adicional[]>([]);
  const [obs, setObs] = useState("");
  const [qtd, setQtd] = useState(1);
  const [combos, setCombos] = useState<Combo[]>([]);
  const [catCombo, setCatCombo] = useState("");

  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", h); document.body.style.overflow = ""; };
  }, [onClose]);

  const unit = useMemo(
    () => produto.preco_atual + (variacao?.preco_delta ?? 0) + extras.reduce((s, a) => s + a.preco, 0),
    [produto, variacao, extras],
  );
  const comboUnit = (c: Combo) => c.produto.preco_atual + (c.variacao?.preco_delta ?? 0);
  const total = unit * qtd + combos.reduce((s, c) => s + comboUnit(c), 0);

  const candidatos = categorias
    .filter((c) => !catCombo || c.id === catCombo)
    .flatMap((c) => c.produtos)
    .filter((p) => p.id !== produto.id && !p.esgotado);
  const sugestoes = produto.complementos.map((id) => todos.find((p) => p.id === id)).filter(Boolean) as Produto[];

  const alternar = (p: Produto) =>
    setCombos((l) => (l.some((c) => c.produto.id === p.id)
      ? l.filter((c) => c.produto.id !== p.id)
      : [...l, { produto: p, variacao: p.variacoes[0] ?? null, specs: padroes(p) }]));

  function adicionar() {
    const principal: Omit<ItemCarrinho, "key"> = {
      produto_id: produto.id, nome: produto.nome, qtd, unit, variacao, adicionais: extras,
      observacao: obs.trim(), especificacoes: specs,
    };
    const extrasCombo = combos.map<Omit<ItemCarrinho, "key">>((c) => ({
      produto_id: c.produto.id, nome: c.produto.nome, qtd: 1, unit: comboUnit(c), variacao: c.variacao,
      adicionais: [], observacao: `Combinação com ${produto.nome}`, especificacoes: c.specs,
    }));
    onAdd([principal, ...extrasCombo]);
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" role="dialog" aria-modal="true" aria-label={produto.nome}>
      {/* fundo: a própria foto, ampliada e desfocada */}
      <div className="absolute inset-0 overflow-hidden bg-black" onClick={onClose}>
        {produto.foto_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={produto.foto_url} alt="" className="distorce h-full w-full object-cover" />
        )}
        <div className="absolute inset-0 bg-black/45" />
      </div>
      <button type="button" onClick={onClose} aria-label="Fechar"
        className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur">
        <X size={20} aria-hidden />
      </button>
      {/* produto inteiro, sem corte */}
      {produto.foto_url && (
        <div className="relative z-[1] mx-auto flex h-[24dvh] w-full max-w-md items-center justify-center px-10" onClick={onClose}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={produto.foto_url} alt={produto.nome} className="entra-foto max-h-full max-w-full rounded-2xl object-contain drop-shadow-2xl" />
        </div>
      )}

      <div className="entra-caixa relative z-[2] mx-auto flex max-h-[76dvh] w-full max-w-md flex-col rounded-t-[28px] bg-white text-ink">
        <div className="flex items-start justify-between gap-3 px-5 pb-1 pt-5">
          <div>
            <h2 className="font-display text-2xl font-bold leading-tight">{produto.nome}</h2>
            {produto.tamanho_descricao && <p className="text-sm text-muted">{produto.tamanho_descricao}</p>}
          </div>
          <p className="font-display text-xl font-bold text-accent">{formatBRL(produto.preco_atual)}</p>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-4">
          <section aria-label="Características do produto" className="mt-1">
            {produto.descricao && <p className="text-sm text-muted">{produto.descricao}</p>}
            {produto.alergenicos.length > 0 && (
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {produto.alergenicos.map((al) => (
                  <li key={al} className="rounded-full bg-sand px-2.5 py-0.5 text-xs font-medium text-muted">{{ sem_gluten: "Sem glúten", sem_lactose: "Sem lactose", vegano: "Vegano" }[al] ?? al}</li>
                ))}
              </ul>
            )}
            {produto.ingredientes.length > 0 && (
              <div className="mt-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-accent">Ingredientes</h3>
                <ul className="mt-1.5 flex flex-wrap gap-1.5">
                  {produto.ingredientes.map((i) => <li key={i} className="rounded-full border border-stone-300 px-2.5 py-0.5 text-xs">{i}</li>)}
                </ul>
              </div>
            )}
            {produto.preparo.length > 0 && (
              <div className="mt-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-accent">Como é feito</h3>
                <ol className="mt-1.5 space-y-1.5">
                  {produto.preparo.map((p, k) => (
                    <li key={k} className="flex gap-2 text-sm text-muted"><span className="font-display font-bold text-accent">{k + 1}</span>{p}</li>
                  ))}
                </ol>
              </div>
            )}
          </section>

          {produto.opcoes.map((o) => (
            <fieldset key={o.nome} className="mt-5">
              <legend className="mb-2 font-semibold">{o.nome}</legend>
              <div className="flex flex-wrap gap-2">
                {o.escolhas.map((e) => (
                  <label key={e} className={`flex h-11 cursor-pointer items-center rounded-full border px-4 text-sm font-medium ${specs[o.nome] === e ? "border-accent bg-accent text-white" : "border-stone-300"}`}>
                    <input type="radio" name={`op-${o.nome}`} className="sr-only" checked={specs[o.nome] === e} onChange={() => setSpecs((s) => ({ ...s, [o.nome]: e }))} />
                    {e}
                  </label>
                ))}
              </div>
            </fieldset>
          ))}

          {produto.variacoes.length > 0 && (
            <fieldset className="mt-5">
              <legend className="mb-2 font-semibold">Tamanho</legend>
              <div className="flex gap-2">
                {produto.variacoes.map((v) => (
                  <label key={v.id} className={`flex h-11 flex-1 cursor-pointer items-center justify-center rounded-full border text-sm font-medium ${variacao?.id === v.id ? "border-accent bg-accent text-white" : "border-stone-300"}`}>
                    <input type="radio" name="variacao" className="sr-only" checked={variacao?.id === v.id} onChange={() => setVariacao(v)} />
                    {v.nome}{v.preco_delta > 0 && ` +${formatBRL(v.preco_delta)}`}
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          {produto.adicionais.length > 0 && (
            <fieldset className="mt-5">
              <legend className="mb-2 font-semibold">Adicionais</legend>
              <div className="space-y-2">
                {produto.adicionais.map((a) => {
                  const on = extras.some((e) => e.id === a.id);
                  return (
                    <label key={a.id} className="flex min-h-11 cursor-pointer items-center justify-between rounded-xl border border-stone-300 px-3">
                      <span className="flex items-center gap-3">
                        <input type="checkbox" checked={on} className="h-5 w-5 accent-[var(--accent)]"
                          onChange={() => setExtras((x) => (on ? x.filter((e) => e.id !== a.id) : [...x, a]))} />
                        {a.nome}
                      </span>
                      <span className="text-sm text-muted">+ {formatBRL(a.preco)}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          )}

          {/* caixa de combinação: qualquer outro item do cardápio */}
          <section className="mt-6 rounded-2xl border border-stone-300 bg-sand/60 p-3" aria-label="Combinação">
            <h3 className="font-semibold">Faça uma combinação</h3>
            <p className="text-xs text-muted">Escolha qualquer outro item do cardápio para vir junto.</p>
            {sugestoes.length > 0 && (
              <p className="mt-2 text-xs text-muted">Combina com: {sugestoes.map((s, i) => (
                <button key={s.id} type="button" onClick={() => alternar(s)} className="font-semibold text-accent underline">{i > 0 && ", "}{s.nome}</button>
              ))}</p>
            )}
            <label htmlFor="catc" className="sr-only">Categoria</label>
            <select id="catc" value={catCombo} onChange={(e) => setCatCombo(e.target.value)} className={`${sel} mt-2 w-full`}>
              <option value="">Todas as categorias</option>
              {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
            <ul className="mt-2 flex gap-2 overflow-x-auto pb-1">
              {candidatos.map((p) => {
                const on = combos.some((c) => c.produto.id === p.id);
                return (
                  <li key={p.id} className="shrink-0">
                    <button type="button" aria-pressed={on} onClick={() => alternar(p)}
                      className={`relative block w-28 overflow-hidden rounded-xl border bg-white text-left ${on ? "border-accent ring-2 ring-accent" : "border-stone-300"}`}>
                      {p.foto_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.foto_url} alt="" className="h-16 w-full object-cover" />
                      )}
                      {on && <span className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-accent text-white"><Check size={14} aria-hidden /></span>}
                      <span className="block p-2 text-xs"><span className="line-clamp-1 font-semibold">{p.nome}</span>{formatBRL(p.preco_atual)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {combos.length > 0 && (
              <ul className="mt-2 space-y-2">
                {combos.map((c, idx) => (
                  <li key={c.produto.id} className="rounded-xl bg-white p-3">
                    <div className="flex items-center justify-between gap-2">
                      <button type="button" onClick={() => onAbrir(c.produto.id)} className="text-left text-sm font-semibold">{c.produto.nome}</button>
                      <span className="flex items-center gap-1 text-sm">{formatBRL(comboUnit(c))}
                        <button type="button" aria-label={`Remover ${c.produto.nome}`} onClick={() => alternar(c.produto)} className="flex h-11 w-11 items-center justify-center text-red-700"><X size={18} aria-hidden /></button>
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {c.produto.variacoes.length > 0 && (
                        <select aria-label={`Tamanho de ${c.produto.nome}`} className={sel} value={c.variacao?.id}
                          onChange={(e) => setCombos((l) => l.map((x, i) => (i === idx ? { ...x, variacao: c.produto.variacoes.find((v) => v.id === e.target.value) ?? null } : x)))}>
                          {c.produto.variacoes.map((v) => <option key={v.id} value={v.id}>{v.nome}</option>)}
                        </select>
                      )}
                      {c.produto.opcoes.map((o) => (
                        <select key={o.nome} aria-label={`${o.nome} de ${c.produto.nome}`} className={sel} value={c.specs[o.nome]}
                          onChange={(e) => setCombos((l) => l.map((x, i) => (i === idx ? { ...x, specs: { ...x.specs, [o.nome]: e.target.value } } : x)))}>
                          {o.escolhas.map((e) => <option key={e}>{e}</option>)}
                        </select>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div className="mt-5">
            <label htmlFor="obs" className="mb-1 block font-semibold">Observação</label>
            <textarea id="obs" value={obs} onChange={(e) => setObs(e.target.value)} maxLength={200} rows={2}
              placeholder="Ex.: pouco leite, bem quente" className="w-full rounded-xl border border-stone-300 p-3" />
          </div>
        </div>

        <div className="flex items-center gap-3 border-t border-sand p-4">
          <div className="flex items-center rounded-full bg-sand">
            <button type="button" aria-label="Diminuir quantidade" onClick={() => setQtd((q) => Math.max(1, q - 1))} className="flex h-11 w-11 items-center justify-center"><Minus size={18} aria-hidden /></button>
            <span className="w-6 text-center font-semibold" aria-live="polite">{qtd}</span>
            <button type="button" aria-label="Aumentar quantidade" onClick={() => setQtd((q) => q + 1)} className="flex h-11 w-11 items-center justify-center"><Plus size={18} aria-hidden /></button>
          </div>
          <button type="button" disabled={produto.esgotado} onClick={adicionar}
            className="h-12 flex-1 rounded-full bg-accent font-semibold text-white disabled:opacity-40">
            Adicionar · {formatBRL(total)}
          </button>
        </div>
      </div>
    </div>
  );
}
