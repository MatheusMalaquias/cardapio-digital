import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Dados = {
  estabelecimento: { nome: string; logo_url: string | null; cor_destaque: string };
  mesas: { numero: number; codigo: string }[];
};

/** Escolha da mesa: o cliente toca no número da mesa em que está. */
export default async function EscolherMesa({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase.rpc("listar_mesas", { p_slug: slug });
  if (!data) notFound();
  const { estabelecimento: est, mesas } = data as Dados;

  return (
    <div className="cliente" style={{ ["--accent" as string]: est.cor_destaque }}>
      <main className="mx-auto flex min-h-dvh max-w-md flex-col px-5 pb-10 pt-12">
        <header className="flex items-center gap-3">
          {est.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={est.logo_url} alt="" className="h-12 w-12 rounded-full object-cover" />
          )}
          <p className="font-display text-xl font-bold">{est.nome}</p>
        </header>

        <h1 className="grad-text mt-10 font-display text-4xl font-bold leading-tight">Em qual mesa você está?</h1>
        <p className="mt-2 text-[var(--muted-dark)]">Toque no número da sua mesa para abrir o cardápio.</p>

        {mesas.length === 0 ? (
          <p className="mt-10 text-[var(--muted-dark)]">Nenhuma mesa disponível no momento.</p>
        ) : (
          <ul className="mt-8 grid grid-cols-3 gap-3" aria-label="Mesas">
            {mesas.map((m) => (
              <li key={m.numero}>
                <Link href={`/${slug}/mesa/${m.codigo}`} aria-label={`Mesa ${m.numero}`}
                  className="cartao flex aspect-square items-center justify-center rounded-3xl font-display text-4xl font-bold transition active:scale-95">
                  {m.numero}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
