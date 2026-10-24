"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BellRing, ShoppingBag, SlidersHorizontal } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getSessaoId } from "@/lib/sessao";
import { mensagemErro } from "@/lib/erros";
import { formatBRL } from "@/lib/format";
import type { Cardapio, ComandaMesa, ItemCarrinho, Perfil } from "@/types";
import { ProdutoSheet } from "./ProdutoSheet";
import { ComandaSheet } from "./ComandaSheet";
import { PerfilSheet } from "./PerfilSheet";
import { Fundo } from "./Fundo";
import { Hero } from "./Hero";
import { CenaProduto } from "./CenaProduto";

const ALERGENOS: { id: string; nome: string }[] = [
  { id: "sem_gluten", nome: "Sem glúten" },
  { id: "sem_lactose", nome: "Sem lactose" },
  { id: "vegano", nome: "Vegano" },
];

export function ClienteApp({ cardapio }: { cardapio: Cardapio }) {
  const est = cardapio.estabelecimento;
  const chaveCarrinho = `carrinho:${est.slug}:${cardapio.mesa.codigo}`;
  const sb = useMemo(() => createClient(), []);
  const [sessao, setSessao] = useState("");
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([]);
  const [produtoAberto, setProdutoAberto] = useState<string | null>(null);
  const [view, setView] = useState<"menu" | "comanda" | "perfil">("menu");
  const [comanda, setComanda] = useState<ComandaMesa | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [filtros, setFiltros] = useState<string[]>([]);
  const [aviso, setAviso] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);
  const [emMenu, setEmMenu] = useState(false);
  const [iniciou, setIniciou] = useState(false);
  const [catAtiva, setCatAtiva] = useState("");
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const avisoTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const todos = useMemo(() => cardapio.categorias.flatMap((c) => c.produtos), [cardapio]);
  const mostrar = useCallback((m: string) => {
    setAviso(m);
    clearTimeout(avisoTimer.current);
    avisoTimer.current = setTimeout(() => setAviso(""), 3500);
  }, []);

  const carregarComanda = useCallback(async (s: string) => {
    const { data } = await sb.rpc("obter_comanda", { p_slug: est.slug, p_codigo: cardapio.mesa.codigo, p_sessao: s });
    if (data) setComanda(data as ComandaMesa);
  }, [sb, est.slug, cardapio.mesa.codigo]);

  const evento = useCallback((tipo: string, produto: string | null = null) => {
    if (!sessao) return;
    void sb.rpc("registrar_evento", { p_slug: est.slug, p_sessao: sessao, p_tipo: tipo, p_produto: produto });
  }, [sb, est.slug, sessao]);

  // Inicialização: sessão anônima, carrinho salvo, perfil, comanda
  useEffect(() => {
    const s = getSessaoId();
    setSessao(s);
    try { setCarrinho(JSON.parse(localStorage.getItem(chaveCarrinho) ?? "[]")); } catch { /* ignora */ }
    void carregarComanda(s);
    void sb.rpc("obter_perfil", { p_slug: est.slug, p_sessao: s }).then(({ data }) => data && setPerfil(data as Perfil));
    void sb.rpc("registrar_evento", { p_slug: est.slug, p_sessao: s, p_tipo: "abriu_cardapio", p_produto: null });
  }, [sb, est.slug, chaveCarrinho, carregarComanda]);

  useEffect(() => {
    try { localStorage.setItem(chaveCarrinho, JSON.stringify(carrinho)); } catch { /* ignora */ }
  }, [carrinho, chaveCarrinho]);

  // Status ao vivo: consulta a cada 4 s (mais lento quando a comanda está fechada)
  useEffect(() => {
    if (!sessao) return;
    const t = setInterval(() => carregarComanda(sessao), view === "comanda" ? 4000 : 8000);
    return () => clearInterval(t);
  }, [sessao, view, carregarComanda]);

  const totalCarrinho = carrinho.reduce((s, i) => s + i.unit * i.qtd, 0);
  const qtdCarrinho = carrinho.reduce((s, i) => s + i.qtd, 0);
  const totalMesa = (comanda?.total ?? 0) + totalCarrinho;

  function abrirProduto(id: string) { setProdutoAberto(id); evento("viu_produto", id); }

  function adicionar(itens: Omit<ItemCarrinho, "key">[]) {
    setCarrinho((c) => {
      let lista = c;
      for (const i of itens) {
        const chave = `${i.produto_id}|${i.variacao?.id ?? ""}|${i.adicionais.map((a) => a.id).sort().join(",")}|${JSON.stringify(i.especificacoes)}|${i.observacao}`;
        const ex = lista.find((x) => x.key === chave);
        lista = ex ? lista.map((x) => (x.key === chave ? { ...x, qtd: x.qtd + i.qtd } : x)) : [...lista, { ...i, key: chave }];
      }
      return lista;
    });
    itens.forEach((i) => evento("adicionou", i.produto_id));
    setProdutoAberto(null);
    mostrar(itens.length > 1 ? `${itens[0].nome} e mais ${itens.length - 1} adicionados` : `${itens[0].nome} adicionado à comanda`);
  }

  async function enviarPedido() {
    setErro(""); setEnviando(true);
    const itens = carrinho.map((i) => ({
      produto_id: i.produto_id, qtd: i.qtd, variacao_id: i.variacao?.id ?? null,
      adicionais_ids: i.adicionais.map((a) => a.id), observacao: i.observacao, especificacoes: i.especificacoes,
    }));
    const { error } = await sb.rpc("enviar_pedido", { p_slug: est.slug, p_codigo: cardapio.mesa.codigo, p_sessao: sessao, p_itens: itens });
    setEnviando(false);
    if (error) return setErro(mensagemErro(error));
    setCarrinho([]);
    await carregarComanda(sessao);
    mostrar("Pedido enviado! Aguarde a confirmação do garçom.");
  }

  async function chamar(tipo: "garcom" | "conta") {
    const { error } = await sb.rpc("criar_chamado", { p_slug: est.slug, p_codigo: cardapio.mesa.codigo, p_sessao: sessao, p_tipo: tipo });
    if (error) return mostrar(mensagemErro(error));
    await carregarComanda(sessao);
    mostrar(tipo === "garcom" ? "Garçom chamado. Já está a caminho." : "Conta solicitada. O garçom já vem.");
  }

  // Movimento ligado ao scroll: escreve variáveis CSS (sem re-render) + parallax das fotos + revelação dos cards
  useEffect(() => {
    const el = raiz.current!;
    const reduzir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0, dentro = false, ini = false;
    const atualiza = () => {
      raf = 0;
      const hero = document.getElementById("hero");
      const vh = window.innerHeight, sy = window.scrollY;
      const alvo = hero ? hero.offsetHeight - vh : 1;
      const p = reduzir ? 1 : Math.min(1, Math.max(0, sy / Math.max(1, alvo)));
      const doc = document.documentElement;
      el.style.setProperty("--p", p.toFixed(4));
      el.style.setProperty("--sp", (sy / Math.max(1, doc.scrollHeight - vh)).toFixed(4));
      if (p > 0.2 !== ini) { ini = p > 0.2; if (ini) setIniciou(true); }
      const m = p >= 0.98;
      if (m !== dentro) { dentro = m; setEmMenu(m); }
      let ativa = "";
      el.querySelectorAll<HTMLElement>("[data-cat]").forEach((n) => { if (n.getBoundingClientRect().top <= 140) ativa = n.dataset.cat!; });
      setCatAtiva((a) => (a === ativa ? a : ativa));
      if (!reduzir) {
        el.querySelectorAll<HTMLElement>("[data-cena]").forEach((n) => {
          const r = n.getBoundingClientRect();
          if (r.bottom < -50 || r.top > vh + 50) return;
          const c = Math.min(1, Math.max(0, (vh - r.top) / (vh + r.height)));
          n.style.setProperty("--c", c.toFixed(3));
        });
        el.querySelectorAll<HTMLElement>("[data-parallax]").forEach((n) => {
          const r = n.getBoundingClientRect();
          if (r.bottom < -50 || r.top > vh + 50) return;
          n.style.setProperty("--py", `${((r.top + r.height / 2 - vh / 2) * -0.1).toFixed(1)}px`);
        });
      }
    };
    const pedir = () => { if (!raf) raf = requestAnimationFrame(atualiza); };
    window.addEventListener("scroll", pedir, { passive: true });
    window.addEventListener("resize", pedir);
    atualiza();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("scroll", pedir); window.removeEventListener("resize", pedir); };
  }, []);

  useEffect(() => {
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => { if (e.isIntersecting) { (e.target as HTMLElement).dataset.in = "1"; io.unobserve(e.target); } }),
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" },
    );
    raiz.current?.querySelectorAll(".rv").forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, [filtros, cardapio]);

  useEffect(() => {
    if (!catAtiva) return;
    document.getElementById(`tab-${catAtiva}`)?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [catAtiva]);

  function verCardapio() {
    document.getElementById("menu")?.scrollIntoView({ behavior: "smooth" });
  }

  const chamandoGarcom = comanda?.chamados.some((c) => c.tipo === "garcom");
  const visiveis = (p: { alergenicos: string[] }) => filtros.every((f) => p.alergenicos.includes(f));
  const aberto = todos.find((p) => p.id === produtoAberto);
  const sugestoesCarrinho = useMemo(() => {
    const noCarrinho = new Set(carrinho.map((i) => i.produto_id));
    const ids = new Set(carrinho.flatMap((i) => todos.find((p) => p.id === i.produto_id)?.complementos ?? []));
    return todos.filter((p) => ids.has(p.id) && !noCarrinho.has(p.id) && !p.esgotado);
  }, [carrinho, todos]);

  return (
    <div ref={raiz} style={{ ["--accent" as string]: est.cor_destaque }} className="cliente pb-32">
      <Fundo cor={est.cor_destaque} />
      <div className="progresso" aria-hidden />

      <header className={`fixed inset-x-0 top-0 z-40 transition-colors duration-300 ${emMenu ? "topo-vidro" : ""}`}>
        <div className="mx-auto flex max-w-md items-center gap-3 px-4 py-2.5">
          {est.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={est.logo_url} alt="" className="h-9 w-9 rounded-full object-cover" />
          )}
          <p className="min-w-0 flex-1 truncate font-display text-lg font-bold">{est.nome}</p>
          <button type="button" onClick={() => chamar("garcom")} disabled={chamandoGarcom}
            className="chip flex h-11 items-center gap-2 rounded-full bg-black/30 px-4 text-sm font-semibold backdrop-blur disabled:opacity-60">
            <BellRing size={18} aria-hidden /> {chamandoGarcom ? "Chamado" : "Chamar garçom"}
          </button>
        </div>
        <div className="chips-wrap" data-open={emMenu ? "1" : "0"}>
          <div>
            <div className="mx-auto flex max-w-md items-center">
              <nav aria-label="Categorias" className="flex flex-1 gap-1 overflow-x-auto px-2">
                {cardapio.categorias.map((c) => (
                  <a key={c.id} id={`tab-${c.id}`} href={`#cat-${c.id}`} aria-current={catAtiva === c.id ? "true" : undefined}
                    className="aba relative flex min-h-11 shrink-0 items-center px-3 text-[13px] font-medium">{c.nome}</a>
                ))}
              </nav>
              <button type="button" onClick={() => setFiltrosAbertos((v) => !v)} aria-expanded={filtrosAbertos} aria-label="Filtros de alergênicos"
                className={`mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${filtros.length ? "text-[var(--accent-light)]" : "text-stone-400"}`}>
                <SlidersHorizontal size={18} aria-hidden />
              </button>
            </div>
            {filtrosAbertos && (
              <div className="mx-auto flex max-w-md gap-2 overflow-x-auto px-4 pb-2" role="group" aria-label="Filtros de alergênicos">
                {ALERGENOS.map((a) => {
                  const on = filtros.includes(a.id);
                  return (
                    <button key={a.id} type="button" aria-pressed={on}
                      onClick={() => setFiltros((f) => (on ? f.filter((x) => x !== a.id) : [...f, a.id]))}
                      className="chip min-h-11 shrink-0 rounded-full px-4 text-[13px]">{a.nome}</button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="relative z-10">
        <Hero nome={est.nome} iniciar={iniciou} onVer={verCardapio} />

        <main id="menu" className="mx-auto max-w-md px-4 pt-24">
          {cardapio.categorias.map((c, ci) => {
            const lista = c.produtos.filter(visiveis);
            if (lista.length === 0) return null;
            return (
              <section key={c.id} id={`cat-${c.id}`} data-cat={c.id} className="scroll-mt-24 pb-6 pt-10">
                <div className="rv mb-5">
                  <p className="font-display text-sm font-bold tracking-widest text-[var(--accent-light)]">{String(ci + 1).padStart(2, "0")}</p>
                  <h2 className="grad-text font-display text-4xl font-bold leading-tight">{c.nome}</h2>
                  <div className="rv-linha mt-2 h-1 w-20 rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent-warm)]" />
                </div>
                <ul>
                  {lista.map((p) => (
                    <CenaProduto key={p.id} p={p} maisPedido={cardapio.mais_pedido_hoje === p.id} onAbrir={abrirProduto} />
                  ))}
                </ul>
              </section>
            );
          })}
          {cardapio.categorias.every((c) => c.produtos.filter(visiveis).length === 0) && (
            <p className="py-16 text-center text-[var(--muted-dark)]">Nenhum item com esses filtros.</p>
          )}
        </main>
      </div>

      {(qtdCarrinho > 0 || totalMesa > 0) && (
        <div className="fixed inset-x-0 bottom-0 z-40 px-4 pb-4 pt-6" style={{ background: "linear-gradient(to top, #0C0A09 30%, transparent)" }}>
          <button type="button" onClick={() => setView("comanda")}
            className="barra-vidro mx-auto flex h-14 w-full max-w-md items-center justify-between rounded-full px-5 font-semibold text-white">
            <span className="flex items-center gap-2">
              <ShoppingBag size={20} aria-hidden />
              {qtdCarrinho > 0 ? `${qtdCarrinho} ${qtdCarrinho === 1 ? "item" : "itens"} a enviar` : "Ver comanda da mesa"}
            </span>
            <span>{formatBRL(totalMesa)}</span>
          </button>
        </div>
      )}

      {aviso && (
        <div role="status" className="fixed inset-x-4 top-20 z-[60] mx-auto max-w-md rounded-2xl bg-white px-4 py-3 text-center text-sm font-medium text-ink shadow-lg">{aviso}</div>
      )}

      {aberto && (
        <ProdutoSheet key={aberto.id} produto={aberto} todos={todos} categorias={cardapio.categorias} onClose={() => setProdutoAberto(null)}
          onAdd={adicionar} onAbrir={abrirProduto} />
      )}
      {view === "comanda" && (
        <ComandaSheet carrinho={carrinho} comanda={comanda} enviando={enviando} erro={erro} perfil={perfil}
          beneficio={est.texto_beneficio} sugestoes={sugestoesCarrinho}
          setQtd={(k, q) => setCarrinho((c) => (q <= 0 ? c.filter((i) => i.key !== k) : c.map((i) => (i.key === k ? { ...i, qtd: q } : i))))}
          remover={(k) => setCarrinho((c) => c.filter((i) => i.key !== k))}
          onEnviar={enviarPedido} onConta={() => chamar("conta")} onPerfil={() => setView("perfil")}
          onAbrir={(id) => { setView("menu"); abrirProduto(id); }} onClose={() => { setView("menu"); setErro(""); }} />
      )}
      {view === "perfil" && (
        <PerfilSheet cardapio={cardapio} sessao={sessao} perfil={perfil}
          onSalvo={(p) => { setPerfil(p); setView("comanda"); mostrar("Perfil salvo!"); void carregarComanda(sessao); }}
          onClose={() => setView("comanda")} />
      )}
    </div>
  );
}
