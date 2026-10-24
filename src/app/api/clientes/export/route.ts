import { requireMembro } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

export async function GET() {
  const m = await requireMembro();
  if (m.papel !== "dono") return new Response("Acesso negado", { status: 403 });
  const sb = await createClient();
  const { data } = await sb.from("clientes").select("*").order("nome");
  const linhas = [["nome", "whatsapp", "aniversario", "consentimento_em", "descadastrado_em", "selos", "ultima_visita"].join(",")];
  (data ?? []).forEach((c) => linhas.push([c.nome, c.whatsapp, c.aniversario, c.consentimento_em, c.descadastrado_em, c.selos, c.ultima_visita].map(esc).join(",")));
  return new Response("﻿" + linhas.join("\n"), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="clientes.csv"' },
  });
}
