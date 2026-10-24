import { createClient } from "@/lib/supabase/server";
import { convidarMembro } from "../actions";
import { Excluir } from "@/components/admin/Excluir";
import { btn, Campo, inp } from "@/components/admin/campos";
import { NOME_PAPEL, type Papel } from "@/lib/papeis";

export default async function Page() {
  const sb = await createClient();
  const { data } = await sb.from("equipe").select("user_id,nome,papel").order("nome");
  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold">Equipe</h1>
      <ul className="space-y-2">
        {(data ?? []).map((e) => (
          <li key={e.user_id} className="flex items-center justify-between rounded-2xl bg-white p-4">
            <span><strong>{e.nome}</strong> · {NOME_PAPEL[e.papel as Papel]}</span><Excluir tabela="equipe" id={e.user_id} rotulo="Remover" />
          </li>
        ))}
      </ul>
      <form action={convidarMembro} className="grid gap-3 rounded-2xl bg-white p-4 sm:grid-cols-5">
        <h2 className="font-semibold sm:col-span-5">Adicionar membro</h2>
        <Campo rotulo="Nome"><input name="nome" required className={inp} /></Campo>
        <Campo rotulo="E-mail"><input name="email" type="email" required className={inp} /></Campo>
        <Campo rotulo="Senha provisória"><input name="senha" type="text" minLength={8} required className={inp} /></Campo>
        <Campo rotulo="Papel"><select name="papel" className={inp}>{(Object.keys(NOME_PAPEL) as Papel[]).map((p) => <option key={p} value={p}>{NOME_PAPEL[p]}</option>)}</select></Campo>
        <button className={`${btn} self-end`}>Adicionar</button>
        <p className="text-xs text-muted sm:col-span-5">Informe a senha provisória ao funcionário por um canal seguro.</p>
      </form>
    </div>
  );
}
