-- Início seguro em PRODUÇÃO (rode no SQL Editor do Supabase, uma única vez).
--
-- NUNCA rode o supabase/seed.sql em produção: ele cria usuários de teste com senha conhecida.
--
-- Antes: em Authentication > Users > "Add user", crie o dono com e-mail e uma senha forte
-- (marque "Auto Confirm User"). Depois preencha os 3 valores abaixo e execute.
do $$
declare
  v_email text := 'SEU_EMAIL_AQUI';        -- o mesmo e-mail do usuário criado no painel
  v_slug  text := 'meu-cafe';              -- vai na URL: /meu-cafe/mesa/...  (só a-z, 0-9 e hífen)
  v_nome  text := 'Nome do Café';
  v_mesas int  := 5;                       -- quantas mesas criar
  v_user uuid; v_est uuid;
begin
  select id into v_user from auth.users where email = v_email;
  if v_user is null then
    raise exception 'Usuário % não existe. Crie em Authentication > Users antes.', v_email;
  end if;

  insert into estabelecimentos (slug, nome) values (v_slug, v_nome) returning id into v_est;
  insert into equipe (user_id, estabelecimento_id, nome, papel) values (v_user, v_est, 'Dono', 'dono');

  -- códigos de mesa imprevisíveis: ninguém adivinha o link de outra mesa
  insert into mesas (estabelecimento_id, numero, codigo)
  select v_est, n, 'm' || n || '-' || substr(md5(random()::text || clock_timestamp()::text), 1, 6)
  from generate_series(1, v_mesas) n;

  raise notice 'Pronto. Entre no painel com %, depois cadastre categorias e produtos em Admin.', v_email;
end $$;
