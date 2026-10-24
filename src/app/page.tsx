import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <h1 className="font-display text-3xl font-bold">Cardápio Digital</h1>
      <p className="mt-2 text-muted">Ambiente de desenvolvimento.</p>
      <div className="mt-8 flex flex-col gap-3">
        <Link href="/cafe-exemplo/mesa/mesa1"
          className="flex h-11 items-center justify-center rounded-full bg-accent font-semibold text-white">
          Abrir cardápio da mesa 1
        </Link>
        <Link href="/login"
          className="flex h-11 items-center justify-center rounded-full border border-stone-300 font-semibold">
          Entrar como equipe
        </Link>
      </div>
    </main>
  );
}
