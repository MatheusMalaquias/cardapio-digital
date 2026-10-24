import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatBRL } from "@/lib/format";
import { fmtDuracao } from "@/lib/format";

/* eslint-disable @typescript-eslint/no-explicit-any */
function Barras({ itens, cor = "bg-accent" }: { itens: { rotulo: string; valor: number }[]; cor?: string }) {
  const max = Math.max(1, ...itens.map((i) => i.valor));
  return (
    <ul className="space-y-2">
      {itens.map((i) => (
        <li key={i.rotulo} className="text-sm">
          <div className="flex justify-between"><span>{i.rotulo}</span><span className="font-semibold">{i.valor}</span></div>
          <div className="h-2 rounded-full bg-sand"><div className={`h-2 rounded-full ${cor}`} style={{ width: `${(i.valor / max) * 100}%` }} /></div>
        </li>
      ))}
    </ul>
  );
}
const Card = ({ t, v }: { t: string; v: string | number }) => (
  <div className="rounded-2xl bg-white p-4"><p className="text-sm text-muted">{t}</p><p className="font-display text-2xl font-bold">{v}</p></div>
);

export default async function Page({ searchParams }: { searchParams: Promise<{ dias?: string }> }) {
  const dias = [1, 7, 30].includes(Number((await searchParams).dias)) ? Number((await searchParams).dias) : 7;
  const sb = await createClient();
  const { data, error } = await sb.rpc("metricas", { p_dias: dias });
  if (error || !data) return <p role="alert">Não foi possível carregar as métricas.</p>;
  const d = data as any;
  const horas = d.por_hora as { hora: number; qtd: number }[];
  const maxH = Math.max(1, ...horas.map((h) => h.qtd));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-2xl font-bold">Métricas</h1>
        <nav aria-label="Período" className="flex gap-2">
          {[[1, "Hoje"], [7, "7 dias"], [30, "30 dias"]].map(([v, t]) => (
            <Link key={v} href={`/painel/metricas?dias=${v}`} aria-current={dias === v ? "page" : undefined}
              className={`flex min-h-11 items-center rounded-full px-4 text-sm font-medium ${dias === v ? "bg-accent text-white" : "bg-white"}`}>{t}</Link>
          ))}
        </nav>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card t="Pedidos" v={d.pedidos} />
        <Card t="Faturamento (caixa)" v={formatBRL(d.faturamento)} />
        <Card t="Ticket médio por mesa" v={formatBRL(d.ticket_medio)} />
        <Card t="Comandas fechadas" v={d.comandas_fechadas} />
        <Card t="Até a confirmação" v={fmtDuracao(d.tempo_confirmacao_s)} />
        <Card t="Tempo de preparo" v={fmtDuracao(d.tempo_preparo_s)} />
        <Card t="Atender chamados" v={fmtDuracao(d.tempo_chamado_s)} />
        <Card t="Clientes cadastrados" v={`${d.clientes_total} (${d.clientes_novos} novos, ${d.clientes_voltaram} voltaram)`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl bg-white p-4"><h2 className="mb-3 font-semibold">Mais vendidos</h2>
          <Barras itens={d.mais_vendidos.map((x: any) => ({ rotulo: x.nome, valor: x.qtd }))} /></section>
        <section className="rounded-2xl bg-white p-4"><h2 className="mb-3 font-semibold">Menos vendidos</h2>
          <Barras cor="bg-stone-500" itens={d.menos_vendidos.map((x: any) => ({ rotulo: x.nome, valor: x.qtd }))} /></section>
        <section className="rounded-2xl bg-white p-4"><h2 className="mb-1 font-semibold">Muito visto, pouco pedido</h2>
          <p className="mb-3 text-xs text-muted">Visualizações do produto x unidades pedidas</p>
          <table className="w-full text-sm"><thead className="text-left text-muted"><tr><th>Produto</th><th>Vistas</th><th>Pedidos</th><th>Conversão</th></tr></thead>
            <tbody>{d.visto_pedido.map((x: any) => (
              <tr key={x.nome} className="border-t border-sand"><td className="py-1.5">{x.nome}</td><td>{x.vistas}</td><td>{x.pedidos}</td>
                <td>{x.vistas ? `${Math.round((x.pedidos / x.vistas) * 100)}%` : "—"}</td></tr>))}</tbody></table></section>
        <section className="rounded-2xl bg-white p-4"><h2 className="mb-3 font-semibold">Desempenho por garçom</h2>
          <table className="w-full text-sm"><thead className="text-left text-muted"><tr><th>Garçom</th><th>Pedidos</th><th>Tempo até confirmar</th></tr></thead>
            <tbody>{d.garcons.map((g: any) => (
              <tr key={g.nome} className="border-t border-sand"><td className="py-1.5">{g.nome}</td><td>{g.pedidos}</td><td>{fmtDuracao(g.tempo_confirmacao_s)}</td></tr>))}</tbody></table></section>
      </div>

      <section className="rounded-2xl bg-white p-4">
        <h2 className="mb-3 font-semibold">Pedidos por faixa de horário</h2>
        <div className="flex h-40 items-end gap-1" role="img" aria-label="Gráfico de pedidos por hora do dia">
          {horas.map((h) => (
            <div key={h.hora} className="flex flex-1 flex-col items-center justify-end">
              <span className="text-[10px] text-muted">{h.qtd || ""}</span>
              <div className="w-full rounded-t bg-accent" style={{ height: `${(h.qtd / maxH) * 100}%`, minHeight: h.qtd ? 4 : 1 }} />
            </div>
          ))}
        </div>
        <div className="mt-1 flex gap-1 text-[10px] text-muted">{horas.map((h) => <span key={h.hora} className="flex-1 text-center">{h.hora}</span>)}</div>
      </section>
    </div>
  );
}
