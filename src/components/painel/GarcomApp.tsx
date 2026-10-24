"use client";
import { useCallback, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { tocarBip, useRealtime } from "@/lib/realtime";
import { minutosDesde, useAgora } from "@/lib/tempo";
import { fmtDuracao } from "@/lib/format";
import { ItensResumo } from "./ItensResumo";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Linha = { id: string; kind: "chamado" | "conta" | "pendente" | "pronto"; mesa: number; desde: string; dados: any };
const TITULO = { chamado: "Chamando", conta: "Pediu a conta", pendente: "Pedido para confirmar", pronto: "Pronto para levar" } as const;

export function GarcomApp({ userId, limiteMin }: { userId: string; limiteMin: number }) {
  const sb = createClient();
  const agora = useAgora(10000);
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [resumo, setResumo] = useState({ esperando: 0, preparo: 0, medio: null as number | null });
  const [som, setSom] = useState(false);
  const [recusando, setRecusando] = useState<string | null>(null);
  const [motivo, setMotivo] = useState("");
  const anterior = useRef(0);

  const carregar = useCallback(async () => {
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    const [ped, cha, atendidos] = await Promise.all([
      sb.from("pedidos").select("id,status,criado_em,pronto_em,garcom_id,itens_pedido(nome,qtd,variacao,adicionais,especificacoes,observacao),comandas(mesas(numero)),clientes(nome)")
        .in("status", ["pendente", "confirmado", "em_preparo", "pronto"]),
      sb.from("chamados").select("id,tipo,criado_em,a_caminho_em,garcom_id,mesas(numero)").is("atendido_em", null),
      sb.from("chamados").select("criado_em,atendido_em").gte("criado_em", hoje.toISOString()).not("atendido_em", "is", null),
    ]);
    const l: Linha[] = [];
    (cha.data ?? []).forEach((c: any) => l.push({ id: c.id, kind: c.tipo === "conta" ? "conta" : "chamado", mesa: c.mesas?.numero, desde: c.criado_em, dados: c }));
    (ped.data ?? []).forEach((p: any) => {
      const mesa = p.comandas?.mesas?.numero;
      if (p.status === "pendente") l.push({ id: p.id, kind: "pendente", mesa, desde: p.criado_em, dados: p });
      if (p.status === "pronto") l.push({ id: p.id, kind: "pronto", mesa, desde: p.pronto_em ?? p.criado_em, dados: p });
    });
    l.sort((a, b) => new Date(a.desde).getTime() - new Date(b.desde).getTime());
    const tempos = (atendidos.data ?? []).map((c: any) => (new Date(c.atendido_em).getTime() - new Date(c.criado_em).getTime()) / 1000);
    setResumo({
      esperando: l.length,
      preparo: (ped.data ?? []).filter((p: any) => ["confirmado", "em_preparo"].includes(p.status)).length,
      medio: tempos.length ? tempos.reduce((a, b) => a + b, 0) / tempos.length : null,
    });
    if (l.length > anterior.current && anterior.current >= 0) setSom((s) => (s && tocarBip(), s));
    anterior.current = l.length;
    setLinhas(l);
  }, [sb]);

  useRealtime(["pedidos", "chamados"], carregar);

  const agir = async (fn: () => PromiseLike<{ error: unknown }>) => { await fn(); await carregar(); };
  const hoje = () => new Date().toISOString();

  return (
    <div className="-m-4 min-h-[calc(100dvh-64px)] bg-stone-950 p-4 text-stone-100">
      <div className="mx-auto max-w-lg">
        <div className="grid grid-cols-3 gap-2 text-center">
          {[["Esperando", resumo.esperando], ["Em preparo", resumo.preparo], ["Atend. médio", fmtDuracao(resumo.medio)]].map(([t, v]) => (
            <div key={String(t)} className="rounded-2xl bg-stone-900 p-3">
              <p className="font-display text-xl font-bold">{v}</p>
              <p className="text-xs text-stone-400">{t}</p>
            </div>
          ))}
        </div>
        <button type="button" onClick={() => setSom((s) => !s)} aria-pressed={som}
          className="mt-3 flex h-11 items-center gap-2 rounded-full bg-stone-800 px-4 text-sm">
          {som ? <Volume2 size={18} aria-hidden /> : <VolumeX size={18} aria-hidden />} Aviso sonoro: {som ? "ligado" : "desligado"}
        </button>

        <ul className="mt-4 space-y-3">
          {linhas.length === 0 && <li className="rounded-2xl bg-stone-900 p-6 text-center text-stone-400">Tudo em dia. Nenhuma pendência.</li>}
          {linhas.map((l) => {
            const min = minutosDesde(l.desde, agora);
            const atrasado = min >= limiteMin;
            const d = l.dados;
            return (
              <li key={l.kind + l.id} className={`rounded-2xl border-2 p-4 ${atrasado ? "border-red-500 bg-red-950/40" : "border-stone-800 bg-stone-900"}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-stone-400">{TITULO[l.kind]}</p>
                    <p className="font-display text-2xl font-bold">Mesa {l.mesa}</p>
                    {d.clientes?.nome && <p className="text-sm text-stone-400">{d.clientes.nome}</p>}
                  </div>
                  <p className={`rounded-full px-3 py-1 text-sm font-semibold ${atrasado ? "bg-red-600 text-white" : "bg-stone-800"}`}>{min} min</p>
                </div>
                {d.itens_pedido && <div className="mt-2"><ItensResumo itens={d.itens_pedido} /></div>}

                <div className="mt-3 flex flex-wrap gap-2">
                  {(l.kind === "chamado" || l.kind === "conta") && (
                    <>
                      {!d.a_caminho_em && (
                        <button type="button" className="h-11 rounded-full bg-stone-700 px-5 font-semibold"
                          onClick={() => agir(() => sb.from("chamados").update({ a_caminho_em: hoje(), garcom_id: userId }).eq("id", l.id))}>
                          Estou indo
                        </button>
                      )}
                      <button type="button" className="h-11 rounded-full bg-green-600 px-5 font-semibold text-white"
                        onClick={() => agir(() => sb.from("chamados").update({ atendido_em: hoje(), garcom_id: userId }).eq("id", l.id))}>
                        Atendido
                      </button>
                    </>
                  )}
                  {l.kind === "pendente" && (recusando === l.id ? (
                    <div className="flex w-full gap-2">
                      <label htmlFor={`m-${l.id}`} className="sr-only">Motivo da recusa</label>
                      <input id={`m-${l.id}`} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Motivo da recusa"
                        className="h-11 min-w-0 flex-1 rounded-full bg-stone-800 px-4" />
                      <button type="button" disabled={!motivo.trim()} className="h-11 rounded-full bg-red-600 px-4 font-semibold disabled:opacity-40"
                        onClick={() => { const m = motivo.trim(); setRecusando(null); setMotivo(""); agir(() => sb.from("pedidos").update({ status: "recusado", motivo_recusa: m, garcom_id: userId }).eq("id", l.id)); }}>
                        Recusar
                      </button>
                    </div>
                  ) : (
                    <>
                      <button type="button" className="h-11 rounded-full bg-green-600 px-5 font-semibold text-white"
                        onClick={() => agir(() => sb.from("pedidos").update({ status: "confirmado", garcom_id: userId }).eq("id", l.id))}>
                        Confirmar
                      </button>
                      <button type="button" className="h-11 rounded-full bg-stone-700 px-5 font-semibold" onClick={() => setRecusando(l.id)}>Recusar</button>
                    </>
                  ))}
                  {l.kind === "pronto" && (
                    <button type="button" className="h-11 rounded-full bg-green-600 px-5 font-semibold text-white"
                      onClick={() => agir(() => sb.from("pedidos").update({ status: "entregue" }).eq("id", l.id))}>
                      Marcar entregue
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
