import Link from "next/link";
import { entrar } from "./actions";

const ERROS: Record<string, string> = {
  credenciais: "E-mail ou senha incorretos.",
  sem_acesso: "Este usuário não faz parte de nenhuma equipe.",
  link: "Este link de redefinição expirou ou já foi usado. Peça um novo.",
};

export default async function LoginPage({
  searchParams,
}: { searchParams: Promise<{ erro?: string; next?: string }> }) {
  const { erro, next } = await searchParams;
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4">
      <h1 className="font-display text-3xl font-bold">Acesso da equipe</h1>
      <p className="mt-1 text-sm text-muted">Dono, gerente, garçom, cozinha e caixa.</p>
      {erro && (
        <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
          {ERROS[erro] ?? "Não foi possível entrar."}
        </p>
      )}
      <form action={entrar} className="mt-6 space-y-4">
        <input type="hidden" name="next" value={next ?? ""} />
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium">E-mail</label>
          <input id="email" name="email" type="email" required autoComplete="email"
            className="h-11 w-full rounded-xl border border-stone-300 px-3" />
        </div>
        <div>
          <label htmlFor="senha" className="mb-1 block text-sm font-medium">Senha</label>
          <input id="senha" name="senha" type="password" required autoComplete="current-password"
            className="h-11 w-full rounded-xl border border-stone-300 px-3" />
        </div>
        <button type="submit"
          className="h-11 w-full rounded-full bg-accent font-semibold text-white">
          Entrar
        </button>
        <p className="text-center text-sm">
          <Link href="/gestao/esqueci" className="text-accent underline">Esqueci minha senha</Link>
        </p>
      </form>
    </main>
  );
}
