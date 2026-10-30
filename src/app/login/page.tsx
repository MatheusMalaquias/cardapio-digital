import { redirect } from "next/navigation";

/** Endereço antigo: mantém favoritos funcionando. */
export default function Page() {
  redirect("/gestao");
}
