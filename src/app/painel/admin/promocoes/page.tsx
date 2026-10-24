import { createClient } from "@/lib/supabase/server";
import { salvarPromocao } from "../actions";
import { Excluir } from "@/components/admin/Excluir";
import { btn, Campo, inp } from "@/components/admin/campos";
import { formatBRL } from "@/lib/format";

const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default async function Page() {
  const sb = await createClient();
  const [{ data: prods }, { data: promos }] = await Promise.all([
    sb.from("produtos").select("id,nome").order("nome"),
    sb.from("promocoes").select("*, produtos(nome)").order("inicio", { ascending: false }),
  ]);
  const fmt = (d: string) => new Date(d).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" });
  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold">Promoções</h1>
      <ul className="space-y-2">
        {(promos ?? []).map((p) => (
          <li key={p.id} className="flex items-center justify-between gap-2 rounded-2xl bg-white p-4">
            <div>
              <p className="font-semibold">{(p.produtos as unknown as { nome: string })?.nome} por {formatBRL(p.preco_promocional)}</p>
              <p className="text-sm text-muted">{p.titulo && `${p.titulo} · `}{fmt(p.inicio)} até {fmt(p.fim)}
                {p.hora_de && ` · das ${p.hora_de.slice(0, 5)} às ${p.hora_ate?.slice(0, 5)}`}
                {p.dias_semana && ` · ${p.dias_semana.map((d: number) => DIAS[d]).join(", ")}`}</p>
            </div>
            <Excluir tabela="promocoes" id={p.id} />
          </li>
        ))}
        {(promos ?? []).length === 0 && <li className="text-muted">Nenhuma promoção cadastrada.</li>}
      </ul>
      <form action={salvarPromocao} className="grid gap-3 rounded-2xl bg-white p-4 sm:grid-cols-6">
        <h2 className="font-semibold sm:col-span-6">Nova promoção</h2>
        <Campo rotulo="Produto" className="sm:col-span-3"><select name="produto_id" className={inp}>{(prods ?? []).map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}</select></Campo>
        <Campo rotulo="Preço promocional (R$)" className="sm:col-span-2"><input name="preco" type="number" step="0.01" min="0" required className={inp} /></Campo>
        <Campo rotulo="Título (opcional)" className="sm:col-span-3"><input name="titulo" className={inp} /></Campo>
        <Campo rotulo="Início" className="sm:col-span-2"><input name="inicio" type="datetime-local" required className={inp} /></Campo>
        <Campo rotulo="Fim" className="sm:col-span-2"><input name="fim" type="datetime-local" required className={inp} /></Campo>
        <Campo rotulo="Janela: das (opcional)"><input name="hora_de" type="time" className={inp} /></Campo>
        <Campo rotulo="às"><input name="hora_ate" type="time" className={inp} /></Campo>
        <fieldset className="flex flex-wrap items-end gap-3 pb-2 sm:col-span-6">
          <legend className="mb-1 text-sm font-medium">Dias da semana (vazio = todos)</legend>
          {DIAS.map((d, i) => <label key={d} className="flex items-center gap-1 text-sm"><input type="checkbox" name="dias" value={i} className="h-5 w-5" />{d}</label>)}
        </fieldset>
        <button className={btn}>Criar promoção</button>
      </form>
    </div>
  );
}
