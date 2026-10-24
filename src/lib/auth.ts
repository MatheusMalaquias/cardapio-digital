import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Papel } from "@/lib/papeis";

export type Membro = {
  userId: string;
  nome: string;
  papel: Papel;
  estabelecimentoId: string;
  estabelecimentoNome: string;
};

/** Retorna o membro da equipe logado ou manda para o login. */
export async function requireMembro(): Promise<Membro> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data } = await supabase
    .from("equipe")
    .select("nome, papel, estabelecimento_id, estabelecimentos(nome)")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!data) redirect("/login?erro=sem_acesso");
  const est = data.estabelecimentos as unknown as { nome: string } | null;
  return {
    userId: user.id,
    nome: data.nome,
    papel: data.papel as Papel,
    estabelecimentoId: data.estabelecimento_id,
    estabelecimentoNome: est?.nome ?? "",
  };
}
