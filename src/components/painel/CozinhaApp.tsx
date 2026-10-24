"use client";
import { useCallback, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRealtime } from "@/lib/realtime";
import { minutosDesde, useAgora } from "@/lib/tempo";
import { ItensResumo } from "./ItensResumo";
import { Sheet } from "@/components/ui/Sheet";

/* eslint-disable @typescript-eslint/no-explicit-any */
const COLUNAS = [
  { status: "confirmado", titulo: "Confirmados", acao: "Iniciar preparo", proximo: "em_preparo", campo: "confirmado_em" },
  { status: "em_preparo", titulo: "Em preparo", acao: "Marcar pronto", proximo: "pronto", campo: "preparo_em" },
  { status: "pronto", titulo: "Prontos", acao: null, proximo: null, campo: "pronto_em" },
] as const;

export function CozinhaApp() {
  const sb = createClient();
  const agora = useAgora(15000);
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [produtos, setProdutos] = useState<any[] | null>(null);
  const [aberto, setAberto] = useState(false);

  const carregar = useCallback(async () => {
    const { data } = await sb.from("pedidos")
      .select("id,status,confirmado_em,preparo_em,pronto_em,itens_pedido(nome,qtd,variacao,adicionais,especificacoes,observacao),comandas(mesas(numero))")
      .in("status", ["confirmado", "em_preparo", "pronto"]).order("confirmado_em");
    setPedidos(data ?? []);
    const { data: pr } = await sb.from("produtos").select("id,nome,esgotado").order("nome");
    setProdutos(pr ?? []);
  }, [sb]);

  useRealtime(["pedidos", "produtos"], carregar);

  async function mover(id: string, status: string) {
    await sb.from("pedidos").update({ status }).eq("id", id);
    await carregar();
  }
  async function esgotar(id: string, esgotado: boolean) {
    await sb.rpc("marcar_esgotado", { p_produto: id, p_esgotado: esgotado });
    await carregar();
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Cozinha</h1>
        <button type="button" onClick={() => setAberto(true)} className="h-11 rounded-full border border-stone-400 px-5 font-semibold">
          Marcar item esgotado
        </button>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {COLUNAS.map((col) => {
          const lista = pedidos.filter((p) => p.status === col.status);
          return (
            <section key={col.status} aria-label={col.titulo} className="rounded-2xl bg-stone-200/60 p-3">
              <h2 className="mb-3 flex justify-between font-display text-lg font-bold">
                {col.titulo}<span className="rounded-full bg-white px-3 text-sm leading-7">{lista.length}</span>
              </h2>
              <ul className="space-y-3">
                {lista.map((p) => (
                  <li key={p.id} className="rounded-2xl bg-white p-4 shadow-sm">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="font-display text-2xl font-bold">Mesa {p.comandas?.mesas?.numero}</p>
                      <p className="text-sm font-semibold text-muted">{minutosDesde(p[col.campo] ?? p.confirmado_em, agora)} min</p>
                    </div>
                    <ItensResumo itens={p.itens_pedido} claro />
                    {col.acao && (
                      <button type="button" onClick={() => mover(p.id, col.proximo!)}
                        className="mt-3 h-12 w-full rounded-full bg-accent font-semibold text-white">{col.acao}</button>
                    )}
                    {col.status === "pronto" && <p className="mt-3 text-sm text-muted">Aguardando o garçom levar.</p>}
                  </li>
                ))}
                {lista.length === 0 && <li className="py-6 text-center text-sm text-muted">Vazio</li>}
              </ul>
            </section>
          );
        })}
      </div>

      {aberto && produtos && (
        <Sheet titulo="Itens esgotados" onClose={() => setAberto(false)}>
          <ul className="space-y-2">
            {produtos.map((p) => (
              <li key={p.id} className="flex items-center justify-between rounded-xl border border-stone-300 px-3 py-2">
                <span className={p.esgotado ? "text-muted line-through" : ""}>{p.nome}</span>
                <button type="button" onClick={() => esgotar(p.id, !p.esgotado)}
                  className={`h-11 rounded-full px-4 text-sm font-semibold ${p.esgotado ? "bg-green-700 text-white" : "border border-stone-400"}`}>
                  {p.esgotado ? "Voltar ao cardápio" : "Esgotado"}
                </button>
              </li>
            ))}
          </ul>
        </Sheet>
      )}
    </div>
  );
}
