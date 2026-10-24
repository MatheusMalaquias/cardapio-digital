"use client";
import { useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { createClient } from "@/lib/supabase/client";
import { mensagemErro } from "@/lib/erros";
import type { Cardapio, Perfil } from "@/types";

export function PerfilSheet({
  cardapio, sessao, perfil, onSalvo, onClose,
}: { cardapio: Cardapio; sessao: string; perfil: Perfil | null; onSalvo: (p: Perfil) => void; onClose: () => void }) {
  const est = cardapio.estabelecimento;
  const [nome, setNome] = useState(perfil?.nome ?? "");
  const [zap, setZap] = useState(perfil?.whatsapp ?? "");
  const [aniv, setAniv] = useState(perfil?.aniversario ?? "");
  const [aceito, setAceito] = useState(false);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(""); setSalvando(true);
    const { data, error } = await createClient().rpc("salvar_perfil", {
      p_slug: est.slug, p_codigo: cardapio.mesa.codigo, p_sessao: sessao,
      p_nome: nome, p_whatsapp: zap, p_aniversario: aniv || null, p_consentimento: aceito,
    });
    setSalvando(false);
    if (error) return setErro(mensagemErro(error));
    onSalvo(data as Perfil);
  }

  const meta = est.fidelidade_meta;
  return (
    <Sheet titulo={perfil ? "Meu perfil" : "Criar perfil"} onClose={onClose}>
      {est.texto_beneficio && (
        <p className="rounded-xl bg-sand p-3 text-sm"><strong>Benefício:</strong> {est.texto_beneficio}</p>
      )}
      {perfil && (
        <div className="mt-3 rounded-xl border border-stone-300 p-3">
          <p className="text-sm font-semibold">Cartão fidelidade</p>
          <div className="mt-2 flex flex-wrap gap-1.5" aria-label={`${perfil.selos} de ${meta} selos`}>
            {Array.from({ length: meta }).map((_, i) => (
              <span key={i} className={`h-6 w-6 rounded-full border ${i < perfil.selos ? "border-accent bg-accent" : "border-stone-300"}`} />
            ))}
          </div>
          <p className="mt-2 text-xs text-muted">{perfil.selos} de {meta} selos{est.fidelidade_premio && ` · ${est.fidelidade_premio}`}</p>
        </div>
      )}
      <form onSubmit={salvar} className="mt-4 space-y-4">
        <div>
          <label htmlFor="nome" className="mb-1 block text-sm font-medium">Nome</label>
          <input id="nome" required value={nome} onChange={(e) => setNome(e.target.value)} autoComplete="name"
            className="h-11 w-full rounded-xl border border-stone-300 px-3" />
        </div>
        <div>
          <label htmlFor="zap" className="mb-1 block text-sm font-medium">WhatsApp</label>
          <input id="zap" required value={zap} onChange={(e) => setZap(e.target.value)} inputMode="tel"
            placeholder="(11) 98888-7777" autoComplete="tel" className="h-11 w-full rounded-xl border border-stone-300 px-3" />
        </div>
        <div>
          <label htmlFor="aniv" className="mb-1 block text-sm font-medium">Aniversário (opcional)</label>
          <input id="aniv" type="date" value={aniv} onChange={(e) => setAniv(e.target.value)}
            className="h-11 w-full rounded-xl border border-stone-300 px-3" />
        </div>
        <label className="flex cursor-pointer items-start gap-3 text-sm">
          <input type="checkbox" checked={aceito} onChange={(e) => setAceito(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--accent)]" />
          <span>
            Aceito receber promoções de {est.nome} pelo WhatsApp. Posso sair quando quiser respondendo SAIR.{" "}
            <a href={est.politica_privacidade_url ?? "#"} target="_blank" rel="noreferrer" className="text-accent underline">Política de privacidade</a>
          </span>
        </label>
        {erro && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">{erro}</p>}
        <button type="submit" disabled={salvando} className="h-11 w-full rounded-full bg-accent font-semibold text-white disabled:opacity-50">
          {salvando ? "Salvando..." : "Salvar perfil"}
        </button>
      </form>
    </Sheet>
  );
}
