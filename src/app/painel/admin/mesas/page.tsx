import { headers } from "next/headers";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/server";
import { requireMembro } from "@/lib/auth";
import { atribuirGarcom, criarMesa } from "../actions";
import { Excluir } from "@/components/admin/Excluir";
import { ImprimirBtn } from "@/components/admin/ImprimirBtn";
import { btn, Campo, inp } from "@/components/admin/campos";

export default async function Page() {
  const m = await requireMembro();
  const sb = await createClient();
  const h = await headers();
  const origem = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const [{ data: est }, { data: mesas }, { data: garcons }] = await Promise.all([
    sb.from("estabelecimentos").select("slug").eq("id", m.estabelecimentoId).single(),
    sb.from("mesas").select("*").order("numero"),
    sb.from("equipe").select("user_id,nome").eq("papel", "garcom"),
  ]);
  const itens = await Promise.all((mesas ?? []).map(async (x) => {
    const url = `${origem}/${est!.slug}/mesa/${x.codigo}`;
    return { ...x, url, qr: await QRCode.toString(url, { type: "svg", margin: 1, width: 160 }) };
  }));
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between print:hidden">
        <h1 className="font-display text-2xl font-bold">Mesas e QR codes</h1><ImprimirBtn />
      </div>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 print:grid-cols-3">
        {itens.map((x) => (
          <li key={x.id} className="rounded-2xl bg-white p-4 text-center">
            <p className="font-display text-xl font-bold">Mesa {x.numero}</p>
            <div className="mx-auto my-2 w-40" dangerouslySetInnerHTML={{ __html: x.qr }} aria-label={`QR code da mesa ${x.numero}`} role="img" />
            <a href={x.url} className="break-all text-xs text-accent underline">{x.url}</a>
            <form action={atribuirGarcom} className="mt-3 flex gap-2 print:hidden">
              <input type="hidden" name="id" value={x.id} />
              <select name="garcom_id" defaultValue={x.garcom_id ?? ""} aria-label={`Garçom da mesa ${x.numero}`} className={inp}>
                <option value="">Sem garçom</option>
                {(garcons ?? []).map((g) => <option key={g.user_id} value={g.user_id}>{g.nome}</option>)}
              </select>
              <button className="h-11 rounded-full border border-stone-400 px-4 text-sm font-semibold">Salvar</button>
            </form>
            <div className="print:hidden"><Excluir tabela="mesas" id={x.id} /></div>
          </li>
        ))}
      </ul>
      <form action={criarMesa} className="grid gap-3 rounded-2xl bg-white p-4 sm:grid-cols-5 print:hidden">
        <Campo rotulo="Número"><input name="numero" type="number" min="1" required className={inp} /></Campo>
        <Campo rotulo="Código do link (opcional)"><input name="codigo" placeholder="mesa11" pattern="[a-z0-9-]+" className={inp} /></Campo>
        <Campo rotulo="Garçom" className="sm:col-span-2"><select name="garcom_id" className={inp}><option value="">Sem garçom</option>{(garcons ?? []).map((g) => <option key={g.user_id} value={g.user_id}>{g.nome}</option>)}</select></Campo>
        <button className={`${btn} self-end`}>Criar mesa</button>
      </form>
    </div>
  );
}
