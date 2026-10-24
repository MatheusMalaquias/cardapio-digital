-- Números reais de uso, para README / currículo / LinkedIn.
-- Rode no SQL Editor do Supabase (produção). Ajuste o período em `dias`.
with p as (select 30 as dias, now() - interval '30 days' as ini)
select
  (select count(*) from estabelecimentos)                                           as estabelecimentos,
  (select count(distinct estabelecimento_id) from pedidos, p where criado_em >= p.ini) as estabelecimentos_com_pedido,
  (select count(distinct sessao_id) from eventos, p
     where tipo = 'abriu_cardapio' and criado_em >= p.ini)                          as acessos_unicos,
  (select count(*) from eventos, p where tipo = 'abriu_cardapio' and criado_em >= p.ini) as aberturas_do_cardapio,
  (select count(*) from pedidos, p where status <> 'recusado' and criado_em >= p.ini)    as pedidos,
  (select count(*) from comandas, p where status = 'fechada' and fechada_em >= p.ini)    as comandas_fechadas,
  (select coalesce(sum(total), 0) from comandas, p where status = 'fechada' and fechada_em >= p.ini) as faturamento,
  (select round(avg(extract(epoch from confirmado_em - criado_em))) from pedidos, p
     where confirmado_em is not null and criado_em >= p.ini)                        as segundos_ate_confirmar,
  (select count(*) from clientes where consentimento_em is not null)                as clientes_com_consentimento;
