-- ===== Funções internas (não expostas) =====
create function _mesa_valida(p_slug text, p_codigo text) returns mesas
language plpgsql stable security definer set search_path = public as $$
declare v mesas%rowtype;
begin
  select m.* into v from mesas m join estabelecimentos e on e.id = m.estabelecimento_id
   where e.slug = p_slug and m.codigo = p_codigo and m.ativa;
  if not found then raise exception 'mesa_invalida'; end if;
  return v;
end $$;

create function _rate_limit(p_sessao uuid, p_acao text, p_max int, p_janela interval) returns void
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  delete from rate_limit where criado_em < now() - interval '1 hour';
  select count(*) into n from rate_limit where sessao_id = p_sessao and acao = p_acao and criado_em > now() - p_janela;
  if n >= p_max then raise exception 'limite_excedido'; end if;
  insert into rate_limit (sessao_id, acao) values (p_sessao, p_acao);
end $$;

revoke all on function _mesa_valida(text, text), _rate_limit(uuid, text, int, interval) from public, anon, authenticated;

-- ===== Cliente anônimo =====
create function enviar_pedido(p_slug text, p_codigo text, p_sessao uuid, p_itens jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_mesa mesas%rowtype; v_com comandas%rowtype; v_ped uuid; v_it jsonb;
  v_prod produtos%rowtype; v_var variacoes%rowtype; v_preco numeric; v_extra numeric; v_ads jsonb;
  v_cli uuid; v_qtd int; v_g jsonb; v_spec jsonb;
begin
  v_mesa := _mesa_valida(p_slug, p_codigo);
  if p_itens is null or jsonb_typeof(p_itens) <> 'array' or jsonb_array_length(p_itens) = 0 then
    raise exception 'pedido_vazio';
  end if;
  if jsonb_array_length(p_itens) > 40 then raise exception 'pedido_grande'; end if;
  perform _rate_limit(p_sessao, 'pedido', 5, interval '10 minutes');

  select id into v_cli from clientes where estabelecimento_id = v_mesa.estabelecimento_id and sessao_id = p_sessao;

  select * into v_com from comandas where mesa_id = v_mesa.id and status <> 'fechada';
  if not found then
    insert into comandas (estabelecimento_id, mesa_id, cliente_id)
    values (v_mesa.estabelecimento_id, v_mesa.id, v_cli) returning * into v_com;
  else
    update comandas set status = 'aberta', conta_pedida_em = null, cliente_id = coalesce(cliente_id, v_cli)
    where id = v_com.id;
  end if;

  insert into pedidos (estabelecimento_id, comanda_id, sessao_id, cliente_id, garcom_id)
  values (v_mesa.estabelecimento_id, v_com.id, p_sessao, v_cli, v_mesa.garcom_id) returning id into v_ped;

  for v_it in select * from jsonb_array_elements(p_itens) loop
    select * into v_prod from produtos
     where id = (v_it->>'produto_id')::uuid and estabelecimento_id = v_mesa.estabelecimento_id and ativo;
    if not found then raise exception 'produto_invalido'; end if;
    if v_prod.esgotado then raise exception 'produto_esgotado'; end if;

    v_qtd := greatest(1, least(coalesce((v_it->>'qtd')::int, 1), 50));
    v_preco := preco_vigente(v_prod.id);   -- preço SEMPRE calculado no servidor

    v_var := null;
    if nullif(v_it->>'variacao_id', '') is not null then
      select * into v_var from variacoes
       where id = (v_it->>'variacao_id')::uuid and produto_id = v_prod.id and ativo;
      if not found then raise exception 'variacao_invalida'; end if;
      v_preco := v_preco + v_var.preco_delta;
    end if;

    select coalesce(jsonb_agg(jsonb_build_object('id', a.id, 'nome', a.nome, 'preco', a.preco)), '[]'),
           coalesce(sum(a.preco), 0)
      into v_ads, v_extra
      from adicionais a
     where a.produto_id = v_prod.id and a.ativo
       and a.id in (select x::uuid from jsonb_array_elements_text(coalesce(v_it->'adicionais_ids', '[]')) x);
    v_preco := v_preco + v_extra;

    -- especificações (ex.: açúcar): só aceita escolhas que o produto oferece
    v_spec := '{}'::jsonb;
    if jsonb_typeof(v_it->'especificacoes') = 'object' then
      for v_g in select * from jsonb_array_elements(v_prod.opcoes) loop
        if (v_g->'escolhas') @> to_jsonb(v_it->'especificacoes'->>(v_g->>'nome')) then
          v_spec := v_spec || jsonb_build_object(v_g->>'nome', v_it->'especificacoes'->>(v_g->>'nome'));
        end if;
      end loop;
    end if;

    insert into itens_pedido (estabelecimento_id, pedido_id, produto_id, nome, qtd, preco_unitario, variacao, adicionais, especificacoes, observacao)
    values (v_mesa.estabelecimento_id, v_ped, v_prod.id, v_prod.nome, v_qtd, v_preco,
            case when v_var.id is null then null
                 else jsonb_build_object('id', v_var.id, 'nome', v_var.nome, 'preco_delta', v_var.preco_delta) end,
            v_ads, v_spec, left(nullif(trim(v_it->>'observacao'), ''), 200));
  end loop;
  return v_ped;
end $$;

create function obter_comanda(p_slug text, p_codigo text, p_sessao uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v_mesa mesas%rowtype; v_com comandas%rowtype; v_chamados jsonb;
begin
  v_mesa := _mesa_valida(p_slug, p_codigo);
  select coalesce(jsonb_agg(jsonb_build_object('tipo', ch.tipo, 'criado_em', ch.criado_em, 'a_caminho', ch.a_caminho_em is not null)), '[]')
    into v_chamados from chamados ch where ch.mesa_id = v_mesa.id and ch.atendido_em is null;

  select * into v_com from comandas where mesa_id = v_mesa.id and status <> 'fechada';
  if not found then
    return jsonb_build_object('comanda', null, 'pedidos', '[]'::jsonb, 'total', 0, 'chamados', v_chamados);
  end if;

  return jsonb_build_object(
    'comanda', jsonb_build_object('id', v_com.id, 'status', v_com.status),
    'pedidos', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id, 'status', p.status, 'motivo_recusa', p.motivo_recusa, 'criado_em', p.criado_em,
        'meu', p.sessao_id = p_sessao, 'cliente_nome', c.nome,
        'itens', (select coalesce(jsonb_agg(jsonb_build_object('nome', i.nome, 'qtd', i.qtd,
                    'preco_unitario', i.preco_unitario, 'variacao', i.variacao,
                    'adicionais', i.adicionais, 'especificacoes', i.especificacoes, 'observacao', i.observacao)), '[]')
                  from itens_pedido i where i.pedido_id = p.id)
      ) order by p.criado_em)
      from pedidos p left join clientes c on c.id = p.cliente_id where p.comanda_id = v_com.id), '[]'),
    'total', coalesce((select sum(i.qtd * i.preco_unitario) from itens_pedido i join pedidos p on p.id = i.pedido_id
                        where p.comanda_id = v_com.id and p.status <> 'recusado'), 0),
    'chamados', v_chamados);
end $$;

create function criar_chamado(p_slug text, p_codigo text, p_sessao uuid, p_tipo tipo_chamado) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_mesa mesas%rowtype; v_id uuid;
begin
  v_mesa := _mesa_valida(p_slug, p_codigo);
  perform _rate_limit(p_sessao, 'chamado', 10, interval '10 minutes');
  select id into v_id from chamados where mesa_id = v_mesa.id and tipo = p_tipo and atendido_em is null limit 1;
  if v_id is null then
    insert into chamados (estabelecimento_id, mesa_id, sessao_id, tipo, garcom_id)
    values (v_mesa.estabelecimento_id, v_mesa.id, p_sessao, p_tipo, v_mesa.garcom_id) returning id into v_id;
  end if;
  if p_tipo = 'conta' then
    update comandas set status = 'conta_pedida', conta_pedida_em = now()
     where mesa_id = v_mesa.id and status = 'aberta';
  end if;
  return v_id;
end $$;

create function registrar_evento(p_slug text, p_sessao uuid, p_tipo tipo_evento, p_produto uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_est uuid;
begin
  select id into v_est from estabelecimentos where slug = p_slug;
  if v_est is null then raise exception 'estabelecimento_invalido'; end if;
  perform _rate_limit(p_sessao, 'evento', 200, interval '10 minutes');
  if p_produto is not null and not exists (select 1 from produtos where id = p_produto and estabelecimento_id = v_est) then
    raise exception 'produto_invalido';
  end if;
  insert into eventos (estabelecimento_id, sessao_id, tipo, produto_id) values (v_est, p_sessao, p_tipo, p_produto);
end $$;

create function obter_perfil(p_slug text, p_sessao uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('nome', c.nome, 'whatsapp', c.whatsapp, 'aniversario', c.aniversario,
                            'selos', c.selos, 'consentimento', c.consentimento_em is not null and c.descadastrado_em is null)
  from clientes c join estabelecimentos e on e.id = c.estabelecimento_id
  where e.slug = p_slug and c.sessao_id = p_sessao
$$;

create function salvar_perfil(p_slug text, p_codigo text, p_sessao uuid, p_nome text, p_whatsapp text,
                              p_aniversario date, p_consentimento boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_mesa mesas%rowtype; v_dig text; v_cli clientes%rowtype; v_com uuid;
begin
  v_mesa := _mesa_valida(p_slug, p_codigo);
  perform _rate_limit(p_sessao, 'perfil', 10, interval '10 minutes');
  if length(trim(coalesce(p_nome, ''))) < 2 then raise exception 'nome_invalido'; end if;

  v_dig := regexp_replace(coalesce(p_whatsapp, ''), '\D', '', 'g');
  if length(v_dig) in (12, 13) and left(v_dig, 2) = '55' then v_dig := substr(v_dig, 3); end if;
  -- DDD (11-99) + número: 9 dígitos começando com 9 (celular) ou 8 dígitos
  if v_dig !~ '^[1-9][1-9](9[0-9]{8}|[2-8][0-9]{7})$' then raise exception 'whatsapp_invalido'; end if;

  insert into clientes (estabelecimento_id, sessao_id, nome, whatsapp, aniversario, consentimento_em, ultima_visita)
  values (v_mesa.estabelecimento_id, p_sessao, trim(p_nome), v_dig, p_aniversario,
          case when p_consentimento then now() end, now())
  on conflict (estabelecimento_id, whatsapp) do update set
    nome = excluded.nome, sessao_id = excluded.sessao_id,
    aniversario = coalesce(excluded.aniversario, clientes.aniversario),
    consentimento_em = case when p_consentimento then coalesce(clientes.consentimento_em, now()) else null end,
    descadastrado_em = case when p_consentimento then null else clientes.descadastrado_em end,
    ultima_visita = now()
  returning * into v_cli;

  select id into v_com from comandas where mesa_id = v_mesa.id and status <> 'fechada';
  if v_com is not null then
    update comandas set cliente_id = coalesce(cliente_id, v_cli.id) where id = v_com;
    update pedidos set cliente_id = v_cli.id where comanda_id = v_com and sessao_id = p_sessao and cliente_id is null;
  end if;

  return jsonb_build_object('nome', v_cli.nome, 'whatsapp', v_cli.whatsapp, 'aniversario', v_cli.aniversario,
                            'selos', v_cli.selos, 'consentimento', v_cli.consentimento_em is not null);
end $$;

grant execute on function enviar_pedido(text, text, uuid, jsonb), obter_comanda(text, text, uuid),
  criar_chamado(text, text, uuid, tipo_chamado), registrar_evento(text, uuid, tipo_evento, uuid),
  obter_perfil(text, uuid), salvar_perfil(text, text, uuid, text, text, date, boolean) to anon, authenticated;

-- ===== Equipe =====
create function marcar_esgotado(p_produto uuid, p_esgotado boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if meu_papel() is null then raise exception 'sem_permissao'; end if;
  update produtos set esgotado = p_esgotado where id = p_produto and estabelecimento_id = meu_estabelecimento();
end $$;

create function fechar_comanda(p_comanda uuid, p_desconto numeric, p_taxa numeric, p_pagamentos jsonb) returns numeric
language plpgsql security definer set search_path = public as $$
declare v_com comandas%rowtype; v_sub numeric; v_total numeric; v_soma numeric; v_forma forma_pagamento;
begin
  if not tenho_papel('caixa', 'dono') then raise exception 'sem_permissao'; end if;
  select * into v_com from comandas where id = p_comanda and estabelecimento_id = meu_estabelecimento() for update;
  if not found or v_com.status = 'fechada' then raise exception 'comanda_invalida'; end if;

  select coalesce(sum(i.qtd * i.preco_unitario), 0) into v_sub
    from itens_pedido i join pedidos p on p.id = i.pedido_id
   where p.comanda_id = p_comanda and p.status <> 'recusado';

  p_desconto := round(coalesce(p_desconto, 0), 2); p_taxa := round(coalesce(p_taxa, 0), 2);
  if p_desconto < 0 or p_desconto > v_sub or p_taxa < 0 then raise exception 'valores_invalidos'; end if;
  v_total := v_sub - p_desconto + p_taxa;

  select coalesce(sum((x->>'valor')::numeric), 0) into v_soma from jsonb_array_elements(p_pagamentos) x;
  if abs(v_soma - v_total) > 0.009 then raise exception 'pagamento_diferente_do_total'; end if;

  insert into pagamentos_comanda (estabelecimento_id, comanda_id, forma, valor)
  select v_com.estabelecimento_id, p_comanda, (x->>'forma')::forma_pagamento, (x->>'valor')::numeric
    from jsonb_array_elements(p_pagamentos) x where (x->>'valor')::numeric > 0;

  select (x->>'forma')::forma_pagamento into v_forma from jsonb_array_elements(p_pagamentos) x
   order by (x->>'valor')::numeric desc limit 1;

  update comandas set status = 'fechada', desconto = p_desconto, taxa_servico = p_taxa,
         forma_pagamento = v_forma, total = v_total, fechada_em = now() where id = p_comanda;
  update chamados set atendido_em = coalesce(atendido_em, now()) where mesa_id = v_com.mesa_id and atendido_em is null;
  if v_com.cliente_id is not null then
    update clientes set selos = selos + 1, ultima_visita = now() where id = v_com.cliente_id;
  end if;
  return v_total;
end $$;

-- ===== Métricas (dono) =====
create function metricas(p_dias int) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_est uuid := meu_estabelecimento();
  v_ini timestamptz := (date_trunc('day', now() at time zone 'America/Sao_Paulo')
                        - (greatest(p_dias, 1) - 1) * interval '1 day') at time zone 'America/Sao_Paulo';
  v_fat numeric; v_n int;
begin
  if not tenho_papel('dono') then raise exception 'sem_permissao'; end if;
  select coalesce(sum(total), 0), count(*) into v_fat, v_n from comandas
   where estabelecimento_id = v_est and status = 'fechada' and fechada_em >= v_ini;

  return jsonb_build_object(
    'pedidos', (select count(*) from pedidos where estabelecimento_id = v_est and status <> 'recusado' and criado_em >= v_ini),
    'faturamento', v_fat,
    'comandas_fechadas', v_n,
    'ticket_medio', case when v_n = 0 then 0 else round(v_fat / v_n, 2) end,
    'mais_vendidos', coalesce((select jsonb_agg(t) from (
        select p.nome, coalesce(sum(i.qtd), 0)::int as qtd from produtos p
          left join (select i.* from itens_pedido i join pedidos pd on pd.id = i.pedido_id
                      where pd.status <> 'recusado' and pd.criado_em >= v_ini) i on i.produto_id = p.id
         where p.estabelecimento_id = v_est group by p.id, p.nome order by qtd desc, p.nome limit 5) t), '[]'),
    'menos_vendidos', coalesce((select jsonb_agg(t) from (
        select p.nome, coalesce(sum(i.qtd), 0)::int as qtd from produtos p
          left join (select i.* from itens_pedido i join pedidos pd on pd.id = i.pedido_id
                      where pd.status <> 'recusado' and pd.criado_em >= v_ini) i on i.produto_id = p.id
         where p.estabelecimento_id = v_est and p.ativo group by p.id, p.nome order by qtd asc, p.nome limit 5) t), '[]'),
    'visto_pedido', coalesce((select jsonb_agg(t) from (
        select p.nome,
               (select count(*) from eventos e where e.produto_id = p.id and e.tipo = 'viu_produto' and e.criado_em >= v_ini)::int as vistas,
               (select coalesce(sum(i.qtd), 0) from itens_pedido i join pedidos pd on pd.id = i.pedido_id
                 where i.produto_id = p.id and pd.status <> 'recusado' and pd.criado_em >= v_ini)::int as pedidos
          from produtos p where p.estabelecimento_id = v_est order by vistas desc limit 8) t), '[]'),
    'por_hora', (select jsonb_agg(jsonb_build_object('hora', h, 'qtd', coalesce(x.c, 0)) order by h)
                   from generate_series(0, 23) h
                   left join (select extract(hour from criado_em at time zone 'America/Sao_Paulo')::int hh, count(*) c
                                from pedidos where estabelecimento_id = v_est and status <> 'recusado' and criado_em >= v_ini
                               group by 1) x on x.hh = h),
    'tempo_confirmacao_s', (select round(avg(extract(epoch from confirmado_em - criado_em))) from pedidos
                             where estabelecimento_id = v_est and criado_em >= v_ini and confirmado_em is not null),
    'tempo_preparo_s', (select round(avg(extract(epoch from pronto_em - confirmado_em))) from pedidos
                         where estabelecimento_id = v_est and criado_em >= v_ini and pronto_em is not null),
    'tempo_chamado_s', (select round(avg(extract(epoch from atendido_em - criado_em))) from chamados
                         where estabelecimento_id = v_est and criado_em >= v_ini and atendido_em is not null),
    'garcons', coalesce((select jsonb_agg(t) from (
        select eq.nome, count(p.id)::int as pedidos,
               round(avg(extract(epoch from p.confirmado_em - p.criado_em)))::int as tempo_confirmacao_s
          from equipe eq left join pedidos p on p.garcom_id = eq.user_id and p.criado_em >= v_ini and p.status <> 'recusado'
         where eq.estabelecimento_id = v_est and eq.papel = 'garcom' group by eq.nome) t), '[]'),
    'clientes_total', (select count(*) from clientes where estabelecimento_id = v_est),
    'clientes_novos', (select count(*) from clientes where estabelecimento_id = v_est and criado_em >= v_ini),
    'clientes_voltaram', (select count(*) from (
        select cliente_id from comandas where estabelecimento_id = v_est and status = 'fechada' and cliente_id is not null
         group by cliente_id having count(*) >= 2) r)
  );
end $$;

grant execute on function marcar_esgotado(uuid, boolean), fechar_comanda(uuid, numeric, numeric, jsonb), metricas(int) to authenticated;
revoke execute on function marcar_esgotado(uuid, boolean), fechar_comanda(uuid, numeric, numeric, jsonb), metricas(int) from anon, public;
