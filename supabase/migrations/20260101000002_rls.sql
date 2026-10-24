-- RLS em todas as tabelas. Cliente anônimo só lê o cardápio público;
-- todo o resto dele passa por funções RPC (security definer).

create function meu_estabelecimento() returns uuid
language sql stable security definer set search_path = public as $$
  select estabelecimento_id from equipe where user_id = auth.uid() limit 1
$$;

create function meu_papel() returns papel_equipe
language sql stable security definer set search_path = public as $$
  select papel from equipe where user_id = auth.uid() limit 1
$$;

create function tenho_papel(variadic papeis papel_equipe[]) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(meu_papel() = any(papeis), false)
$$;

alter table estabelecimentos enable row level security;
alter table equipe enable row level security;
alter table mesas enable row level security;
alter table categorias enable row level security;
alter table produtos enable row level security;
alter table variacoes enable row level security;
alter table adicionais enable row level security;
alter table complementos enable row level security;
alter table promocoes enable row level security;
alter table clientes enable row level security;
alter table comandas enable row level security;
alter table pedidos enable row level security;
alter table itens_pedido enable row level security;
alter table pagamentos_comanda enable row level security;
alter table chamados enable row level security;
alter table eventos enable row level security;
alter table campanhas enable row level security;
alter table rate_limit enable row level security;  -- sem policies: só RPC acessa

-- Dados públicos do cardápio (apenas leitura)
create policy est_publico on estabelecimentos for select using (true);
create policy est_dono_update on estabelecimentos for update
  using (id = meu_estabelecimento() and tenho_papel('dono'));

create policy cat_leitura on categorias for select
  using (ativo or estabelecimento_id = meu_estabelecimento());
create policy prod_leitura on produtos for select
  using (ativo or estabelecimento_id = meu_estabelecimento());
create policy var_leitura on variacoes for select
  using (ativo or estabelecimento_id = meu_estabelecimento());
create policy add_leitura on adicionais for select
  using (ativo or estabelecimento_id = meu_estabelecimento());
create policy comp_leitura on complementos for select using (true);
create policy promo_leitura on promocoes for select using (true);

-- Escrita no cardápio: dono
create policy cat_escrita on categorias for all
  using (estabelecimento_id = meu_estabelecimento() and tenho_papel('dono'))
  with check (estabelecimento_id = meu_estabelecimento() and tenho_papel('dono'));
create policy prod_escrita on produtos for all
  using (estabelecimento_id = meu_estabelecimento() and tenho_papel('dono'))
  with check (estabelecimento_id = meu_estabelecimento() and tenho_papel('dono'));
create policy var_escrita on variacoes for all
  using (estabelecimento_id = meu_estabelecimento() and tenho_papel('dono'))
  with check (estabelecimento_id = meu_estabelecimento() and tenho_papel('dono'));
create policy add_escrita on adicionais for all
  using (estabelecimento_id = meu_estabelecimento() and tenho_papel('dono'))
  with check (estabelecimento_id = meu_estabelecimento() and tenho_papel('dono'));
create policy comp_escrita on complementos for all
  using (estabelecimento_id = meu_estabelecimento() and tenho_papel('dono'))
  with check (estabelecimento_id = meu_estabelecimento() and tenho_papel('dono'));
create policy promo_escrita on promocoes for all
  using (estabelecimento_id = meu_estabelecimento() and tenho_papel('dono'))
  with check (estabelecimento_id = meu_estabelecimento() and tenho_papel('dono'));

-- Equipe
create policy equipe_leitura on equipe for select
  using (user_id = auth.uid() or estabelecimento_id = meu_estabelecimento());
create policy equipe_escrita on equipe for all
  using (estabelecimento_id = meu_estabelecimento() and tenho_papel('dono'))
  with check (estabelecimento_id = meu_estabelecimento() and tenho_papel('dono'));

-- Mesas
create policy mesas_leitura on mesas for select using (estabelecimento_id = meu_estabelecimento());
create policy mesas_escrita on mesas for all
  using (estabelecimento_id = meu_estabelecimento() and tenho_papel('dono'))
  with check (estabelecimento_id = meu_estabelecimento() and tenho_papel('dono'));

-- Operação: leitura pela equipe do estabelecimento
create policy clientes_leitura on clientes for select
  using (estabelecimento_id = meu_estabelecimento() and tenho_papel('dono', 'caixa', 'garcom'));
create policy comandas_leitura on comandas for select using (estabelecimento_id = meu_estabelecimento());
create policy pedidos_leitura on pedidos for select using (estabelecimento_id = meu_estabelecimento());
create policy itens_leitura on itens_pedido for select using (estabelecimento_id = meu_estabelecimento());
create policy pagamentos_leitura on pagamentos_comanda for select
  using (estabelecimento_id = meu_estabelecimento() and tenho_papel('dono', 'caixa'));
create policy chamados_leitura on chamados for select using (estabelecimento_id = meu_estabelecimento());
create policy eventos_leitura on eventos for select
  using (estabelecimento_id = meu_estabelecimento() and tenho_papel('dono'));
create policy campanhas_leitura on campanhas for select
  using (estabelecimento_id = meu_estabelecimento() and tenho_papel('dono'));

-- Operação: escrita por papel
create policy pedidos_atualiza on pedidos for update
  using (estabelecimento_id = meu_estabelecimento() and tenho_papel('garcom', 'cozinha', 'dono'));
create policy comandas_atualiza on comandas for update
  using (estabelecimento_id = meu_estabelecimento() and tenho_papel('garcom', 'caixa', 'dono'));
create policy pagamentos_insere on pagamentos_comanda for insert
  with check (estabelecimento_id = meu_estabelecimento() and tenho_papel('caixa', 'dono'));
create policy chamados_atualiza on chamados for update
  using (estabelecimento_id = meu_estabelecimento() and tenho_papel('garcom', 'dono'));
create policy clientes_atualiza on clientes for update
  using (estabelecimento_id = meu_estabelecimento() and tenho_papel('dono', 'caixa'));
create policy campanhas_escrita on campanhas for all
  using (estabelecimento_id = meu_estabelecimento() and tenho_papel('dono'))
  with check (estabelecimento_id = meu_estabelecimento() and tenho_papel('dono'));

-- Realtime para as telas da equipe (respeita RLS)
alter publication supabase_realtime add table pedidos, chamados, comandas, produtos;

-- Storage: fotos dos produtos (leitura pública, escrita só do dono no seu prefixo)
insert into storage.buckets (id, name, public) values ('produtos', 'produtos', true)
  on conflict do nothing;
create policy "fotos leitura" on storage.objects for select using (bucket_id = 'produtos');
create policy "fotos escrita dono" on storage.objects for all
  using (bucket_id = 'produtos' and tenho_papel('dono')
         and (storage.foldername(name))[1] = meu_estabelecimento()::text)
  with check (bucket_id = 'produtos' and tenho_papel('dono')
         and (storage.foldername(name))[1] = meu_estabelecimento()::text);
