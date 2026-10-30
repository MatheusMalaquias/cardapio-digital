import Link from "next/link";
import { pedirRedefinicao } from "./actions";

export default async function EsqueciPage({ searchParams }: { searchParams: Promise<{ enviado?: string }> }) {
  const { enviado } = await searchParams;
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4">
      <h1 className="font-display text-3xl font-bold">Esqueci minha senha</h1>
      {enviado ? (
        <div role="status" className="mt-4 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-900">
          Se este e-mail tiver acesso, você vai receber um link para criar uma nova senha. Confira também a caixa de spam.
        </div>
      ) : (
        <>
          <p className="mt-1 text-sm text-muted">Informe o e-mail do seu acesso. Enviaremos um link para criar uma nova senha.</p>
          <form action={pedirRedefinicao} className="mt-6 space-y-4">
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium">E-mail</label>
              <input id="email" name="email" type="email" required autoComplete="email" className="h-11 w-full rounded-xl border border-stone-300 px-3" />
            </div>
            <button type="submit" className="h-11 w-full rounded-full bg-accent font-semibold text-white">Enviar link</button>
          </form>
        </>
      )}
      <p className="mt-6 text-center text-sm"><Link href="/gestao" className="text-accent underline">Voltar ao login</Link></p>
    </main>
  );
}
