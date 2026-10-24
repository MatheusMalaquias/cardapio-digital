import { excluir } from "@/app/painel/admin/actions";

export function Excluir({ tabela, id, rotulo = "Excluir" }: { tabela: string; id: string; rotulo?: string }) {
  return (
    <form action={excluir}>
      <input type="hidden" name="tabela" value={tabela} />
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="h-11 rounded-full px-4 text-sm font-medium text-red-700 hover:bg-red-50">{rotulo}</button>
    </form>
  );
}
