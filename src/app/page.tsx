import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Página inicial pública. Com um único café cadastrado, leva direto à escolha da mesa.
 * Com vários, não lista nenhum: o cliente chega pelo link/QR/tag da mesa ou do café.
 */
export default async function Home() {
  const supabase = await createClient();
  const { data } = await supabase.from("estabelecimentos").select("slug").limit(2);
  if (data?.length === 1) redirect(`/${data[0].slug}`);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-6 text-center">
      <h1 className="font-display text-3xl font-bold">Cardápio digital</h1>
      <p className="mt-3 text-muted">
        {data?.length ? "Aproxime o celular da tag da sua mesa ou leia o QR code para abrir o cardápio." : "Nenhum café cadastrado ainda."}
      </p>
    </main>
  );
}
