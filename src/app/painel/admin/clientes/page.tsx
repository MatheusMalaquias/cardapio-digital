import { createClient } from "@/lib/supabase/server";

export default async function Page() {
  const sb = await createClient();
  const { data } = await sb.from("clientes").select("*").order("ultima_visita", { ascending: false, nullsFirst: false });
  const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString("pt-BR") : "—");
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Clientes ({data?.length ?? 0})</h1>
        <a href="/api/clientes/export" className="flex h-11 items-center rounded-full border border-stone-400 px-5 font-semibold">Exportar CSV</a>
      </div>
      <div className="overflow-x-auto rounded-2xl bg-white">
        <table className="w-full text-left text-sm">
          <thead className="text-muted"><tr><th className="p-3">Nome</th><th>WhatsApp</th><th>Consentimento</th><th>Selos</th><th>Última visita</th></tr></thead>
          <tbody>
            {(data ?? []).map((c) => (
              <tr key={c.id} className="border-t border-sand">
                <td className="p-3 font-medium">{c.nome}</td><td>{c.whatsapp}</td>
                <td>{c.consentimento_em && !c.descadastrado_em ? `Sim (${fmt(c.consentimento_em)})` : "Não"}</td>
                <td>{c.selos}</td><td>{fmt(c.ultima_visita)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
