import Link from "next/link";
import { requireMembro } from "@/lib/auth";
import { ACESSO, NOME_PAPEL } from "@/lib/papeis";
import { sair } from "@/app/login/actions";
import { LogOut } from "lucide-react";

const ROTULOS: Record<string, string> = {
  "/painel/garcom": "Garçom", "/painel/cozinha": "Cozinha", "/painel/caixa": "Caixa",
  "/painel/metricas": "Métricas", "/painel/admin": "Admin",
};

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  const membro = await requireMembro();
  const links = ACESSO.filter((a) => a.papeis.includes(membro.papel));
  return (
    <div className="min-h-dvh bg-sand">
      <header className="bg-ink text-white">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="font-display text-lg font-semibold leading-tight">{membro.estabelecimentoNome}</p>
            <p className="text-xs text-stone-300">{membro.nome} · {NOME_PAPEL[membro.papel]}</p>
          </div>
          <form action={sair}>
            <button type="submit" aria-label="Sair" className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-white/10">
              <LogOut size={20} aria-hidden />
            </button>
          </form>
        </div>
        {links.length > 1 && (
          <nav aria-label="Áreas do painel" className="flex gap-2 overflow-x-auto px-4 pb-3">
            {links.map((l) => (
              <Link key={l.prefixo} href={l.prefixo} className="flex min-h-11 shrink-0 items-center rounded-full bg-white/10 px-4 text-sm font-medium hover:bg-white/20">
                {ROTULOS[l.prefixo]}
              </Link>
            ))}
          </nav>
        )}
      </header>
      <main className="p-4">{children}</main>
    </div>
  );
}
