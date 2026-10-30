"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** Pede o e-mail de redefinição. A resposta é sempre a mesma, exista o e-mail ou não. */
export async function pedirRedefinicao(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (email) {
    const h = await headers();
    const origem = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
    const supabase = await createClient();
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origem}/auth/callback?next=/redefinir-senha`,
    });
  }
  redirect("/gestao/esqueci?enviado=1");
}
