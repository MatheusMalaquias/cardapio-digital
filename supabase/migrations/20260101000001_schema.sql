-- Cardápio Digital: schema base (multi-estabelecimento)
create extension if not exists pgcrypto;

create type papel_equipe as enum ('garcom', 'cozinha', 'caixa', 'dono');
create type status_comanda as enum ('aberta', 'conta_pedida', 'fechada');
create type status_pedido as enum ('pendente', 'recusado', 'confirmado', 'em_preparo', 'pronto', 'entregue');
create type tipo_chamado as enum ('garcom', 'conta');
create type tipo_evento as enum ('abriu_cardapio', 'viu_produto', 'adicionou');
create type forma_pagamento as enum ('dinheiro', 'pix', 'debito', 'credito');
create type publico_campanha as enum ('todos', 'ausentes', 'aniversariantes');
create type status_campanha as enum ('rascunho', 'agendada');

create table estabelecimentos (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  nome text not null,
  logo_url text,
  cor_destaque text not null default '#B23A0F' check (cor_destaque ~ '^#[0-9A-Fa-f]{6}$'),
  texto_beneficio text,
  desconto_cadastro_pct numeric(5,2) not null default 0,
  fidelidade_meta int not null default 10,
  fidelidade_premio text default 'Café grátis',
  taxa_servico_pct numeric(5,2) not null default 10,
  limite_espera_min int not null default 5,
  politica_privacidade_url text,
  criado_em timestamptz not null default now()
);

create table equipe (
  user_id uuid not null references auth.users(id) on delete cascade,
  estabelecimento_id uuid not null references estabelecimentos(id) on delete cascade,
  nome text not null,
  papel papel_equipe not null,
  criado_em timestamptz not null default now(),
  primary key (user_id, estabelecimento_id)
);
create index on equipe (estabelecimento_id);

create table mesas (
  id uuid primary key default gen_random_uuid(),
  estabelecimento_id uuid not null references estabelecimentos(id) on delete cascade,
  numero int not null,
  codigo text not null,
  garcom_id uuid references auth.users(id) on delete set null,
  ativa boolean not null default true,
  unique (estabelecimento_id, codigo),
  unique (estabelecimento_id, numero)
);

create table categorias (
  id uuid primary key default gen_random_uuid(),
  estabelecimento_id uuid not null references estabelecimentos(id) on delete cascade,
  nome text not null,
  ordem int not null default 0,
  disponivel_de time,
  disponivel_ate time,
  ativo boolean not null default true
);
create index on categorias (estabelecimento_id, ordem);

create table produtos (
  id uuid primary key default gen_random_uuid(),
  estabelecimento_id uuid not null references estabelecimentos(id) on delete cascade,
  categoria_id uuid not null references categorias(id) on delete cascade,
  nome text not null,
  descricao text,
  preco numeric(10,2) not null check (preco >= 0),
  foto_url text,
  tamanho_descricao text,
  alergenicos text[] not null default '{}',   -- 'sem_gluten','sem_lactose','vegano'
  ativo boolean not null default true,
  esgotado boolean not null default false,
  ordem int not null default 0,
  ingredientes text[] not null default '{}',
  preparo text[] not null default '{}',       -- passos do "como é feito"
  opcoes jsonb not null default '[]',         -- [{"nome":"Açúcar","escolhas":["Sem açúcar","Normal"]}]
  modelo_3d_url text,                         -- ponto de extensão (fora do escopo)
  criado_em timestamptz not null default now()
);
create index on produtos (estabelecimento_id, categoria_id, ordem);

create table variacoes (
  id uuid primary key default gen_random_uuid(),
  estabelecimento_id uuid not null references estabelecimentos(id) on delete cascade,
  produto_id uuid not null references produtos(id) on delete cascade,
  nome text not null,
  preco_delta numeric(10,2) not null default 0,
  ordem int not null default 0,
  ativo boolean not null default true
);
create index on variacoes (produto_id);

create table adicionais (
  id uuid primary key default gen_random_uuid(),
  estabelecimento_id uuid not null references estabelecimentos(id) on delete cascade,
  produto_id uuid not null references produtos(id) on delete cascade,
  nome text not null,
  preco numeric(10,2) not null default 0,
  ordem int not null default 0,
  ativo boolean not null default true
);
create index on adicionais (produto_id);

create table complementos (
  id uuid primary key default gen_random_uuid(),
  estabelecimento_id uuid not null references estabelecimentos(id) on delete cascade,
  produto_id uuid not null references produtos(id) on delete cascade,
  sugerido_id uuid not null references produtos(id) on delete cascade,
  unique (produto_id, sugerido_id)
);

create table promocoes (
  id uuid primary key default gen_random_uuid(),
  estabelecimento_id uuid not null references estabelecimentos(id) on delete cascade,
  produto_id uuid not null references produtos(id) on delete cascade,
  titulo text,
  preco_promocional numeric(10,2) not null check (preco_promocional >= 0),
  inicio timestamptz not null,
  fim timestamptz not null,
  hora_de time,
  hora_ate time,
  dias_semana int[],                          -- 0=domingo .. 6=sábado; null = todos
  ativo boolean not null default true
);
create index on promocoes (produto_id);

create table clientes (
  id uuid primary key default gen_random_uuid(),
  estabelecimento_id uuid not null references estabelecimentos(id) on delete cascade,
  sessao_id uuid,
  nome text not null,
  whatsapp text not null,
  aniversario date,
  consentimento_em timestamptz,
  descadastrado_em timestamptz,
  selos int not null default 0,
  ultima_visita timestamptz,
  criado_em timestamptz not null default now(),
  unique (estabelecimento_id, whatsapp)
);

create table comandas (
  id uuid primary key default gen_random_uuid(),
  estabelecimento_id uuid not null references estabelecimentos(id) on delete cascade,
  mesa_id uuid not null references mesas(id),
  cliente_id uuid references clientes(id) on delete set null,
  status status_comanda not null default 'aberta',
  desconto numeric(10,2) not null default 0,
  taxa_servico numeric(10,2) not null default 0,
  forma_pagamento forma_pagamento,
  total numeric(10,2),
  aberta_em timestamptz not null default now(),
  conta_pedida_em timestamptz,
  fechada_em timestamptz
);
-- uma única comanda em aberto por mesa
create unique index comanda_unica_aberta on comandas (mesa_id) where status <> 'fechada';
create index on comandas (estabelecimento_id, status);

create table pedidos (
  id uuid primary key default gen_random_uuid(),
  estabelecimento_id uuid not null references estabelecimentos(id) on delete cascade,
  comanda_id uuid not null references comandas(id) on delete cascade,
  sessao_id uuid not null,
  cliente_id uuid references clientes(id) on delete set null,
  garcom_id uuid references auth.users(id) on delete set null,
  status status_pedido not null default 'pendente',
  motivo_recusa text,
  criado_em timestamptz not null default now(),
  confirmado_em timestamptz,
  preparo_em timestamptz,
  pronto_em timestamptz,
  entregue_em timestamptz,
  recusado_em timestamptz
);
create index on pedidos (estabelecimento_id, status);
create index on pedidos (comanda_id);

create table itens_pedido (
  id uuid primary key default gen_random_uuid(),
  estabelecimento_id uuid not null references estabelecimentos(id) on delete cascade,
  pedido_id uuid not null references pedidos(id) on delete cascade,
  produto_id uuid not null references produtos(id),
  nome text not null,                          -- snapshot do nome
  qtd int not null check (qtd > 0),
  preco_unitario numeric(10,2) not null,       -- preço do momento (com variação e adicionais)
  variacao jsonb,
  adicionais jsonb not null default '[]',
  especificacoes jsonb not null default '{}',  -- escolhas das opções (ex.: Açúcar = Sem açúcar)
  observacao text
);
create index on itens_pedido (pedido_id);

create table pagamentos_comanda (
  id uuid primary key default gen_random_uuid(),
  estabelecimento_id uuid not null references estabelecimentos(id) on delete cascade,
  comanda_id uuid not null references comandas(id) on delete cascade,
  forma forma_pagamento not null,
  valor numeric(10,2) not null check (valor >= 0),
  criado_em timestamptz not null default now()
);

create table chamados (
  id uuid primary key default gen_random_uuid(),
  estabelecimento_id uuid not null references estabelecimentos(id) on delete cascade,
  mesa_id uuid not null references mesas(id) on delete cascade,
  sessao_id uuid,
  tipo tipo_chamado not null,
  criado_em timestamptz not null default now(),
  a_caminho_em timestamptz,
  atendido_em timestamptz,
  garcom_id uuid references auth.users(id) on delete set null
);
create index on chamados (estabelecimento_id, atendido_em);

create table eventos (
  id bigint generated always as identity primary key,
  estabelecimento_id uuid not null references estabelecimentos(id) on delete cascade,
  sessao_id uuid not null,
  tipo tipo_evento not null,
  produto_id uuid references produtos(id) on delete set null,
  criado_em timestamptz not null default now()
);
create index on eventos (estabelecimento_id, criado_em);

create table campanhas (
  id uuid primary key default gen_random_uuid(),
  estabelecimento_id uuid not null references estabelecimentos(id) on delete cascade,
  titulo text not null,
  mensagem text not null,
  publico publico_campanha not null default 'todos',
  dias_ausente int,
  status status_campanha not null default 'rascunho',
  agendada_para timestamptz,
  criado_em timestamptz not null default now()
);

create table rate_limit (
  sessao_id uuid not null,
  acao text not null,
  criado_em timestamptz not null default now()
);
create index on rate_limit (sessao_id, acao, criado_em);

-- Carimba cada etapa do pedido automaticamente (alimenta as métricas de tempo)
create function carimbar_status_pedido() returns trigger language plpgsql as $$
begin
  if new.status is distinct from old.status then
    case new.status
      when 'confirmado' then new.confirmado_em := coalesce(new.confirmado_em, now());
      when 'em_preparo' then new.preparo_em := coalesce(new.preparo_em, now());
      when 'pronto' then new.pronto_em := coalesce(new.pronto_em, now());
      when 'entregue' then new.entregue_em := coalesce(new.entregue_em, now());
      when 'recusado' then new.recusado_em := coalesce(new.recusado_em, now());
      else null;
    end case;
  end if;
  return new;
end $$;
create trigger pedidos_carimbo before update on pedidos
  for each row execute function carimbar_status_pedido();
