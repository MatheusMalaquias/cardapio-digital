/* Demonstração interativa: tudo roda no navegador, com dados de exemplo (dados.js). Nada é enviado a nenhum servidor. */
(() => {
  const D = window.DEMO;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const brl = (v) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const reduzir = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const ALERG = { sem_gluten: "Sem glúten", sem_lactose: "Sem lactose", vegano: "Vegano" };
  const foto = (p) => `placeholders/${p.cat}.svg`;
  const preco = (p) => (p.promo != null ? p.promo : p.preco);
  const opcoesDe = (p) => D.opcoes[p.op] || [];
  const extrasDe = (p) => D.extras[p.extras] || [];
  const porId = (id) => D.produtos.find((p) => p.id === id);
  const raiz = document.documentElement;
  raiz.style.setProperty("--accent", D.cafe.cor);

  let cart = [], pedidos = [], filtros = new Set(), contaPedida = false, seq = 0, comandaEl = null, perfil = null;
  const overlays = [];

  /* ===== utilidades de interface ===== */
  let toastT;
  function toast(msg) {
    const t = $("#toast"); t.textContent = msg; t.classList.add("on");
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("on"), 3500);
  }
  function travar() { document.body.style.overflow = overlays.length ? "hidden" : ""; }
  function fecharTopo() { const o = overlays.pop(); if (o) { if (o === comandaEl) comandaEl = null; o.remove(); travar(); } }
  addEventListener("keydown", (e) => { if (e.key === "Escape") fecharTopo(); });
  const ic = {
    x: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>',
    mais: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
    menos: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M5 12h14"/></svg>',
    lixo: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#b91c1c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6"/></svg>',
    sacola: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0"/></svg>',
    conta: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 2v20l3-2 3 2 3-2 3 2 3-2V2l-3 2-3-2-3 2-3-2zM8 8h8M8 12h8"/></svg>',
  };

  /* ===== cabeçalho, abas e filtros ===== */
  $("#nomeCafe").textContent = D.cafe.nome;
  $("#heroNome").textContent = D.cafe.nome;
  $("#abas").innerHTML = D.categorias.map((c) => `<a class="aba" id="tab-${c.id}" href="#cat-${c.id}">${c.nome}</a>`).join("");
  $("#filtros").innerHTML = Object.entries(ALERG).map(([k, v]) => `<button class="chip" type="button" data-f="${k}" aria-pressed="false">${v}</button>`).join("");
  $("#btnFiltro").addEventListener("click", (e) => {
    const f = $("#filtros"); f.hidden = !f.hidden; e.currentTarget.setAttribute("aria-expanded", String(!f.hidden));
  });
  $("#filtros").addEventListener("click", (e) => {
    const b = e.target.closest("[data-f]"); if (!b) return;
    const k = b.dataset.f; filtros.has(k) ? filtros.delete(k) : filtros.add(k);
    b.setAttribute("aria-pressed", String(filtros.has(k)));
    $("#btnFiltro").classList.toggle("ativo", filtros.size > 0);
    renderMenu();
  });
  $("#btnGarcom").addEventListener("click", () => {
    $("#btnGarcom").disabled = true; $("#txtGarcom").textContent = "Chamado";
    toast("Garçom chamado (simulado). No café, ele recebe o aviso na hora.");
    setTimeout(() => { $("#btnGarcom").disabled = false; $("#txtGarcom").textContent = "Chamar garçom"; }, 6000);
  });
  $("#btnVer").addEventListener("click", () => $("#menu").scrollIntoView({ behavior: reduzir ? "auto" : "smooth" }));

  /* ===== cardápio: uma foto por tela ===== */
  function cena(p) {
    const promo = p.promo != null && p.promo < p.preco;
    return `<li class="cena" data-cena><button class="cena-btn" type="button" data-abrir="${p.id}" aria-label="Escolher ${esc(p.nome)}">
      <img class="cena-img" src="${foto(p)}" alt="${esc(p.nome)}" loading="lazy">
      <span class="cena-vinheta"></span>
      <span class="selos">${D.maisPedido === p.id ? '<span class="selo-q">Mais pedido hoje</span>' : ""}${promo ? `<span class="selo-b">−${Math.round((1 - p.promo / p.preco) * 100)}% hoje</span>` : ""}</span>
      <span class="cena-texto"><span class="tam">${esc(p.tam)}</span><span class="nome">${esc(p.nome)}</span>
        <span class="linha-preco"><span class="preco">${promo ? `<s>${brl(p.preco)}</s>` : ""}<b class="grad-accent">${brl(preco(p))}</b></span><span class="btn-esc">Escolher +</span></span></span>
    </button></li>`;
  }
  const SELOS = 10;
  function cadastroCard(visivel) {
    const cls = visivel ? "rv in" : "rv";
    if (perfil) {
      return `<aside class="${cls} cad-card" id="cadCard" aria-label="Seu cadastro"><h3 class="cad-t disp">Olá, ${esc(perfil.nome)}!</h3>
        <p class="cad-d">${perfil.consent ? `Você vai receber promoções do ${esc(D.cafe.nome)} pelo WhatsApp.` : "Cadastro feito. Você não vai receber promoções pelo WhatsApp."} Seu cartão fidelidade: ${perfil.selos} de ${SELOS} selos.</p>
        <button type="button" class="cad-b" data-perfil>Ver meu cartão</button></aside>`;
    }
    return `<aside class="${cls} cad-card" id="cadCard" aria-label="Cadastro opcional"><p class="cad-o">Opcional</p><h3 class="cad-t disp">Receba promoções feitas para você</h3>
      <p class="cad-d">Cadastre-se e ganhe 10% de desconto nesta visita, junte selos no cartão fidelidade (o 10º café é grátis) e receba ofertas pelo WhatsApp, só se você quiser.</p>
      <button type="button" class="cad-b brilho" data-perfil>Quero me cadastrar</button></aside>`;
  }
  function renderMenu() {
    const corpo = D.categorias.map((c, i) => {
      const lista = D.produtos.filter((p) => p.cat === c.id && [...filtros].every((f) => p.alerg.includes(f)));
      if (!lista.length) return "";
      return `<section class="secao-cat" id="cat-${c.id}" data-cat="${c.id}"><div class="rv cab"><p class="num">${String(i + 1).padStart(2, "0")}</p><h2 class="grad-text disp">${c.nome}</h2><div class="linha"></div></div><ul>${lista.map(cena).join("")}</ul></section>`;
    }).join("") || '<p class="vazio">Nenhum item com esses filtros.</p>';
    $("#menu").innerHTML = cadastroCard() + corpo;
    $$(".rv").forEach((n) => io.observe(n));
  }
  function atualizarCard() { const c = $("#cadCard"); if (c) c.outerHTML = cadastroCard(true); }

  /* ===== cadastro opcional (simulado: nada é guardado ou enviado) ===== */
  function zapValido(v) {
    let d = v.replace(/\D/g, ""); if (d.length >= 12 && d.startsWith("55")) d = d.slice(2);
    return /^[1-9][1-9](9[0-9]{8}|[2-8][0-9]{7})$/.test(d);
  }
  function abrirPerfil() {
    const el = document.createElement("div"); el.className = "fundo-escuro";
    const cartao = () => `<div class="bloco"><p class="nota" style="margin-top:0">${perfil.consent ? `Pronto! Você vai receber promoções do ${esc(D.cafe.nome)} pelo WhatsApp. Para sair, é só responder SAIR.` : "Cadastro feito. Como você não marcou o aceite, não vai receber promoções pelo WhatsApp."}</p>
      <p class="bloco" style="margin-top:16px"><b>Benefício desta visita:</b> 10% de desconto, aplicado no caixa.</p>
      <div class="linha-item" style="margin-top:16px"><div class="topo"><span>Cartão fidelidade</span><span>${perfil.selos} de ${SELOS}</span></div>
        <div class="fid" role="img" aria-label="${perfil.selos} de ${SELOS} selos">${Array.from({ length: SELOS }, (_, i) => `<i class="${i < perfil.selos ? "on" : ""}"></i>`).join("")}</div>
        <small>O ${SELOS}º café é grátis.</small></div></div>`;
    const form = () => `<form id="fPerfil" novalidate>
      <p class="nota" style="margin-top:0"><b>Benefício:</b> 10% de desconto nesta visita e cartão fidelidade com selos.</p>
      <div class="campo-f"><label for="pNome">Nome</label><input class="f" id="pNome" autocomplete="name" required></div>
      <div class="campo-f"><label for="pZap">WhatsApp</label><input class="f" id="pZap" inputmode="tel" placeholder="(11) 98888-7777" autocomplete="tel" required></div>
      <div class="campo-f"><label for="pAniv">Aniversário (opcional)</label><input class="f" id="pAniv" type="date"></div>
      <label class="lgpd"><input type="checkbox" id="pOk"><span>Aceito receber promoções de ${esc(D.cafe.nome)} pelo WhatsApp. Posso sair quando quiser respondendo SAIR.</span></label>
      <p id="pErro" class="erro-f" role="alert" hidden></p>
      <p class="muted" style="font-size:.78rem;margin-top:8px">Demonstração: nenhum dado é guardado ou enviado.</p></form>`;
    function desenhar() {
      el.innerHTML = `<div class="folha" role="dialog" aria-modal="true" aria-label="${perfil ? "Meu cartão" : "Criar perfil"}"><header><h2 class="disp">${perfil ? "Meu cartão" : "Criar perfil"}</h2><button class="x" type="button" data-fechar aria-label="Fechar">${ic.x}</button></header>
        <div class="corpo">${perfil ? cartao() : form()}</div>
        <div class="rodape">${perfil ? '<button class="btn-prim" type="button" data-fechar>Fechar</button>' : '<button class="btn-prim" type="submit" form="fPerfil">Salvar perfil</button>'}</div></div>`;
    }
    desenhar(); document.body.appendChild(el); overlays.push(el); travar();
    el.addEventListener("click", (e) => { if (e.target === el || e.target.closest("[data-fechar]")) fecharTopo(); });
    el.addEventListener("submit", (e) => {
      e.preventDefault();
      const nome = $("#pNome", el).value.trim(), erro = $("#pErro", el);
      const falha = nome.length < 2 ? "Informe seu nome." : !zapValido($("#pZap", el).value) ? "WhatsApp inválido. Use DDD + número, ex.: (11) 98888-7777." : "";
      if (falha) { erro.textContent = falha; erro.hidden = false; return; }
      perfil = { nome, consent: $("#pOk", el).checked, selos: 0 };
      desenhar(); atualizarCard(); if (comandaEl) renderComanda();
      toast("Cadastro feito! (demonstração)");
    });
  }

  $("#menu").addEventListener("click", (e) => {
    if (e.target.closest("[data-perfil]")) return abrirPerfil();
    const b = e.target.closest("[data-abrir]"); if (b) abrirProduto(b.dataset.abrir);
  });

  /* ===== detalhe do produto ===== */
  function abrirProduto(id) {
    const p = porId(id);
    let tam = p.tamanhos ? D.tamanhos[0] : null;
    const specs = Object.fromEntries(opcoesDe(p).map((o) => [o.nome, o.esc[0]]));
    const extras = new Set(); let obs = "", qtd = 1, combos = [], catC = "";
    const comboUnit = (c) => preco(c.p) + (c.tam ? c.tam.delta : 0);
    const unit = () => preco(p) + (tam ? tam.delta : 0) + [...extras].reduce((s, n) => s + extrasDe(p).find((x) => x.nome === n).preco, 0);
    const total = () => unit() * qtd + combos.reduce((s, c) => s + comboUnit(c), 0);

    const el = document.createElement("div"); el.className = "prod"; el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); el.setAttribute("aria-label", p.nome);
    const sug = (p.comb || []).map(porId);
    el.innerHTML = `
      <div class="prod-bg" data-fechar><img src="${foto(p)}" alt=""></div>
      <button class="prod-x" type="button" data-fechar aria-label="Fechar">${ic.x}</button>
      <div class="prod-foto" data-fechar><img src="${foto(p)}" alt="${esc(p.nome)}"></div>
      <div class="caixa">
        <div class="cab-p"><div><h2 class="disp">${esc(p.nome)}</h2><p class="muted" style="font-size:.88rem">${esc(p.tam)}</p></div><p class="pr">${brl(preco(p))}</p></div>
        <div class="corpo">
          <p class="muted" style="font-size:.9rem">${esc(p.desc)}</p>
          ${p.alerg.length ? `<ul class="pills" style="margin-top:8px">${p.alerg.map((a) => `<li>${ALERG[a]}</li>`).join("")}</ul>` : ""}
          <p class="rotulo">Ingredientes</p><ul class="pills">${p.ing.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>
          <p class="rotulo">Como é feito</p><ol class="passos">${p.prep.map((s, k) => `<li><b>${k + 1}</b>${esc(s)}</li>`).join("")}</ol>
          ${opcoesDe(p).map((o) => `<fieldset><legend>${o.nome}</legend><div class="opcs">${o.esc.map((e, k) => `<label class="opc"><input type="radio" name="op-${o.nome}" value="${esc(e)}" data-op="${o.nome}" ${k === 0 ? "checked" : ""}>${e}</label>`).join("")}</div></fieldset>`).join("")}
          ${p.tamanhos ? `<fieldset><legend>Tamanho</legend><div class="opcs">${D.tamanhos.map((t, k) => `<label class="opc"><input type="radio" name="tam" value="${k}" ${k === 0 ? "checked" : ""}>${t.nome}${t.delta ? ` +${brl(t.delta)}` : ""}</label>`).join("")}</div></fieldset>` : ""}
          ${extrasDe(p).length ? `<fieldset><legend>Adicionais</legend><div class="opcs">${extrasDe(p).map((x) => `<label class="opc cx"><span style="display:flex;align-items:center;gap:12px"><input type="checkbox" data-extra="${esc(x.nome)}" style="position:static;opacity:1;width:20px;height:20px;pointer-events:auto;accent-color:${D.cafe.cor}">${x.nome}</span><span class="muted" style="font-size:.85rem">+ ${brl(x.preco)}</span></label>`).join("")}</div></fieldset>` : ""}
          <section class="combo" aria-label="Combinação"><h3 class="disp">Faça uma combinação</h3><p class="d">Escolha qualquer outro item do cardápio para vir junto.</p>
            ${sug.length ? `<p class="d" style="margin-top:6px">Combina com: ${sug.map((s) => `<button type="button" data-sug="${s.id}" style="color:${D.cafe.cor};font-weight:600;text-decoration:underline">${esc(s.nome)}</button>`).join(", ")}</p>` : ""}
            <label class="sr" for="catC" style="position:absolute;left:-9999px">Categoria</label>
            <select id="catC" style="width:100%;margin-top:8px"><option value="">Todas as categorias</option>${D.categorias.map((c) => `<option value="${c.id}">${c.nome}</option>`).join("")}</select>
            <ul class="cands" id="cands"></ul><div id="selCombos"></div></section>
          <div style="margin-top:20px"><label for="obs" style="font-weight:600;display:block;margin-bottom:4px">Observação</label><textarea id="obs" rows="2" maxlength="200" placeholder="Ex.: pouco leite, bem quente"></textarea></div>
        </div>
        <div class="foot-p"><div class="qtd"><button type="button" id="menosQ" aria-label="Diminuir quantidade">${ic.menos}</button><span id="qv" aria-live="polite">1</span><button type="button" id="maisQ" aria-label="Aumentar quantidade">${ic.mais}</button></div>
          <button class="btn-prim" type="button" id="add"></button></div>
      </div>`;
    document.body.appendChild(el); overlays.push(el); travar();

    const atualizar = () => { $("#add", el).textContent = `Adicionar · ${brl(total())}`; $("#qv", el).textContent = qtd; };
    function desenharCombos() {
      const cand = D.produtos.filter((x) => x.id !== p.id && (!catC || x.cat === catC));
      $("#cands", el).innerHTML = cand.map((x) => `<li><button class="cand" type="button" data-c="${x.id}" aria-pressed="${combos.some((c) => c.p.id === x.id)}"><img src="${foto(x)}" alt=""><span><b>${esc(x.nome)}</b>${brl(preco(x))}</span></button></li>`).join("");
      $("#selCombos", el).innerHTML = combos.map((c, i) => `<div class="sel-combo"><div class="l"><span>${esc(c.p.nome)} · ${brl(comboUnit(c))}</span><button type="button" data-rm="${i}" aria-label="Remover ${esc(c.p.nome)}" class="x" style="width:44px;height:44px">${ic.x}</button></div>
        <div class="sel">${c.p.tamanhos ? `<select data-ct="${i}" aria-label="Tamanho de ${esc(c.p.nome)}">${D.tamanhos.map((t, k) => `<option value="${k}" ${c.tam === t ? "selected" : ""}>${t.nome}</option>`).join("")}</select>` : ""}${opcoesDe(c.p).map((o) => `<select data-cs="${i}" data-n="${o.nome}" aria-label="${o.nome} de ${esc(c.p.nome)}">${o.esc.map((e) => `<option ${c.specs[o.nome] === e ? "selected" : ""}>${e}</option>`).join("")}</select>`).join("")}</div></div>`).join("");
      atualizar();
    }
    const alternar = (x) => {
      const i = combos.findIndex((c) => c.p.id === x.id);
      if (i >= 0) combos.splice(i, 1);
      else combos.push({ p: x, tam: x.tamanhos ? D.tamanhos[0] : null, specs: Object.fromEntries(opcoesDe(x).map((o) => [o.nome, o.esc[0]])) });
      desenharCombos();
    };
    el.addEventListener("click", (e) => {
      if (e.target.closest("[data-fechar]")) return fecharTopo();
      const c = e.target.closest("[data-c]"); if (c) return alternar(porId(c.dataset.c));
      const s = e.target.closest("[data-sug]"); if (s) return alternar(porId(s.dataset.sug));
      const r = e.target.closest("[data-rm]"); if (r) { combos.splice(+r.dataset.rm, 1); return desenharCombos(); }
    });
    el.addEventListener("change", (e) => {
      const t = e.target;
      if (t.dataset.op) specs[t.dataset.op] = t.value;
      else if (t.name === "tam") tam = D.tamanhos[+t.value];
      else if (t.dataset.extra) t.checked ? extras.add(t.dataset.extra) : extras.delete(t.dataset.extra);
      else if (t.id === "catC") { catC = t.value; return desenharCombos(); }
      else if (t.dataset.ct != null) combos[+t.dataset.ct].tam = D.tamanhos[+t.value];
      else if (t.dataset.cs != null) combos[+t.dataset.cs].specs[t.dataset.n] = t.value;
      atualizar(); if (t.dataset.ct != null || t.dataset.cs != null) desenharCombos();
    });
    $("#obs", el).addEventListener("input", (e) => { obs = e.target.value; });
    $("#menosQ", el).addEventListener("click", () => { qtd = Math.max(1, qtd - 1); atualizar(); });
    $("#maisQ", el).addEventListener("click", () => { qtd++; atualizar(); });
    $("#add", el).addEventListener("click", () => {
      adicionar({ id: p.id, nome: p.nome, qtd, unit: unit(), tam: tam && tam.nome, extras: [...extras], specs: { ...specs }, obs: obs.trim() });
      combos.forEach((c) => adicionar({ id: c.p.id, nome: c.p.nome, qtd: 1, unit: comboUnit(c), tam: c.tam && c.tam.nome, extras: [], specs: { ...c.specs }, obs: `Combinação com ${p.nome}` }));
      fecharTopo();
      toast(combos.length ? `${p.nome} e mais ${combos.length} adicionados à comanda` : `${p.nome} adicionado à comanda`);
    });
    desenharCombos();
  }

  /* ===== carrinho, comanda e pedido simulado ===== */
  function adicionar(i) {
    const key = [i.id, i.tam, i.extras.join(","), JSON.stringify(i.specs), i.obs].join("|");
    const ex = cart.find((x) => x.key === key);
    ex ? (ex.qtd += i.qtd) : cart.push({ ...i, key });
    renderBarra();
  }
  const totalCart = () => cart.reduce((s, i) => s + i.unit * i.qtd, 0);
  const totalPedidos = () => pedidos.reduce((s, p) => s + p.itens.reduce((a, i) => a + i.unit * i.qtd, 0), 0);
  function renderBarra() {
    const q = cart.reduce((s, i) => s + i.qtd, 0), t = totalCart() + totalPedidos();
    $("#barra").innerHTML = q || t ? `<button type="button" id="abrirComanda"><span class="e">${ic.sacola}${q ? `${q} ${q === 1 ? "item" : "itens"} a enviar` : "Ver comanda da mesa"}</span><span>${brl(t)}</span></button>` : "";
  }
  $("#barra").addEventListener("click", (e) => { if (e.target.closest("#abrirComanda")) abrirComanda(); });
  const ROT = { pendente: "Aguardando o garçom", confirmado: "Confirmado", em_preparo: "Em preparo", pronto: "Pronto, a caminho", entregue: "Entregue" };
  const SEQ = [["confirmado", 3500, "O garçom confirmou seu pedido."], ["em_preparo", 4000, ""], ["pronto", 7000, "Seu pedido ficou pronto! O garçom está levando."], ["entregue", 5000, ""]];
  function simular(ped) {
    let i = 0;
    const prox = () => { if (i >= SEQ.length) return; const [st, ms, msg] = SEQ[i++]; setTimeout(() => { ped.status = st; if (msg) toast(msg); renderComanda(); prox(); }, ms); };
    prox();
  }
  const descItem = (i) => [i.tam, ...Object.entries(i.specs).map(([k, v]) => `${k}: ${v}`), ...i.extras, i.obs && `Obs: ${i.obs}`].filter(Boolean).map(esc).join(" · ");
  function renderComanda() {
    if (!comandaEl) return;
    const c = $(".corpo", comandaEl), pos = c.scrollTop;
    c.innerHTML = `
      <div class="bloco"><h3 class="disp">A enviar agora</h3>${cart.length ? cart.map((i, k) => `<div class="linha-item"><div class="topo"><span>${esc(i.nome)}</span><span>${brl(i.unit * i.qtd)}</span></div><small>${descItem(i)}</small>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px"><div class="qtd"><button type="button" data-q="${k}" data-d="-1" aria-label="Diminuir ${esc(i.nome)}">${ic.menos}</button><span>${i.qtd}</span><button type="button" data-q="${k}" data-d="1" aria-label="Aumentar ${esc(i.nome)}">${ic.mais}</button></div><button type="button" class="x" style="background:none" data-rm="${k}" aria-label="Remover ${esc(i.nome)}">${ic.lixo}</button></div></div>`).join("") : '<p class="muted" style="font-size:.9rem">Nada na comanda. Escolha itens no cardápio.</p>'}</div>
      <div class="bloco"><h3 class="disp">Já pedido nesta mesa</h3>${pedidos.length ? pedidos.map((p) => `<div class="linha-item"><span class="status s-${p.status}">${ROT[p.status]}</span><ul style="margin-top:8px;font-size:.88rem">${p.itens.map((i) => `<li style="display:flex;justify-content:space-between;gap:8px"><span>${i.qtd}x ${esc(i.nome)}${i.tam ? ` (${i.tam})` : ""}</span><span>${brl(i.unit * i.qtd)}</span></li>`).join("")}</ul></div>`).join("") : '<p class="muted" style="font-size:.9rem">Nenhum pedido enviado ainda.</p>'}</div>
      <p class="total"><span>Total da mesa</span><span>${brl(totalCart() + totalPedidos())}</span></p><p class="muted" style="font-size:.78rem">O pagamento é feito no caixa, ao final.</p>
      <button type="button" class="perfil-linha" data-perfil>${perfil ? `Olá, <b>${esc(perfil.nome)}</b>. Ver meu cartão fidelidade (${perfil.selos} selos)` : "<b>Crie seu perfil</b> — 10% de desconto nesta visita ao se cadastrar"}</button>
      <p class="nota">Demonstração: o garçom e a cozinha são simulados e nada é enviado de verdade. No café, o pedido chega à equipe na hora.</p>`;
    c.scrollTop = pos;
    $("#env", comandaEl).hidden = cart.length === 0; $("#env", comandaEl).textContent = `Enviar pedido ao garçom · ${brl(totalCart())}`;
    const conta = $("#conta", comandaEl); conta.disabled = contaPedida || pedidos.length === 0;
    conta.innerHTML = `${ic.conta} ${contaPedida ? "Conta pedida, o garçom já vem" : "Pedir a conta"}`;
    renderBarra();
  }
  function abrirComanda() {
    const el = document.createElement("div"); el.className = "fundo-escuro"; comandaEl = el;
    el.innerHTML = `<div class="folha" role="dialog" aria-modal="true" aria-label="Comanda da mesa"><header><h2 class="disp">Comanda da mesa</h2><button class="x" type="button" data-fechar aria-label="Fechar">${ic.x}</button></header><div class="corpo"></div>
      <div class="rodape"><button class="btn-prim" type="button" id="env"></button><button class="btn-sec" type="button" id="conta"></button></div></div>`;
    document.body.appendChild(el); overlays.push(el); travar();
    el.addEventListener("click", (e) => {
      if (e.target === el || e.target.closest("[data-fechar]")) return fecharTopo();
      if (e.target.closest("[data-perfil]")) return abrirPerfil();
      const q = e.target.closest("[data-q]");
      if (q) { const i = cart[+q.dataset.q]; i.qtd += +q.dataset.d; if (i.qtd <= 0) cart.splice(+q.dataset.q, 1); return renderComanda(); }
      const r = e.target.closest("[data-rm]"); if (r) { cart.splice(+r.dataset.rm, 1); return renderComanda(); }
      if (e.target.closest("#env") && cart.length) {
        const ped = { id: ++seq, itens: cart.splice(0), status: "pendente" }; pedidos.push(ped);
        toast("Pedido enviado! Aguarde a confirmação do garçom."); simular(ped); renderComanda();
      }
      if (e.target.closest("#conta")) { contaPedida = true; toast("Conta solicitada (simulado). O garçom já vem."); renderComanda(); }
    });
    renderComanda();
  }

  /* ===== movimento ligado ao scroll ===== */
  const hero = $("#hero"), topo = $("#topo");
  let ticking = false, noMenu = false, iniciou = false, ativa = "";
  function aoRolar() {
    ticking = false;
    const vh = innerHeight, sy = scrollY;
    const p = reduzir ? 1 : Math.min(1, Math.max(0, sy / Math.max(1, hero.offsetHeight - vh)));
    raiz.style.setProperty("--p", p.toFixed(4));
    raiz.style.setProperty("--sp", (sy / Math.max(1, raiz.scrollHeight - vh)).toFixed(4));
    if (p > 0.2 && !iniciou) { iniciou = true; digitar(); }
    const m = p >= 0.98;
    if (m !== noMenu) { noMenu = m; $("#chipsWrap").classList.toggle("aberto", m); topo.classList.toggle("vidro", m); }
    let a = ""; $$("[data-cat]").forEach((n) => { if (n.getBoundingClientRect().top <= 140) a = n.dataset.cat; });
    if (a !== ativa) { ativa = a; $$(".aba").forEach((t) => t.removeAttribute("aria-current")); const t = $(`#tab-${a}`); if (t) { t.setAttribute("aria-current", "true"); t.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" }); } }
    if (!reduzir) $$("[data-cena]").forEach((n) => {
      const r = n.getBoundingClientRect(); if (r.bottom < -50 || r.top > vh + 50) return;
      n.style.setProperty("--c", Math.min(1, Math.max(0, (vh - r.top) / (vh + r.height))).toFixed(3));
    });
  }
  addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(aoRolar); } }, { passive: true });
  addEventListener("resize", aoRolar);
  const io = "IntersectionObserver" in window
    ? new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: 0.12, rootMargin: "0px 0px -6% 0px" })
    : { observe: (n) => n.classList.add("in"), unobserve() {} };

  function digitar() {
    const F = ["Peça direto da sua mesa,", "sem fila."]; let i = 0, j = 0;
    const alvo = [$("#l1"), $("#l2")];
    const passo = () => {
      j++; alvo[i].innerHTML = esc(F[i].slice(0, j)) + (j < F[i].length || i === 1 ? '<span class="cursor"></span>' : "");
      if (j >= F[i].length) { alvo[i].textContent = F[i]; i++; j = 0; if (i >= F.length) { alvo[1].innerHTML = esc(F[1]) + '<span class="cursor"></span>'; return; } setTimeout(passo, 280); return; }
      setTimeout(passo, 38);
    };
    reduzir ? (alvo[0].textContent = F[0], alvo[1].textContent = F[1]) : setTimeout(passo, 150);
  }

  /* ===== fundo animado ===== */
  try { (function fundo() {
    const cv = $("#fundo"), ctx = cv.getContext("2d"), dpr = Math.min(devicePixelRatio || 1, 2);
    let w, h, mx = 0, my = 0, raf;
    const orbes = Array.from({ length: 26 }, (_, i) => ({ x: Math.random(), y: Math.random(), r: 40 + Math.random() * 130, v: 0.00004 + Math.random() * 0.00012, d: 0.15 + Math.random() * 0.6, q: i % 3 === 0 }));
    const rgb = (q) => { const n = parseInt(D.cafe.cor.slice(1), 16); return q ? [255, 179, 71] : [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
    const resize = () => { w = innerWidth || 1; h = innerHeight || 1; cv.width = w * dpr; cv.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    const desenhar = () => {
      ctx.clearRect(0, 0, w, h);
      for (const o of orbes) {
        if (!reduzir) o.y -= o.v * 16; if (o.y < -0.2) o.y = 1.2;
        const x = o.x * w + mx * 30 * o.d, y = ((o.y * h - ((scrollY * o.d * 0.25) % (h * 1.4)) + my * 20 * o.d) % (h * 1.4) + h * 1.4) % (h * 1.4) - h * 0.2;
        if (!isFinite(x) || !isFinite(y)) continue;
        const [r, g, b] = rgb(o.q), gr = ctx.createRadialGradient(x, y, 0, x, y, o.r);
        gr.addColorStop(0, `rgba(${r},${g},${b},${o.q ? 0.1 : 0.16})`); gr.addColorStop(1, `rgba(${r},${g},${b},0)`);
        ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, o.r, 0, 7); ctx.fill();
      }
      if (!reduzir) raf = requestAnimationFrame(desenhar);
    };
    resize(); desenhar();
    addEventListener("resize", resize);
    addEventListener("pointermove", (e) => { mx = e.clientX / w - 0.5; my = e.clientY / h - 0.5; }, { passive: true });
    document.addEventListener("visibilitychange", () => { cancelAnimationFrame(raf); if (!document.hidden && !reduzir) raf = requestAnimationFrame(desenhar); });
  })(); } catch (err) { console.warn("Fundo animado desativado:", err); }

  renderMenu(); renderBarra(); aoRolar();
  window.__animacaoOk = true;
})();
