import { createClient } from "@/lib/supabase/server";
import { requireMembro } from "@/lib/auth";
import { salvarConfig } from "../actions";
import { btn, Campo, inp } from "@/components/admin/campos";

export default async function Page() {
  const m = await requireMembro();
  const sb = await createClient();
  const { data: e } = await sb.from("estabelecimentos").select("*").eq("id", m.estabelecimentoId).single();
  if (!e) return null;
  return (
    <form action={salvarConfig} className="grid gap-3 rounded-2xl bg-white p-4 sm:grid-cols-6">
      <h1 className="font-display text-2xl font-bold sm:col-span-6">Configurações</h1>
      <Campo rotulo="Nome do estabelecimento" className="sm:col-span-4"><input name="nome" defaultValue={e.nome} required className={inp} /></Campo>
      <Campo rotulo="Cor de destaque" className="sm:col-span-2"><input name="cor" type="color" defaultValue={e.cor_destaque} className={`${inp} p-1`} /></Campo>
      <Campo rotulo="Logo" className="sm:col-span-6"><input name="logo" type="file" accept="image/*" className="w-full text-sm" /></Campo>
      <Campo rotulo="Texto do benefício de cadastro" className="sm:col-span-6"><input name="beneficio" defaultValue={e.texto_beneficio ?? ""} className={inp} /></Campo>
      <Campo rotulo="Desconto do cliente cadastrado (%)" className="sm:col-span-2"><input name="desconto" type="number" step="0.01" min="0" max="100" defaultValue={e.desconto_cadastro_pct} className={inp} /></Campo>
      <Campo rotulo="Fidelidade: selos para o prêmio" className="sm:col-span-2"><input name="meta" type="number" min="1" defaultValue={e.fidelidade_meta} className={inp} /></Campo>
      <Campo rotulo="Prêmio" className="sm:col-span-2"><input name="premio" defaultValue={e.fidelidade_premio ?? ""} className={inp} /></Campo>
      <Campo rotulo="Taxa de serviço (%)" className="sm:col-span-2"><input name="taxa" type="number" step="0.01" min="0" defaultValue={e.taxa_servico_pct} className={inp} /></Campo>
      <Campo rotulo="Limite de espera (min)" className="sm:col-span-2"><input name="limite" type="number" min="1" defaultValue={e.limite_espera_min} className={inp} /></Campo>
      <Campo rotulo="URL da política de privacidade" className="sm:col-span-2"><input name="politica" type="url" defaultValue={e.politica_privacidade_url ?? ""} className={inp} /></Campo>
      <button className={`${btn} sm:col-span-2`}>Salvar configurações</button>
    </form>
  );
}
