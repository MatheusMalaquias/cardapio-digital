-- Preço vigente (considera promoção por período, janela de horário e dia da semana)
create function preco_vigente(p_produto uuid) returns numeric
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select min(pr.preco_promocional) from promocoes pr
      where pr.produto_id = p_produto and pr.ativo
        and now() between pr.inicio and pr.fim
        and (pr.hora_de is null or (now() at time zone 'America/Sao_Paulo')::time between pr.hora_de and pr.hora_ate)
        and (pr.dias_semana is null
             or extract(dow from now() at time zone 'America/Sao_Paulo')::int = any(pr.dias_semana))),
    (select preco from produtos where id = p_produto))
$$;

-- Cardápio completo de uma mesa, para o cliente anônimo
create function obter_cardapio(p_slug text, p_codigo text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_est estabelecimentos%rowtype;
  v_mesa mesas%rowtype;
  v_hora time := (now() at time zone 'America/Sao_Paulo')::time;
begin
  select * into v_est from estabelecimentos where slug = p_slug;
  if not found then return null; end if;
  select * into v_mesa from mesas
    where estabelecimento_id = v_est.id and codigo = p_codigo and ativa;
  if not found then return null; end if;

  return jsonb_build_object(
    'estabelecimento', jsonb_build_object(
      'id', v_est.id, 'slug', v_est.slug, 'nome', v_est.nome, 'logo_url', v_est.logo_url,
      'cor_destaque', v_est.cor_destaque, 'texto_beneficio', v_est.texto_beneficio,
      'fidelidade_meta', v_est.fidelidade_meta, 'fidelidade_premio', v_est.fidelidade_premio,
      'politica_privacidade_url', v_est.politica_privacidade_url),
    'mesa', jsonb_build_object('id', v_mesa.id, 'numero', v_mesa.numero, 'codigo', v_mesa.codigo),
    'mais_pedido_hoje', (
      select i.produto_id from itens_pedido i join pedidos pd on pd.id = i.pedido_id
      where i.estabelecimento_id = v_est.id and pd.status <> 'recusado'
        and (pd.criado_em at time zone 'America/Sao_Paulo')::date = (now() at time zone 'America/Sao_Paulo')::date
      group by i.produto_id order by sum(i.qtd) desc limit 1),
    'categorias', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', c.id, 'nome', c.nome,
        'produtos', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', p.id, 'nome', p.nome, 'descricao', p.descricao,
            'preco', p.preco, 'preco_atual', preco_vigente(p.id),
            'foto_url', p.foto_url, 'tamanho_descricao', p.tamanho_descricao,
            'alergenicos', p.alergenicos, 'esgotado', p.esgotado,
            'ingredientes', p.ingredientes, 'preparo', p.preparo, 'opcoes', p.opcoes,
            'variacoes', coalesce((select jsonb_agg(jsonb_build_object('id', v.id, 'nome', v.nome, 'preco_delta', v.preco_delta) order by v.ordem)
                                   from variacoes v where v.produto_id = p.id and v.ativo), '[]'),
            'adicionais', coalesce((select jsonb_agg(jsonb_build_object('id', a.id, 'nome', a.nome, 'preco', a.preco) order by a.ordem)
                                    from adicionais a where a.produto_id = p.id and a.ativo), '[]'),
            'complementos', coalesce((select jsonb_agg(cp.sugerido_id) from complementos cp where cp.produto_id = p.id), '[]')
          ) order by p.ordem)
          from produtos p where p.categoria_id = c.id and p.ativo), '[]')
      ) order by c.ordem)
      from categorias c
      where c.estabelecimento_id = v_est.id and c.ativo
        and (c.disponivel_de is null or c.disponivel_ate is null
             or (c.disponivel_de <= c.disponivel_ate and v_hora between c.disponivel_de and c.disponivel_ate)
             or (c.disponivel_de >  c.disponivel_ate and (v_hora >= c.disponivel_de or v_hora <= c.disponivel_ate)))
    ), '[]')
  );
end $$;

grant execute on function obter_cardapio(text, text) to anon, authenticated;
