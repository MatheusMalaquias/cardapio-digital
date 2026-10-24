import { createClient } from "@/lib/supabase/server";
import { salvarCategoria } from "../actions";
import { Excluir } from "@/components/admin/Excluir";
import { btn, Campo, inp } from "@/components/admin/campos";

export default async function Page() {
  const sb = await createClient();
  const { data: cats } = await sb.from("categorias").select("*").order("ordem");
  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold">Categorias</h1>
      <p className="text-sm text-muted">Defina horários de disponibilidade (ex.: café da manhã até 11h). Vazio = o dia todo.</p>
      {(cats ?? []).map((c) => (
        <div key={c.id} className="rounded-2xl bg-white p-4">
          <form action={salvarCategoria} className="grid gap-3 sm:grid-cols-6">
            <input type="hidden" name="id" value={c.id} />
            <Campo rotulo="Nome" className="sm:col-span-2"><input name="nome" defaultValue={c.nome} required className={inp} /></Campo>
            <Campo rotulo="Ordem"><input name="ordem" type="number" defaultValue={c.ordem} className={inp} /></Campo>
            <Campo rotulo="Disponível de"><input name="de" type="time" defaultValue={c.disponivel_de?.slice(0, 5) ?? ""} className={inp} /></Campo>
            <Campo rotulo="até"><input name="ate" type="time" defaultValue={c.disponivel_ate?.slice(0, 5) ?? ""} className={inp} /></Campo>
            <label className="flex items-end gap-2 pb-3 text-sm"><input type="checkbox" name="ativo" defaultChecked={c.ativo} className="h-5 w-5" />Ativa</label>
            <button className={btn}>Salvar</button>
          </form>
          <Excluir tabela="categorias" id={c.id} />
        </div>
      ))}
      <form action={salvarCategoria} className="grid gap-3 rounded-2xl bg-white p-4 sm:grid-cols-6">
        <h2 className="font-semibold sm:col-span-6">Nova categoria</h2>
        <Campo rotulo="Nome" className="sm:col-span-2"><input name="nome" required className={inp} /></Campo>
        <Campo rotulo="Ordem"><input name="ordem" type="number" defaultValue={0} className={inp} /></Campo>
        <Campo rotulo="Disponível de"><input name="de" type="time" className={inp} /></Campo>
        <Campo rotulo="até"><input name="ate" type="time" className={inp} /></Campo>
        <input type="hidden" name="ativo" value="on" />
        <button className={btn}>Criar</button>
      </form>
    </div>
  );
}
