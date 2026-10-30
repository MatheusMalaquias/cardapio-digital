"use server";

import { revalidatePath } from "next/cache";
import { randomBytes, randomUUID } from "crypto";
import { requireMembro } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function ctx() {
  const m = await requireMembro();
  if (m.papel !== "dono") throw new Error("Apenas o dono pode fazer isso.");
  return { sb: await createClient(), m };
}
const s = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const n = (f: FormData, k: string) => Number(s(f, k).replace(",", ".")) || 0;
const opt = (f: FormData, k: string) => s(f, k) || null;
const done = () => revalidatePath("/painel/admin", "layout");
const ok = (e: { message: string } | null) => { if (e) throw new Error(e.message); };

async function enviarFoto(sb: Awaited<ReturnType<typeof createClient>>, estId: string, arq: FormDataEntryValue | null) {
  // sem `instanceof File`: o Node 18 não tem File global
  if (typeof arq !== "object" || arq === null || typeof arq.arrayBuffer !== "function" || arq.size === 0) return null;
  if (!arq.type.startsWith("image/") || arq.size > 5 * 1024 * 1024) throw new Error("Envie uma imagem de até 5 MB.");
  const ext = (arq.name.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${estId}/${randomUUID()}.${ext}`;
  const { error } = await sb.storage.from("produtos").upload(path, arq, { contentType: arq.type });
  ok(error);
  return sb.storage.from("produtos").getPublicUrl(path).data.publicUrl;
}

// ---- Categorias
export async function salvarCategoria(f: FormData) {
  const { sb, m } = await ctx();
  const row = { nome: s(f, "nome"), ordem: n(f, "ordem"), disponivel_de: opt(f, "de"), disponivel_ate: opt(f, "ate"), ativo: f.get("ativo") === "on" };
  const id = s(f, "id");
  ok((id ? await sb.from("categorias").update(row).eq("id", id) : await sb.from("categorias").insert({ ...row, estabelecimento_id: m.estabelecimentoId })).error);
  done();
}

// ---- Produtos
export async function salvarProduto(f: FormData) {
  const { sb, m } = await ctx();
  const row: Record<string, unknown> = {
    nome: s(f, "nome"), descricao: opt(f, "descricao"), preco: n(f, "preco"), categoria_id: s(f, "categoria_id"),
    tamanho_descricao: opt(f, "tamanho"), alergenicos: f.getAll("alergenicos").map(String), ordem: n(f, "ordem"),
    ativo: f.get("ativo") === "on", esgotado: f.get("esgotado") === "on",
    ingredientes: s(f, "ingredientes").split(",").map((x) => x.trim()).filter(Boolean),
    preparo: s(f, "preparo").split("\n").map((x) => x.trim()).filter(Boolean),
    opcoes: s(f, "opcoes").split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
      const [nome, resto = ""] = l.split(":");
      return { nome: nome.trim(), escolhas: resto.split("|").map((x) => x.trim()).filter(Boolean) };
    }).filter((o) => o.nome && o.escolhas.length > 0),
  };
  const foto = await enviarFoto(sb, m.estabelecimentoId, f.get("foto"));
  if (foto) row.foto_url = foto;
  const id = s(f, "id");
  ok((id ? await sb.from("produtos").update(row).eq("id", id) : await sb.from("produtos").insert({ ...row, estabelecimento_id: m.estabelecimentoId })).error);
  done();
}
export async function adicionarVariacao(f: FormData) {
  const { sb, m } = await ctx();
  ok((await sb.from("variacoes").insert({ estabelecimento_id: m.estabelecimentoId, produto_id: s(f, "produto_id"), nome: s(f, "nome"), preco_delta: n(f, "valor") })).error);
  done();
}
export async function adicionarAdicional(f: FormData) {
  const { sb, m } = await ctx();
  ok((await sb.from("adicionais").insert({ estabelecimento_id: m.estabelecimentoId, produto_id: s(f, "produto_id"), nome: s(f, "nome"), preco: n(f, "valor") })).error);
  done();
}

// ---- Promoções (datas no fuso de Brasília)
export async function salvarPromocao(f: FormData) {
  const { sb, m } = await ctx();
  const dias = f.getAll("dias").map(Number);
  ok((await sb.from("promocoes").insert({
    estabelecimento_id: m.estabelecimentoId, produto_id: s(f, "produto_id"), titulo: opt(f, "titulo"),
    preco_promocional: n(f, "preco"), inicio: `${s(f, "inicio")}:00-03:00`, fim: `${s(f, "fim")}:00-03:00`,
    hora_de: opt(f, "hora_de"), hora_ate: opt(f, "hora_ate"), dias_semana: dias.length ? dias : null,
  })).error);
  done();
}

// ---- Complementos
export async function adicionarComplemento(f: FormData) {
  const { sb, m } = await ctx();
  if (s(f, "produto_id") === s(f, "sugerido_id")) throw new Error("Escolha produtos diferentes.");
  ok((await sb.from("complementos").insert({ estabelecimento_id: m.estabelecimentoId, produto_id: s(f, "produto_id"), sugerido_id: s(f, "sugerido_id") })).error);
  done();
}

// ---- Mesas
export async function criarMesa(f: FormData) {
  const { sb, m } = await ctx();
  const numero = n(f, "numero");
  ok((await sb.from("mesas").insert({ estabelecimento_id: m.estabelecimentoId, numero, codigo: s(f, "codigo") || `m${numero}-${randomBytes(3).toString("hex")}`, garcom_id: opt(f, "garcom_id") })).error);
  done();
}
export async function atribuirGarcom(f: FormData) {
  const { sb } = await ctx();
  ok((await sb.from("mesas").update({ garcom_id: opt(f, "garcom_id") }).eq("id", s(f, "id"))).error);
  done();
}

// ---- Equipe (cria o usuário com senha provisória; precisa da service role)
export async function convidarMembro(f: FormData) {
  const { m } = await ctx();
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({ email: s(f, "email"), password: s(f, "senha"), email_confirm: true });
  ok(error);
  ok((await admin.from("equipe").insert({ user_id: data.user!.id, estabelecimento_id: m.estabelecimentoId, nome: s(f, "nome"), papel: s(f, "papel") })).error);
  done();
}

// ---- Configurações
export async function salvarConfig(f: FormData) {
  const { sb, m } = await ctx();
  const row: Record<string, unknown> = {
    nome: s(f, "nome"), cor_destaque: s(f, "cor"), texto_beneficio: opt(f, "beneficio"),
    desconto_cadastro_pct: n(f, "desconto"), fidelidade_meta: n(f, "meta"), fidelidade_premio: opt(f, "premio"),
    taxa_servico_pct: n(f, "taxa"), limite_espera_min: n(f, "limite"), politica_privacidade_url: opt(f, "politica"),
    permitir_escolher_mesa: f.get("permitir_mesa") === "on",
  };
  const logo = await enviarFoto(sb, m.estabelecimentoId, f.get("logo"));
  if (logo) row.logo_url = logo;
  ok((await sb.from("estabelecimentos").update(row).eq("id", m.estabelecimentoId)).error);
  done();
}

// ---- Campanhas (apenas cadastro; envio é feito por automação externa)
export async function salvarCampanha(f: FormData) {
  const { sb, m } = await ctx();
  const agendada = s(f, "agendada_para");
  ok((await sb.from("campanhas").insert({
    estabelecimento_id: m.estabelecimentoId, titulo: s(f, "titulo"), mensagem: s(f, "mensagem"), publico: s(f, "publico"),
    dias_ausente: s(f, "publico") === "ausentes" ? n(f, "dias") || 30 : null,
    status: agendada ? "agendada" : "rascunho", agendada_para: agendada ? `${agendada}:00-03:00` : null,
  })).error);
  done();
}

// ---- Exclusão genérica (lista fechada de tabelas; RLS ainda protege)
const TABELAS = ["categorias", "produtos", "variacoes", "adicionais", "promocoes", "complementos", "mesas", "campanhas", "equipe"] as const;
export async function excluir(f: FormData) {
  const { sb, m } = await ctx();
  const t = s(f, "tabela") as (typeof TABELAS)[number];
  if (!TABELAS.includes(t)) throw new Error("Tabela inválida.");
  const id = s(f, "id");
  if (t === "equipe") {
    if (id === m.userId) throw new Error("Você não pode remover a si mesmo.");
    ok((await sb.from("equipe").delete().eq("user_id", id)).error);
  } else {
    ok((await sb.from(t).delete().eq("id", id)).error);
  }
  done();
}
