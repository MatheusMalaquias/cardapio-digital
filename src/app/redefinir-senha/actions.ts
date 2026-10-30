"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function salvarSenha(formData: FormData) {
  const senha = String(formData.get("senha") ?? "");
  const confirma = String(formData.get("confirma") ?? "");
  if (senha.length < 8) redirect("/redefinir-senha?erro=curta");
  if (senha !== confirma) redirect("/redefinir-senha?erro=diferente");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/gestao?erro=link");

  const { error } = await supabase.auth.updateUser({ password: senha });
  if (error) redirect("/redefinir-senha?erro=falha");
  redirect("/painel");
}
