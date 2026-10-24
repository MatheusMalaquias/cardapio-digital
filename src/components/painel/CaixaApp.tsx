"use client";
import { useCallback, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRealtime } from "@/lib/realtime";
import { formatBRL } from "@/lib/format";
import { mensagemErro } from "@/lib/erros";
import { ItensResumo } from "./ItensResumo";

/* eslint-disable @typescript-eslint/no-explicit-any */
const FORMAS = [["dinheiro", "Dinheiro"], ["pix", "PIX"], ["debito", "Débito"], ["credito", "Crédito"]] as const;
const r2 = (n: number) => Math.round(n * 100) / 100;

export function CaixaApp({ taxaPct, descontoPct }: { taxaPct: number; descontoPct: number }) {
  const sb = createClient();
  const [comandas, setComandas] = useState<any[]>([]);
  const [busca, setBusca] = useState("");
  const [selId, setSelId] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  const carregar = useCallback(async () => {
    const { data } = await sb.from("comandas")
      .select("id,status,aberta_em,cliente_id,clientes(nome),mesas(numero),pedidos(id,status,clientes(nome),itens_pedido(nome,qtd,preco_unitario,variacao,adicionais,especificacoes,observacao))")
      .neq("status", "fechada").order("aberta_em");
    setComandas(data ?? []);
  }, [sb]);
  useRealtime(["comandas", "pedidos", "chamados"], carregar);

  const filtradas = comandas.filter((c) => {
    const q = busca.trim().toLowerCase();
    if (!q) return true;
    return String(c.mesas?.numero) === q || c.clientes?.nome?.toLowerCase().includes(q)
      || c.pedidos.some((p: any) => p.clientes?.nome?.toLowerCase().includes(q));
  });
  const sel = comandas.find((c) => c.id === selId);

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <section aria-label="Comandas abertas">
        <h1 className="font-display text-2xl font-bold">Caixa</h1>
        <div className="relative mt-3">
          <Search size={18} className="absolute left-3 top-3.5 text-muted" aria-hidden />
          <label htmlFor="busca" className="sr-only">Buscar por mesa ou nome</label>
          <input id="busca" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Mesa ou nome do cliente"
            className="h-11 w-full rounded-full border border-stone-300 pl-10 pr-4" />
        </div>
        <ul className="mt-3 space-y-2">
          {filtradas.map((c) => {
            const total = c.pedidos.filter((p: any) => p.status !== "recusado")
              .reduce((s: number, p: any) => s + p.itens_pedido.reduce((a: number, i: any) => a + i.qtd * i.preco_unitario, 0), 0);
            return (
              <li key={c.id}>
                <button type="button" onClick={() => { setSelId(c.id); setMsg(""); }}
                  className={`w-full rounded-2xl border p-3 text-left ${selId === c.id ? "border-accent bg-white" : "border-stone-300 bg-white/70"}`}>
                  <span className="flex justify-between">
                    <span className="font-display text-lg font-bold">Mesa {c.mesas?.numero}</span>
                    <span className="font-semibold">{formatBRL(total)}</span>
                  </span>
                  <span className="flex justify-between text-sm text-muted">
                    <span>{c.clientes?.nome ?? "Sem cadastro"}</span>
                    {c.status === "conta_pedida" && <span className="font-semibold text-accent">Pediu a conta</span>}
                  </span>
                </button>
              </li>
            );
          })}
          {filtradas.length === 0 && <li className="py-6 text-center text-sm text-muted">Nenhuma comanda aberta.</li>}
        </ul>
      </section>

      <section aria-label="Detalhe da comanda">
        {msg && <p role="status" className="mb-3 rounded-xl bg-green-100 px-4 py-3 text-green-900">{msg}</p>}
        {sel ? <Detalhe key={sel.id} c={sel} taxaPct={taxaPct} descontoPct={descontoPct}
                 onFechada={(m) => { setMsg(m); setSelId(null); carregar(); }} sb={sb} />
              : <p className="rounded-2xl bg-white p-8 text-center text-muted">Selecione uma comanda para conferir e fechar.</p>}
      </section>
    </div>
  );
}

function Detalhe({ c, taxaPct, descontoPct, onFechada, sb }: { c: any; taxaPct: number; descontoPct: number; onFechada: (m: string) => void; sb: ReturnType<typeof createClient> }) {
  const pedidos = c.pedidos.filter((p: any) => p.status !== "recusado");
  const itens = pedidos.flatMap((p: any) => p.itens_pedido.map((i: any, k: number) => ({ ...i, id: p.id + k, quem: p.clientes?.nome })));
  const subtotal = r2(itens.reduce((s: number, i: any) => s + i.qtd * i.preco_unitario, 0));
  const [desconto, setDesconto] = useState(c.cliente_id ? r2(subtotal * descontoPct / 100) : 0);
  const [cobrarTaxa, setCobrarTaxa] = useState(true);
  const taxa = cobrarTaxa ? r2((subtotal - desconto) * taxaPct / 100) : 0;
  const total = r2(subtotal - desconto + taxa);
  const [pags, setPags] = useState<{ forma: string; valor: number }[]>([{ forma: "pix", valor: total }]);
  const [partes, setPartes] = useState(2);
  const [marcados, setMarcados] = useState<string[]>([]);
  const [erro, setErro] = useState("");
  const [fechando, setFechando] = useState(false);

  const soma = r2(pags.reduce((s, p) => s + (Number(p.valor) || 0), 0));
  const subMarcados = useMemo(() => itens.filter((i: any) => marcados.includes(i.id)).reduce((s: number, i: any) => s + i.qtd * i.preco_unitario, 0), [itens, marcados]);
  const fator = subtotal > 0 ? total / subtotal : 0;

  async function fechar() {
    setErro(""); setFechando(true);
    const { error } = await sb.rpc("fechar_comanda", { p_comanda: c.id, p_desconto: desconto, p_taxa: taxa, p_pagamentos: pags });
    setFechando(false);
    if (error) return setErro(mensagemErro(error));
    onFechada(`Mesa ${c.mesas?.numero} fechada: ${formatBRL(total)}. Mesa liberada.`);
  }

  return (
    <div className="rounded-2xl bg-white p-4">
      <h2 className="font-display text-2xl font-bold">Mesa {c.mesas?.numero}</h2>
      <p className="text-sm text-muted">{c.clientes?.nome ? `Cliente: ${c.clientes.nome}` : "Cliente sem cadastro"}</p>

      <ul className="mt-4 divide-y divide-sand">
        {itens.map((i: any) => (
          <li key={i.id} className="flex items-start gap-3 py-2">
            <input type="checkbox" aria-label={`Selecionar ${i.nome} para dividir`} checked={marcados.includes(i.id)}
              onChange={() => setMarcados((m) => (m.includes(i.id) ? m.filter((x) => x !== i.id) : [...m, i.id]))}
              className="mt-1 h-5 w-5 accent-[var(--accent)]" />
            <div className="flex-1">
              <ItensResumo itens={[i]} claro />
              <p className="text-xs text-muted">Pedido por: {i.quem ?? "mesa"}</p>
            </div>
            <p className="font-medium">{formatBRL(i.qtd * i.preco_unitario)}</p>
          </li>
        ))}
        {itens.length === 0 && <li className="py-4 text-muted">Sem itens.</li>}
      </ul>

      <dl className="mt-4 space-y-2">
        <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatBRL(subtotal)}</dd></div>
        <div className="flex items-center justify-between gap-3">
          <dt><label htmlFor="desc">Desconto (R$){c.cliente_id && ` · cadastro ${descontoPct}%`}</label></dt>
          <dd><input id="desc" type="number" min={0} max={subtotal} step="0.01" value={desconto}
            onChange={(e) => { setDesconto(Math.min(subtotal, Math.max(0, Number(e.target.value)))); }}
            className="h-11 w-28 rounded-xl border border-stone-300 px-3 text-right" /></dd>
        </div>
        <div className="flex items-center justify-between">
          <dt><label className="flex items-center gap-2"><input type="checkbox" checked={cobrarTaxa} onChange={(e) => setCobrarTaxa(e.target.checked)} className="h-5 w-5 accent-[var(--accent)]" />Taxa de serviço ({taxaPct}%)</label></dt>
          <dd>{formatBRL(taxa)}</dd>
        </div>
        <div className="flex justify-between border-t border-sand pt-2 text-xl font-bold"><dt>Total</dt><dd>{formatBRL(total)}</dd></div>
      </dl>

      <div className="mt-4 rounded-xl bg-sand p-3 text-sm">
        <p className="font-semibold">Dividir a conta</p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2">Partes iguais:
            <input type="number" min={2} max={20} value={partes} onChange={(e) => setPartes(Math.max(2, Number(e.target.value)))} className="h-11 w-16 rounded-xl border border-stone-300 px-2" />
          </label>
          <span>= <strong>{formatBRL(total / partes)}</strong> por pessoa</span>
        </div>
        {marcados.length > 0 && <p className="mt-2">Itens marcados: <strong>{formatBRL(subMarcados * fator)}</strong> (com desconto e taxa proporcionais)</p>}
      </div>

      <div className="mt-4">
        <p className="font-semibold">Pagamento</p>
        {pags.map((p, k) => (
          <div key={k} className="mt-2 flex gap-2">
            <label className="sr-only" htmlFor={`f${k}`}>Forma</label>
            <select id={`f${k}`} value={p.forma} onChange={(e) => setPags((l) => l.map((x, j) => (j === k ? { ...x, forma: e.target.value } : x)))}
              className="h-11 flex-1 rounded-xl border border-stone-300 px-3">
              {FORMAS.map(([v, n]) => <option key={v} value={v}>{n}</option>)}
            </select>
            <label className="sr-only" htmlFor={`v${k}`}>Valor</label>
            <input id={`v${k}`} type="number" step="0.01" min={0} value={p.valor} onChange={(e) => setPags((l) => l.map((x, j) => (j === k ? { ...x, valor: Number(e.target.value) } : x)))}
              className="h-11 w-28 rounded-xl border border-stone-300 px-3 text-right" />
            {pags.length > 1 && <button type="button" onClick={() => setPags((l) => l.filter((_, j) => j !== k))} className="h-11 rounded-full px-3 text-sm text-red-700">Remover</button>}
          </div>
        ))}
        <button type="button" onClick={() => setPags((l) => [...l, { forma: "dinheiro", valor: r2(Math.max(0, total - soma)) }])} className="mt-2 h-11 rounded-full border border-stone-300 px-4 text-sm font-medium">Adicionar forma de pagamento</button>
        <button type="button" onClick={() => setPags([{ forma: pags[0]?.forma ?? "pix", valor: total }])} className="ml-2 mt-2 h-11 rounded-full px-4 text-sm text-muted underline">Ajustar ao total</button>
        <p className={`mt-2 text-sm ${Math.abs(soma - total) > 0.009 ? "text-red-700" : "text-green-800"}`}>
          Soma: {formatBRL(soma)} {Math.abs(soma - total) > 0.009 ? `(diferença ${formatBRL(total - soma)})` : "(confere)"}
        </p>
      </div>

      {erro && <p role="alert" className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-red-800">{erro}</p>}
      <button type="button" disabled={fechando || itens.length === 0 || Math.abs(soma - total) > 0.009} onClick={fechar}
        className="mt-4 h-12 w-full rounded-full bg-accent font-semibold text-white disabled:opacity-40">
        {fechando ? "Fechando..." : `Fechar comanda · ${formatBRL(total)}`}
      </button>
    </div>
  );
}
