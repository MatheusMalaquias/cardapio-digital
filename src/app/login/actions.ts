"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { HOME_POR_PAPEL, type Papel } from "@/lib/papeis";

export async function entrar(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const senha = String(formData.get("senha") ?? "");
  const next = String(formData.get("next") ?? "");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha });
  if (error || !data.user) redirect("/login?erro=credenciais");

  const { data: membro } = await supabase
    .from("equipe").select("papel").eq("user_id", data.user.id).maybeSingle();
  if (!membro) {
    await supabase.auth.signOut();
    redirect("/login?erro=sem_acesso");
  }
  const destino = next.startsWith("/painel") ? next : HOME_POR_PAPEL[membro.papel as Papel];
  redirect(destino);
}

export async function sair() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
