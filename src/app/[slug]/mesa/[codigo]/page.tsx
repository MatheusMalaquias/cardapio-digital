import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ClienteApp } from "@/components/cliente/ClienteApp";
import type { Cardapio } from "@/types";

export const dynamic = "force-dynamic";

export default async function MesaPage({
  params,
}: { params: Promise<{ slug: string; codigo: string }> }) {
  const { slug, codigo } = await params;
  const supabase = await createClient();
  const { data } = await supabase.rpc("obter_cardapio", { p_slug: slug, p_codigo: codigo });
  if (!data) notFound();
  return <ClienteApp cardapio={data as Cardapio} />;
}
