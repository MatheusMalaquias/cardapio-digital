import { createClient } from "@/lib/supabase/server";
import { adicionarComplemento } from "../actions";
import { Excluir } from "@/components/admin/Excluir";
import { btn, Campo, inp } from "@/components/admin/campos";

export default async function Page() {
  const sb = await createClient();
  const [{ data: prods }, { data: comps }] = await Promise.all([
    sb.from("produtos").select("id,nome").order("nome"),
    sb.from("complementos").select("id, produto:produtos!complementos_produto_id_fkey(nome), sugerido:produtos!complementos_sugerido_id_fkey(nome)"),
  ]);
  const nome = (x: unknown) => (x as { nome: string } | null)?.nome;
  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold">Combina com</h1>
      <p className="text-sm text-muted">Quem pede o produto A vê o produto B como sugestão.</p>
      <ul className="space-y-2">
        {(comps ?? []).map((c) => (
          <li key={c.id} className="flex items-center justify-between rounded-2xl bg-white p-4">
            <span><strong>{nome(c.produto)}</strong> → {nome(c.sugerido)}</span><Excluir tabela="complementos" id={c.id} />
          </li>
        ))}
      </ul>
      <form action={adicionarComplemento} className="grid gap-3 rounded-2xl bg-white p-4 sm:grid-cols-5">
        <Campo rotulo="Quando pedir" className="sm:col-span-2"><select name="produto_id" className={inp}>{(prods ?? []).map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}</select></Campo>
        <Campo rotulo="Sugerir" className="sm:col-span-2"><select name="sugerido_id" className={inp}>{(prods ?? []).map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}</select></Campo>
        <button className={`${btn} self-end`}>Adicionar</button>
      </form>
    </div>
  );
}
