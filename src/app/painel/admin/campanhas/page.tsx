import { createClient } from "@/lib/supabase/server";
import { salvarCampanha } from "../actions";
import { Excluir } from "@/components/admin/Excluir";
import { btn, Campo, inp } from "@/components/admin/campos";

const PUBLICOS = { todos: "Todos com consentimento", ausentes: "Quem não volta há X dias", aniversariantes: "Aniversariantes do mês" } as const;

export default async function Page() {
  const sb = await createClient();
  const [{ data: camps }, { data: clientes }] = await Promise.all([
    sb.from("campanhas").select("*").order("criado_em", { ascending: false }),
    sb.from("clientes").select("aniversario,ultima_visita").not("consentimento_em", "is", null).is("descadastrado_em", null),
  ]);
  const alcance = (c: { publico: keyof typeof PUBLICOS; dias_ausente: number | null }) => {
    const lista = clientes ?? [];
    if (c.publico === "todos") return lista.length;
    if (c.publico === "aniversariantes") {
      const mes = new Date().getMonth() + 1;
      return lista.filter((x) => x.aniversario && Number(x.aniversario.slice(5, 7)) === mes).length;
    }
    const lim = Date.now() - (c.dias_ausente ?? 30) * 86400000;
    return lista.filter((x) => !x.ultima_visita || new Date(x.ultima_visita).getTime() < lim).length;
  };
  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold">Campanhas de WhatsApp</h1>
      <p className="rounded-xl bg-white p-3 text-sm text-muted">Aqui você só cadastra a campanha. O envio será feito depois por uma automação externa que lê esta lista.</p>
      <ul className="space-y-2">
        {(camps ?? []).map((c) => (
          <li key={c.id} className="rounded-2xl bg-white p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold">{c.titulo} <span className="ml-2 rounded-full bg-sand px-2 py-0.5 text-xs">{c.status}</span></p>
                <p className="text-sm text-muted">{PUBLICOS[c.publico as keyof typeof PUBLICOS]}{c.publico === "ausentes" && ` (${c.dias_ausente} dias)`} · atingiria <strong>{alcance(c)}</strong> clientes</p>
                <p className="mt-1 text-sm">{c.mensagem}</p>
              </div>
              <Excluir tabela="campanhas" id={c.id} />
            </div>
          </li>
        ))}
      </ul>
      <form action={salvarCampanha} className="grid gap-3 rounded-2xl bg-white p-4 sm:grid-cols-6">
        <h2 className="font-semibold sm:col-span-6">Nova campanha</h2>
        <Campo rotulo="Título" className="sm:col-span-3"><input name="titulo" required className={inp} /></Campo>
        <Campo rotulo="Público" className="sm:col-span-2"><select name="publico" className={inp}>{Object.entries(PUBLICOS).map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select></Campo>
        <Campo rotulo="Dias ausente"><input name="dias" type="number" min="1" defaultValue={30} className={inp} /></Campo>
        <Campo rotulo="Mensagem" className="sm:col-span-6"><textarea name="mensagem" required rows={3} className="w-full rounded-xl border border-stone-300 p-3" /></Campo>
        <Campo rotulo="Agendar para (vazio = rascunho)" className="sm:col-span-3"><input name="agendada_para" type="datetime-local" className={inp} /></Campo>
        <button className={`${btn} self-end sm:col-span-2`}>Salvar campanha</button>
      </form>
    </div>
  );
}
