import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

/** Saúde do deploy: mostra se as variáveis chegaram e se o banco responde. Nunca devolve valores. */
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const env = {
    NEXT_PUBLIC_SUPABASE_URL: !!url,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: !!anon,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
  // só nomes (nunca valores): ajuda a achar variável com nome digitado errado
  const nomesParecidos = Object.keys(process.env).filter((k) => /SUPABASE/i.test(k)).sort();

  let db = false;
  if (url && anon) {
    try {
      const { error } = await createClient(url, anon).from("estabelecimentos").select("id").limit(1);
      db = !error;
    } catch {
      db = false;
    }
  }
  const ok = Object.values(env).every(Boolean) && db;
  return NextResponse.json({ ok, env, db, nomesParecidos }, { status: ok ? 200 : 503 });
}
