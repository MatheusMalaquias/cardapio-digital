-- Palavras que são endereços do sistema não podem ser o "slug" de um café.
alter table estabelecimentos
  add constraint slug_nao_reservado
  check (slug not in ('painel', 'gestao', 'login', 'api', 'auth', 'redefinir-senha', '_next'));

-- Tela de escolha de mesa: nome do café e mesas ativas (número + código do link).
create function listar_mesas(p_slug text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'estabelecimento', jsonb_build_object('nome', e.nome, 'logo_url', e.logo_url, 'cor_destaque', e.cor_destaque),
    'mesas', coalesce((
      select jsonb_agg(jsonb_build_object('numero', m.numero, 'codigo', m.codigo) order by m.numero)
      from mesas m where m.estabelecimento_id = e.id and m.ativa), '[]'::jsonb))
  from estabelecimentos e where e.slug = p_slug
$$;

grant execute on function listar_mesas(text) to anon, authenticated;
