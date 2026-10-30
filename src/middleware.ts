import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { ACESSO, HOME_POR_PAPEL, type Papel } from "@/lib/papeis";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(list) {
          list.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  // getUser valida o token no servidor (não confie em getSession aqui)
  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/gestao";
    url.search = `?next=${encodeURIComponent(path)}`;
    return NextResponse.redirect(url);
  }

  const { data: membro } = await supabase.from("equipe").select("papel").eq("user_id", user.id).maybeSingle();
  const papel = membro?.papel as Papel | undefined;

  if (!papel) {
    const url = request.nextUrl.clone();
    url.pathname = "/gestao";
    url.search = "?erro=sem_acesso";
    return NextResponse.redirect(url);
  }

  const regra = ACESSO.find((r) => path === r.prefixo || path.startsWith(r.prefixo + "/"));
  if (!regra) {
    // /painel puro: manda para a tela do papel
    if (path === "/painel" || path === "/painel/") {
      return NextResponse.redirect(new URL(HOME_POR_PAPEL[papel], request.url));
    }
    return response;
  }
  if (!regra.papeis.includes(papel)) {
    return NextResponse.redirect(new URL(HOME_POR_PAPEL[papel], request.url));
  }
  return response;
}

export const config = { matcher: ["/painel/:path*"] };
