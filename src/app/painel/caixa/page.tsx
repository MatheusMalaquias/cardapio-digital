import { requireMembro } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CaixaApp } from "@/components/painel/CaixaApp";

export default async function Page() {
  const m = await requireMembro();
  const sb = await createClient();
  const { data } = await sb.from("estabelecimentos").select("taxa_servico_pct,desconto_cadastro_pct").eq("id", m.estabelecimentoId).single();
  return <CaixaApp taxaPct={Number(data?.taxa_servico_pct ?? 10)} descontoPct={Number(data?.desconto_cadastro_pct ?? 0)} />;
}
