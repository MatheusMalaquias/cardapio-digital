-- A mesa é definida pelo link da tag/QR. A escolha manual de mesa passa a ser opcional
-- (decisão do dono) e vem DESLIGADA: sem ela, ninguém consegue listar os links das mesas.
alter table estabelecimentos
  add column permitir_escolher_mesa boolean not null default false;

create or replace function listar_mesas(p_slug text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'estabelecimento', jsonb_build_object('nome', e.nome, 'logo_url', e.logo_url, 'cor_destaque', e.cor_destaque),
    'permite_escolher', e.permitir_escolher_mesa,
    'mesas', case when e.permitir_escolher_mesa then coalesce((
      select jsonb_agg(jsonb_build_object('numero', m.numero, 'codigo', m.codigo) order by m.numero)
      from mesas m where m.estabelecimento_id = e.id and m.ativa), '[]'::jsonb)
    else '[]'::jsonb end)
  from estabelecimentos e where e.slug = p_slug
$$;
