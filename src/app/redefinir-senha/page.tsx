import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { salvarSenha } from "./actions";

const ERROS: Record<string, string> = {
  curta: "A senha precisa ter pelo menos 8 caracteres.",
  diferente: "As duas senhas não são iguais.",
  falha: "Não foi possível salvar a senha. Tente de novo ou peça um novo link.",
};

/** Nova senha: vale para quem veio do link do e-mail e para quem já está logado (alterar senha). */
export default async function RedefinirSenha({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/gestao?erro=link");
  const { erro } = await searchParams;

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4">
      <h1 className="font-display text-3xl font-bold">Nova senha</h1>
      <p className="mt-1 text-sm text-muted">Conta: {user.email}</p>
      {erro && <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{ERROS[erro] ?? "Algo deu errado."}</p>}
      <form action={salvarSenha} className="mt-6 space-y-4">
        <div>
          <label htmlFor="senha" className="mb-1 block text-sm font-medium">Nova senha (mínimo 8 caracteres)</label>
          <input id="senha" name="senha" type="password" required minLength={8} autoComplete="new-password" className="h-11 w-full rounded-xl border border-stone-300 px-3" />
        </div>
        <div>
          <label htmlFor="confirma" className="mb-1 block text-sm font-medium">Repita a nova senha</label>
          <input id="confirma" name="confirma" type="password" required minLength={8} autoComplete="new-password" className="h-11 w-full rounded-xl border border-stone-300 px-3" />
        </div>
        <button type="submit" className="h-11 w-full rounded-full bg-accent font-semibold text-white">Salvar senha</button>
      </form>
    </main>
  );
}
