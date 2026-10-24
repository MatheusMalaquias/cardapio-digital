"use client";
import { Minus, Plus, Trash2, Receipt, User } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { formatBRL } from "@/lib/format";
import type { ComandaMesa, ItemCarrinho, Perfil, Produto, StatusPedido } from "@/types";

const ROTULO: Record<StatusPedido, { t: string; cor: string }> = {
  pendente: { t: "Aguardando o garçom", cor: "bg-amber-100 text-amber-900" },
  confirmado: { t: "Confirmado", cor: "bg-blue-100 text-blue-900" },
  em_preparo: { t: "Em preparo", cor: "bg-orange-100 text-orange-900" },
  pronto: { t: "Pronto, a caminho", cor: "bg-green-100 text-green-900" },
  entregue: { t: "Entregue", cor: "bg-stone-200 text-stone-800" },
  recusado: { t: "Recusado", cor: "bg-red-100 text-red-900" },
};

export function ComandaSheet({
  carrinho, setQtd, remover, comanda, enviando, onEnviar, onConta, onPerfil, perfil, beneficio, sugestoes, onAbrir, onClose, erro,
}: {
  carrinho: ItemCarrinho[]; setQtd: (key: string, q: number) => void; remover: (key: string) => void;
  comanda: ComandaMesa | null; enviando: boolean; onEnviar: () => void; onConta: () => void;
  onPerfil: () => void; perfil: Perfil | null; beneficio: string | null; sugestoes: Produto[];
  onAbrir: (id: string) => void; onClose: () => void; erro: string;
}) {
  const totalCarrinho = carrinho.reduce((s, i) => s + i.unit * i.qtd, 0);
  const contaPedida = comanda?.comanda?.status === "conta_pedida" || comanda?.chamados.some((c) => c.tipo === "conta");

  return (
    <Sheet titulo="Comanda da mesa" onClose={onClose}
      rodape={
        <div className="space-y-2">
          {carrinho.length > 0 && (
            <button type="button" onClick={onEnviar} disabled={enviando}
              className="h-11 w-full rounded-full bg-accent font-semibold text-white disabled:opacity-50">
              {enviando ? "Enviando..." : `Enviar pedido ao garçom · ${formatBRL(totalCarrinho)}`}
            </button>
          )}
          <button type="button" onClick={onConta} disabled={!!contaPedida || !comanda?.comanda}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-full border border-stone-300 font-semibold disabled:opacity-40">
            <Receipt size={18} aria-hidden /> {contaPedida ? "Conta pedida, o garçom já vem" : "Pedir a conta"}
          </button>
        </div>
      }>
      {erro && <p role="alert" className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">{erro}</p>}

      <section>
        <h3 className="font-semibold">A enviar agora</h3>
        {carrinho.length === 0 ? (
          <p className="mt-1 text-sm text-muted">Nada na comanda. Escolha itens no cardápio.</p>
        ) : (
          <ul className="mt-2 space-y-3">
            {carrinho.map((i) => (
              <li key={i.key} className="rounded-xl border border-stone-300 p-3">
                <div className="flex justify-between gap-2">
                  <p className="font-medium">{i.nome}</p>
                  <p className="font-medium">{formatBRL(i.unit * i.qtd)}</p>
                </div>
                <p className="text-xs text-muted">
                  {[i.variacao?.nome, ...Object.entries(i.especificacoes).map(([k, v]) => `${k}: ${v}`), ...i.adicionais.map((a) => a.nome), i.observacao && `Obs: ${i.observacao}`].filter(Boolean).join(" · ")}
                </p>
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-center rounded-full bg-sand">
                    <button type="button" aria-label={`Diminuir ${i.nome}`} onClick={() => setQtd(i.key, i.qtd - 1)} className="flex h-11 w-11 items-center justify-center"><Minus size={18} aria-hidden /></button>
                    <span className="w-6 text-center font-semibold">{i.qtd}</span>
                    <button type="button" aria-label={`Aumentar ${i.nome}`} onClick={() => setQtd(i.key, i.qtd + 1)} className="flex h-11 w-11 items-center justify-center"><Plus size={18} aria-hidden /></button>
                  </div>
                  <button type="button" aria-label={`Remover ${i.nome}`} onClick={() => remover(i.key)} className="flex h-11 w-11 items-center justify-center text-red-700"><Trash2 size={20} aria-hidden /></button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {sugestoes.length > 0 && (
        <section className="mt-5">
          <h3 className="mb-2 font-semibold">Combina com</h3>
          <div className="flex gap-2 overflow-x-auto">
            {sugestoes.map((s) => (
              <button key={s.id} type="button" onClick={() => onAbrir(s.id)} className="min-h-11 shrink-0 rounded-full border border-stone-300 px-4 text-sm">
                {s.nome} · {formatBRL(s.preco_atual)}
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="mt-6">
        <h3 className="font-semibold">Já pedido nesta mesa</h3>
        {!comanda || comanda.pedidos.length === 0 ? (
          <p className="mt-1 text-sm text-muted">Nenhum pedido enviado ainda.</p>
        ) : (
          <ul className="mt-2 space-y-3">
            {comanda.pedidos.map((p) => (
              <li key={p.id} className="rounded-xl border border-stone-300 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${ROTULO[p.status].cor}`}>{ROTULO[p.status].t}</span>
                  <span className="text-xs text-muted">{p.cliente_nome ?? (p.meu ? "Você" : "Mesa")}</span>
                </div>
                {p.status === "recusado" && p.motivo_recusa && <p className="mt-1 text-sm text-red-800">Motivo: {p.motivo_recusa}</p>}
                <ul className="mt-2 text-sm">
                  {p.itens.map((i, k) => (
                    <li key={k} className="flex justify-between gap-2">
                      <span>{i.qtd}x {i.nome}{i.variacao && ` (${i.variacao.nome})`}{i.especificacoes && Object.keys(i.especificacoes).length > 0 && <span className="block text-xs text-muted">{Object.values(i.especificacoes).join(" · ")}</span>}</span>
                      <span className={p.status === "recusado" ? "line-through text-muted" : ""}>{formatBRL(i.qtd * i.preco_unitario)}</span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-4 flex justify-between text-lg font-bold">
          <span>Total da mesa</span><span>{formatBRL((comanda?.total ?? 0) + totalCarrinho)}</span>
        </p>
        <p className="text-xs text-muted">O pagamento é feito no caixa, ao final.</p>
      </section>

      <button type="button" onClick={onPerfil}
        className="mt-5 flex w-full items-center gap-3 rounded-xl bg-sand p-3 text-left">
        <User size={20} aria-hidden />
        <span className="text-sm">
          {perfil ? <>Olá, <strong>{perfil.nome}</strong>. Ver meu cartão fidelidade ({perfil.selos} selos)</>
                  : <><strong>Crie seu perfil</strong>{beneficio && ` — ${beneficio}`}</>}
        </span>
      </button>
    </Sheet>
  );
}
