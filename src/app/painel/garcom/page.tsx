import { requireMembro } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { GarcomApp } from "@/components/painel/GarcomApp";

export default async function Page() {
  const m = await requireMembro();
  const sb = await createClient();
  const { data } = await sb.from("estabelecimentos").select("limite_espera_min").eq("id", m.estabelecimentoId).single();
  return <GarcomApp userId={m.userId} limiteMin={data?.limite_espera_min ?? 5} />;
}
