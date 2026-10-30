import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

const DESTINOS_PERMITIDOS = ["/redefinir-senha"];

/** Recebe o link do e-mail, troca o código por uma sessão e leva à tela de nova senha. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "";
  const destino = DESTINOS_PERMITIDOS.includes(next) ? next : "/gestao";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${destino}`);
  }
  return NextResponse.redirect(`${origin}/gestao?erro=link`);
}
