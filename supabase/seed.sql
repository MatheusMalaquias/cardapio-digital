-- Dados de exemplo: Café Exemplo. Senha de todos os usuários de teste: Teste@1234
do $$
declare
  est uuid := '11111111-1111-1111-1111-111111111111';
  u_dono uuid := 'aaaaaaaa-0000-0000-0000-000000000001';
  u_garcom uuid := 'aaaaaaaa-0000-0000-0000-000000000002';
  u_cozinha uuid := 'aaaaaaaa-0000-0000-0000-000000000003';
  u_caixa uuid := 'aaaaaaaa-0000-0000-0000-000000000004';
  c_cafes uuid := gen_random_uuid(); c_salg uuid := gen_random_uuid();
  c_doces uuid := gen_random_uuid(); c_gel uuid := gen_random_uuid();
  v_user uuid; v_email text; v_i int;
begin
  -- Usuários de teste (GoTrue exige colunas de token como string vazia)
  for v_user, v_email in values
    (u_dono, 'dono@cafeexemplo.com'), (u_garcom, 'garcom@cafeexemplo.com'),
    (u_cozinha, 'cozinha@cafeexemplo.com'), (u_caixa, 'caixa@cafeexemplo.com')
  loop
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change, email_change_token_new)
    values ('00000000-0000-0000-0000-000000000000', v_user, 'authenticated', 'authenticated', v_email,
      crypt('Teste@1234', gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '');
    insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), v_user, v_user::text, 'email',
      jsonb_build_object('sub', v_user::text, 'email', v_email), now(), now(), now());
  end loop;

  insert into estabelecimentos (id, slug, nome, texto_beneficio, desconto_cadastro_pct, fidelidade_meta, fidelidade_premio, taxa_servico_pct, limite_espera_min)
  values (est, 'cafe-exemplo', 'Café Exemplo', '10% de desconto nesta visita ao se cadastrar', 10, 10, '10º café grátis', 10, 5);

  insert into equipe (user_id, estabelecimento_id, nome, papel) values
    (u_dono, est, 'Dona Maria', 'dono'), (u_garcom, est, 'João Garçom', 'garcom'),
    (u_cozinha, est, 'Ana Cozinha', 'cozinha'), (u_caixa, est, 'Carlos Caixa', 'caixa');

  for v_i in 1..10 loop
    insert into mesas (estabelecimento_id, numero, codigo, garcom_id)
    values (est, v_i, 'mesa' || v_i, u_garcom);
  end loop;

  insert into categorias (id, estabelecimento_id, nome, ordem) values
    (c_cafes, est, 'Cafés', 1), (c_salg, est, 'Salgados', 2), (c_doces, est, 'Doces', 3), (c_gel, est, 'Gelados', 4);

  -- Produtos (imagens placeholder)
  insert into produtos (estabelecimento_id, categoria_id, nome, descricao, preco, foto_url, tamanho_descricao, alergenicos, ordem) values
    (est, c_cafes, 'Espresso', 'Café intenso e encorpado.', 6.00, '/placeholders/cafes.svg', '50 ml', '{sem_gluten,sem_lactose,vegano}', 1),
    (est, c_cafes, 'Cappuccino', 'Espresso, leite vaporizado e espuma cremosa.', 12.00, '/placeholders/cafes.svg', '240 ml', '{sem_gluten}', 2),
    (est, c_cafes, 'Café com Leite', 'Café coado na hora com leite quente.', 9.00, '/placeholders/cafes.svg', '240 ml', '{sem_gluten}', 3),
    (est, c_cafes, 'Mocha', 'Espresso com chocolate e chantilly.', 15.00, '/placeholders/cafes.svg', '300 ml', '{sem_gluten}', 4),
    (est, c_salg, 'Pão de Queijo', 'Porção com 4 unidades quentinhas.', 14.00, '/placeholders/salgados.svg', '4 unidades', '{sem_gluten}', 1),
    (est, c_salg, 'Misto Quente', 'Pão de forma, presunto e queijo na chapa.', 16.00, '/placeholders/salgados.svg', '1 unidade', '{}', 2),
    (est, c_salg, 'Croissant de Queijo', 'Folhado amanteigado recheado com queijo.', 18.00, '/placeholders/salgados.svg', '1 unidade', '{}', 3),
    (est, c_salg, 'Torrada com Abacate', 'Pão de fermentação natural com abacate e limão.', 22.00, '/placeholders/salgados.svg', 'serve 1 pessoa', '{vegano,sem_lactose}', 4),
    (est, c_doces, 'Bolo de Cenoura', 'Fatia com cobertura de chocolate.', 13.00, '/placeholders/doces.svg', '1 fatia', '{}', 1),
    (est, c_doces, 'Brownie', 'Brownie de chocolate meio amargo.', 12.00, '/placeholders/doces.svg', '1 unidade', '{}', 2),
    (est, c_doces, 'Cheesecake', 'Cheesecake com calda de frutas vermelhas.', 20.00, '/placeholders/doces.svg', '1 fatia', '{sem_gluten}', 3),
    (est, c_doces, 'Pudim', 'Pudim de leite cremoso.', 11.00, '/placeholders/doces.svg', '1 fatia', '{sem_gluten}', 4),
    (est, c_gel, 'Cold Brew', 'Café extraído a frio por 18 horas.', 14.00, '/placeholders/gelados.svg', '300 ml', '{sem_gluten,sem_lactose,vegano}', 1),
    (est, c_gel, 'Frappé de Caramelo', 'Café batido com gelo, caramelo e chantilly.', 19.00, '/placeholders/gelados.svg', '400 ml', '{sem_gluten}', 2),
    (est, c_gel, 'Limonada Suíça', 'Limão batido com leite condensado.', 12.00, '/placeholders/gelados.svg', '400 ml', '{sem_gluten}', 3);

  update produtos p set ingredientes = v.i, preparo = v.s, opcoes = v.o::jsonb
    from (values
      ('Espresso', array['Café arábica 100%','Água filtrada']::text[], array['Moagem na hora','Extração a 9 bar por 28 segundos','Servido em xícara pré-aquecida']::text[], '[{"nome":"Açúcar","escolhas":["Sem açúcar","Pouco açúcar","Normal","Adoçante"]}]'),
      ('Cappuccino', array['Espresso','Leite integral','Espuma de leite','Cacau em pó']::text[], array['Extraímos o espresso','Vaporizamos o leite até a microespuma','Montamos em partes iguais e finalizamos com cacau']::text[], '[{"nome":"Açúcar","escolhas":["Sem açúcar","Pouco açúcar","Normal","Adoçante"]}]'),
      ('Café com Leite', array['Café coado','Leite integral']::text[], array['Coado na hora no papel','Leite aquecido a 65 °C','Servido na proporção 1 para 1']::text[], '[{"nome":"Açúcar","escolhas":["Sem açúcar","Pouco açúcar","Normal","Adoçante"]}]'),
      ('Mocha', array['Espresso','Chocolate belga','Leite','Chantilly']::text[], array['Derretemos o chocolate no espresso','Adicionamos o leite vaporizado','Finalizamos com chantilly']::text[], '[{"nome":"Açúcar","escolhas":["Sem açúcar","Pouco açúcar","Normal","Adoçante"]}]'),
      ('Pão de Queijo', array['Polvilho','Queijo minas curado','Ovos','Leite']::text[], array['Massa feita todos os dias','Assado até dourar','Servido quentinho']::text[], '[]'),
      ('Misto Quente', array['Pão de forma artesanal','Presunto','Queijo mussarela','Manteiga']::text[], array['Montado com queijo dos dois lados','Grelhado na chapa com manteiga','Cortado na diagonal']::text[], '[{"nome":"Ponto","escolhas":["Normal","Bem tostado"]}]'),
      ('Croissant de Queijo', array['Massa folhada com manteiga','Queijo prato']::text[], array['Massa laminada em 27 camadas','Recheado com queijo','Assado na hora']::text[], '[]'),
      ('Torrada com Abacate', array['Pão de fermentação natural','Abacate','Limão','Sal rosa','Pimenta calabresa']::text[], array['Pão tostado na chapa','Abacate amassado com limão e sal','Finalizado com pimenta']::text[], '[{"nome":"Pimenta","escolhas":["Com pimenta","Sem pimenta"]}]'),
      ('Bolo de Cenoura', array['Cenoura','Ovos','Farinha de trigo','Açúcar','Cobertura de chocolate']::text[], array['Cenoura batida com os ovos','Assado em forma baixa','Coberto com chocolate quente']::text[], '[]'),
      ('Brownie', array['Chocolate meio amargo','Manteiga','Ovos','Nozes']::text[], array['Chocolate derretido com manteiga','Assado até ficar úmido por dentro','Servido morno']::text[], '[{"nome":"Servir","escolhas":["Morno","Ao natural"]}]'),
      ('Cheesecake', array['Cream cheese','Biscoito','Manteiga','Frutas vermelhas']::text[], array['Base de biscoito crocante','Creme assado em banho-maria','Calda de frutas vermelhas por cima']::text[], '[]'),
      ('Pudim', array['Leite condensado','Leite','Ovos','Caramelo']::text[], array['Misturamos tudo no liquidificador','Assado em banho-maria','Gelado por 8 horas']::text[], '[]'),
      ('Cold Brew', array['Café moído grosso','Água filtrada','Gelo']::text[], array['Café infundido a frio por 18 horas','Filtrado em papel','Servido sobre gelo']::text[], '[{"nome":"Açúcar","escolhas":["Sem açúcar","Pouco açúcar","Normal","Adoçante"]},{"nome":"Gelo","escolhas":["Normal","Pouco gelo","Sem gelo"]}]'),
      ('Frappé de Caramelo', array['Espresso','Gelo','Leite','Calda de caramelo','Chantilly']::text[], array['Batemos espresso, leite e gelo','Calda de caramelo no copo','Finalizamos com chantilly']::text[], '[{"nome":"Açúcar","escolhas":["Sem açúcar","Pouco açúcar","Normal","Adoçante"]},{"nome":"Gelo","escolhas":["Normal","Pouco gelo","Sem gelo"]}]'),
      ('Limonada Suíça', array['Limão taiti com casca','Leite condensado','Gelo']::text[], array['Limão batido rapidamente com a casca','Coado e adoçado com leite condensado','Servido bem gelado']::text[], '[{"nome":"Gelo","escolhas":["Normal","Pouco gelo","Sem gelo"]}]')
    ) as v(nome, i, s, o)
   where p.nome = v.nome and p.estabelecimento_id = est;

  -- Variações (tamanho) e adicionais
  insert into variacoes (estabelecimento_id, produto_id, nome, preco_delta, ordem)
  select est, p.id, v.nome, v.delta, v.ordem from produtos p
  cross join (values ('P', 0::numeric, 1), ('M', 3::numeric, 2), ('G', 6::numeric, 3)) as v(nome, delta, ordem)
  where p.nome in ('Cappuccino', 'Café com Leite', 'Mocha', 'Cold Brew', 'Frappé de Caramelo');

  insert into adicionais (estabelecimento_id, produto_id, nome, preco, ordem)
  select est, p.id, a.nome, a.preco, a.ordem from produtos p
  cross join (values ('Shot extra de espresso', 4::numeric, 1), ('Leite de aveia', 3::numeric, 2), ('Chantilly', 2::numeric, 3)) as a(nome, preco, ordem)
  where p.nome in ('Cappuccino', 'Café com Leite', 'Mocha');

  insert into adicionais (estabelecimento_id, produto_id, nome, preco, ordem)
  select est, p.id, 'Queijo extra', 4, 1 from produtos p where p.nome in ('Misto Quente', 'Croissant de Queijo');

  -- Combina com
  insert into complementos (estabelecimento_id, produto_id, sugerido_id)
  select est, a.id, b.id from produtos a, produtos b
  where (a.nome, b.nome) in (('Cappuccino', 'Pão de Queijo'), ('Café com Leite', 'Pão de Queijo'),
                             ('Espresso', 'Brownie'), ('Cold Brew', 'Cheesecake'));

  -- Promoção ativa: Cappuccino em promoção agora (vale por 1 ano)
  insert into promocoes (estabelecimento_id, produto_id, titulo, preco_promocional, inicio, fim)
  select est, id, 'Cappuccino em promoção', 9.90, now() - interval '1 day', now() + interval '365 days'
  from produtos where nome = 'Cappuccino';

  -- Histórico para as métricas: ~120 pedidos entregues em 30 dias
  declare
    v_mesa uuid; v_com uuid; v_ped uuid; v_prod record; v_t timestamptz; v_n int; v_q int;
  begin
    for v_i in 1..120 loop
      select id into v_mesa from mesas where estabelecimento_id = est order by random() limit 1;
      v_t := date_trunc('day', now()) - (random() * 29 || ' days')::interval
             + ((8 + floor(random() * 11)) || ' hours')::interval + (floor(random() * 60) || ' minutes')::interval;
      insert into comandas (estabelecimento_id, mesa_id, status, taxa_servico, forma_pagamento, total, aberta_em, fechada_em)
      values (est, v_mesa, 'fechada', 0, (array['dinheiro','pix','debito','credito'])[1 + floor(random() * 4)::int]::forma_pagamento,
              0, v_t, v_t + interval '50 minutes') returning id into v_com;
      insert into pedidos (estabelecimento_id, comanda_id, sessao_id, garcom_id, status, criado_em, confirmado_em, preparo_em, pronto_em, entregue_em)
      values (est, v_com, gen_random_uuid(), u_garcom, 'entregue', v_t,
              v_t + ((1 + random() * 3) || ' minutes')::interval,
              v_t + ((3 + random() * 3) || ' minutes')::interval,
              v_t + ((8 + random() * 8) || ' minutes')::interval,
              v_t + ((11 + random() * 10) || ' minutes')::interval) returning id into v_ped;
      v_n := 1 + floor(random() * 3)::int;
      for v_prod in select id, nome, preco from produtos where estabelecimento_id = est order by random() limit v_n loop
        v_q := 1 + floor(random() * 2)::int;
        insert into itens_pedido (estabelecimento_id, pedido_id, produto_id, nome, qtd, preco_unitario)
        values (est, v_ped, v_prod.id, v_prod.nome, v_q, v_prod.preco);
        insert into eventos (estabelecimento_id, sessao_id, tipo, produto_id, criado_em) values (est, gen_random_uuid(), 'adicionou', v_prod.id, v_t);
      end loop;
      update comandas set taxa_servico = round((select sum(qtd * preco_unitario) from itens_pedido where pedido_id = v_ped) * 0.10, 2),
             total = round((select sum(qtd * preco_unitario) from itens_pedido where pedido_id = v_ped) * 1.10, 2) where id = v_com;
    end loop;
    -- clientes cadastrados que já voltaram, ligados a comandas antigas
    insert into clientes (estabelecimento_id, nome, whatsapp, aniversario, consentimento_em, selos, ultima_visita) values
      (est, 'Beatriz Souza', '11988880001', '1992-10-15', now() - interval '20 days', 4, now() - interval '2 days'),
      (est, 'Rafael Lima', '11988880002', '1988-03-02', now() - interval '15 days', 2, now() - interval '5 days'),
      (est, 'Camila Alves', '11988880003', null, null, 1, now() - interval '12 days'),
      (est, 'Pedro Santos', '11988880004', '1995-10-28', now() - interval '25 days', 6, now() - interval '1 days');
    update comandas c set cliente_id = (select id from clientes where estabelecimento_id = est order by random() limit 1)
     where c.estabelecimento_id = est and random() < 0.2;
    -- pedido de hoje para o selo "Mais pedido hoje" (Cappuccino)
    insert into comandas (estabelecimento_id, mesa_id, status, taxa_servico, forma_pagamento, total, aberta_em, fechada_em)
    select est, id, 'fechada', 3.0, 'pix', 33, now() - interval '30 minutes', now() - interval '5 minutes' from mesas where numero = 1;
    insert into pedidos (estabelecimento_id, comanda_id, sessao_id, garcom_id, status, criado_em, confirmado_em, preparo_em, pronto_em, entregue_em)
    select est, c.id, gen_random_uuid(), u_garcom, 'entregue', now() - interval '28 minutes', now() - interval '26 minutes',
           now() - interval '25 minutes', now() - interval '18 minutes', now() - interval '15 minutes'
      from comandas c order by c.aberta_em desc limit 1;
    insert into itens_pedido (estabelecimento_id, pedido_id, produto_id, nome, qtd, preco_unitario)
    select est, (select id from pedidos order by criado_em desc limit 1), id, nome, 3, 9.90 from produtos where nome = 'Cappuccino';
    -- visualizações (muito visto, pouco pedido)
    insert into eventos (estabelecimento_id, sessao_id, tipo, produto_id, criado_em)
    select est, gen_random_uuid(), 'viu_produto', p.id, now() - (random() * 29 || ' days')::interval
    from produtos p, generate_series(1, 40);
  end;
end $$;
