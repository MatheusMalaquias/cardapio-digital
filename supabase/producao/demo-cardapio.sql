-- Cardápio de DEMONSTRAÇÃO para o seu café em produção (4 categorias, 15 produtos,
-- variações, adicionais, "combina com" e 1 promoção). Não cria usuários nem pedidos.
-- Rode no SQL Editor do Supabase DEPOIS do bootstrap.sql. Troque só o v_slug.
-- Para apagar depois: delete from categorias where estabelecimento_id = (select id from estabelecimentos where slug = 'meu-cafe');
do $$
declare
  v_slug text := 'meu-cafe';
  est uuid;
  c_cafes uuid := gen_random_uuid(); c_salg uuid := gen_random_uuid();
  c_doces uuid := gen_random_uuid(); c_gel uuid := gen_random_uuid();
begin
  select id into est from estabelecimentos where slug = v_slug;
  if est is null then raise exception 'Café "%" não existe. Rode o bootstrap.sql antes.', v_slug; end if;
  if exists (select 1 from produtos where estabelecimento_id = est) then
    raise exception 'Este café já tem produtos. Nada foi inserido.';
  end if;

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
  where p.estabelecimento_id = est and p.nome in ('Cappuccino', 'Café com Leite', 'Mocha', 'Cold Brew', 'Frappé de Caramelo');

  insert into adicionais (estabelecimento_id, produto_id, nome, preco, ordem)
  select est, p.id, a.nome, a.preco, a.ordem from produtos p
  cross join (values ('Shot extra de espresso', 4::numeric, 1), ('Leite de aveia', 3::numeric, 2), ('Chantilly', 2::numeric, 3)) as a(nome, preco, ordem)
  where p.estabelecimento_id = est and p.nome in ('Cappuccino', 'Café com Leite', 'Mocha');

  insert into adicionais (estabelecimento_id, produto_id, nome, preco, ordem)
  select est, p.id, 'Queijo extra', 4, 1 from produtos p where p.estabelecimento_id = est and p.nome in ('Misto Quente', 'Croissant de Queijo');

  -- Combina com
  insert into complementos (estabelecimento_id, produto_id, sugerido_id)
  select est, a.id, b.id from produtos a, produtos b
  where a.estabelecimento_id = est and b.estabelecimento_id = est and (a.nome, b.nome) in (('Cappuccino', 'Pão de Queijo'), ('Café com Leite', 'Pão de Queijo'),
                             ('Espresso', 'Brownie'), ('Cold Brew', 'Cheesecake'));

  -- Promoção ativa: Cappuccino em promoção agora (vale por 1 ano)
  insert into promocoes (estabelecimento_id, produto_id, titulo, preco_promocional, inicio, fim)
  select est, id, 'Cappuccino em promoção', 9.90, now() - interval '1 day', now() + interval '365 days'
  from produtos where estabelecimento_id = est and nome = 'Cappuccino';
end $$;
