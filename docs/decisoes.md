# Log de decisões

Registro das decisões de arquitetura e de produto, no formato **contexto → decisão → consequência**.
Escrito ao longo do desenvolvimento, uma entrada por decisão importante (mais recente no fim).

---

## D01 · Um banco para vários estabelecimentos (multi-tenant com RLS)
**Contexto.** O app vai atender vários cafés. Isolar por banco ou por schema custaria caro e complicaria o deploy.
**Decisão.** Um único Postgres. Toda tabela de negócio tem `estabelecimento_id`, e o isolamento é garantido por Row Level Security, com as funções `meu_estabelecimento()` e `tenho_papel()`.
**Consequência.** Isolamento garantido pelo banco, não pelo código da aplicação. Em contrapartida, cada nova tabela precisa nascer com RLS.

## D02 · O cliente anônimo nunca escreve direto nas tabelas
**Contexto.** O cliente não tem login. Se o navegador pudesse inserir pedidos direto, bastaria alterar o preço no DevTools.
**Decisão.** Cliente só lê o cardápio (policies de `select`). Pedido, chamado, evento e perfil passam por funções RPC `security definer` (`enviar_pedido`, `criar_chamado`…) que validam slug, mesa, comanda aberta e **recalculam o preço no servidor**.
**Consequência.** Preço enviado pelo navegador é ignorado. A regra de negócio fica concentrada em SQL, o que exige disciplina de testes.

## D03 · Limite de taxa dentro do banco
**Contexto.** Qualquer pessoa com o link da mesa poderia inundar a cozinha de pedidos falsos.
**Decisão.** Tabela `rate_limit` consultada pelas RPCs (5 pedidos / 10 min e 10 chamados / 10 min por sessão). Além disso, todo pedido nasce `pendente` e só a confirmação do garçom o envia à cozinha.
**Consequência.** Sem Redis nem serviço extra. O limite é por sessão do navegador, então não impede quem apaga os dados do navegador; a confirmação do garçom é a segunda barreira.

## D04 · Status ao vivo do cliente por polling, não por Realtime
**Contexto.** Cliente anônimo não consegue assinar tabelas protegidas por RLS no Supabase Realtime sem abrir uma brecha.
**Decisão.** A equipe usa Realtime (autenticada, filtrado por RLS). O cliente consulta `obter_comanda` a cada 4–8 s.
**Consequência.** Atraso de poucos segundos para o cliente, aceitável para status de pedido. Troca futura possível por Realtime Broadcast.

## D05 · Timestamps de etapa gerados por trigger
**Contexto.** As métricas de tempo (confirmação, preparo, atendimento) dependem de saber quando cada etapa aconteceu.
**Decisão.** Trigger `carimbar_status_pedido` preenche `confirmado_em`, `preparo_em`, `pronto_em`, `entregue_em` a cada mudança de status.
**Consequência.** Os tempos são confiáveis mesmo que o front esqueça de enviá-los.

## D06 · Preço do momento guardado no item do pedido
**Contexto.** Alterar o preço no admin não pode mudar pedidos antigos.
**Decisão.** `itens_pedido` guarda `nome` e `preco_unitario` como foram vendidos (já com variação e adicionais).
**Consequência.** Histórico e faturamento corretos. Custa um pouco de duplicação de dados.

## D07 · Variação como acréscimo (`preco_delta`)
**Contexto.** Variações como P/M/G poderiam ter preço absoluto ou acréscimo.
**Decisão.** Acréscimo sobre o preço base.
**Consequência.** A promoção do produto continua valendo para todos os tamanhos.

## D08 · Uma comanda aberta por mesa, garantida por índice parcial
**Contexto.** Várias pessoas na mesma mesa devem compartilhar a mesma comanda, sem duplicar em pedidos simultâneos.
**Decisão.** `create unique index … on comandas (mesa_id) where status <> 'fechada'`.
**Consequência.** O banco impede duas comandas abertas na mesma mesa. Fechar a comanda libera a mesa.

## D09 · Fechamento da conta em uma função transacional
**Contexto.** Fechar envolve conferir itens, aplicar desconto e taxa, registrar pagamentos, dar selo de fidelidade e encerrar chamados.
**Decisão.** `fechar_comanda` faz tudo numa transação e rejeita pagamentos cuja soma difere do total.
**Consequência.** Não existe comanda "meio fechada". Os valores são validados no servidor.

## D10 · Equipe criada com senha provisória (sem convite por e-mail)
**Contexto.** Convite por e-mail exige configurar SMTP e uma tela de definição de senha.
**Decisão.** O dono cria o membro informando uma senha provisória, via Route/Server Action com a service role key (somente servidor).
**Consequência.** Funciona sem infraestrutura de e-mail. **Pendência:** forçar troca de senha no primeiro acesso.

## D11 · Risco aceito: perfil sem verificação de WhatsApp
**Contexto.** O perfil do cliente é identificado pelo WhatsApp, sem SMS de verificação.
**Decisão.** Aceitar no MVP. Quem digita o número de outra pessoa assume o cadastro dela (selos incluídos).
**Consequência.** Risco baixo para um café, mas relevante. **Pendência:** verificação por código.

## D12 · Visual escuro, com movimento ligado ao scroll
**Contexto.** O briefing pedia fundo branco. Depois de comparar com uma landing de referência do próprio autor, a decisão foi um visual imersivo e mais atual.
**Decisão.** Tema escuro para o cliente, cor de destaque configurável por estabelecimento, hero com texto digitado e animações guiadas por variáveis CSS (`--p`, `--c`), sem re-render do React.
**Consequência.** Respeita `prefers-reduced-motion`. Os painéis da equipe não adotaram o tema escuro (exceto o do garçom).

## D13 · Cardápio: uma foto por tela; características só ao escolher
**Contexto.** Primeiro, cada produto revelava ingredientes e modo de preparo conforme o scroll. Na avaliação, o cliente quer ver a foto grande e decidir; detalhes são sob demanda.
**Decisão.** Lista = foto em tela cheia com nome e preço. Ao escolher, abre o detalhe com descrição, ingredientes, "Como é feito", opções e combinação.
**Consequência.** Navegação limpa, mas cada produto ocupa uma tela. **Pendência:** botão "ver em lista" para cardápios longos.

## D14 · Opções do produto em `jsonb`, validadas no servidor
**Contexto.** Cada produto tem escolhas diferentes (açúcar, gelo, ponto).
**Decisão.** Coluna `opcoes jsonb` e `especificacoes jsonb` no item. `enviar_pedido` só aceita escolhas que o produto oferece.
**Consequência.** Flexível sem criar tabelas novas. Sem preço por opção (por enquanto).

## D15 · Combinação vira linhas separadas do pedido
**Contexto.** O cliente pode combinar o produto com qualquer outro do local.
**Decisão.** Cada item combinado é uma linha própria, com a observação "Combinação com …".
**Consequência.** Preço, estoque e relatórios continuam por produto. A cozinha enxerga a ligação pela observação.

## D16 · Imagens de exemplo locais (SVG)
**Contexto.** Fotos externas (picsum) falharam no ambiente de teste e quebram o seed offline.
**Decisão.** SVGs por categoria em `public/placeholders/`.
**Consequência.** Seed funciona sem internet. Fotos reais entram pelo upload do admin (Supabase Storage).

## D17 · Códigos de mesa imprevisíveis por padrão
**Contexto.** O seed usa `mesa1`, `mesa2`… Em produção, qualquer pessoa poderia digitar o link de outra mesa e pedir como se estivesse nela.
**Decisão.** Ao criar uma mesa no admin sem informar o código, o sistema gera `m<numero>-<6 hex aleatórios>`. O QR já carrega o link completo, então o tamanho não atrapalha.
**Consequência.** Reduz pedidos falsos por adivinhação do link. A confirmação do garçom segue como segunda barreira (D3).

## D18 · Produção nasce sem usuários de teste
**Contexto.** O `seed.sql` cria usuários com senha conhecida (`Teste@1234`), úteis no desenvolvimento, perigosos em produção.
**Decisão.** `supabase db push` aplica só as migrations (o seed nunca é aplicado). O primeiro dono é criado no painel do Supabase e vinculado por `supabase/producao/bootstrap.sql`. Cadastro público de usuários fica desativado.
**Consequência.** Mais um passo manual na implantação, documentado em [`docs/deploy.md`](deploy.md), em troca de não ter credenciais conhecidas no banco real.

## D19 · Endpoint de saúde que diagnostica o deploy
**Contexto.** No primeiro deploy na Vercel, as páginas deram erro 500 porque as variáveis do Supabase não estavam no build. Pelo lado de fora, a causa não era visível.
**Decisão.** `GET /api/health` devolve apenas booleanos (cada variável chegou? o banco responde?) e os **nomes** de variáveis parecidas, nunca valores.
**Consequência.** Diagnóstico de configuração em segundos e uma checagem pronta para monitoramento. O endpoint é público, mas não expõe nenhum segredo.

## D20 · Página inicial só com a escolha da mesa (substituída pela D23: a escolha agora é opcional e vem desligada)
**Contexto.** O cliente que abre o endereço do café, sem passar pela tag/QR, não tinha o que fazer. Os links de mesa têm códigos aleatórios (D17).
**Decisão.** A raiz do site leva à escolha da mesa do café (`/<slug>`): o cliente toca no número em que está. A função `listar_mesas` devolve número e código das mesas ativas. Com mais de um café no sistema, a raiz não lista nenhum.
**Consequência.** Usabilidade melhor, com um custo de segurança assumido: o código da mesa deixa de ser segredo, e qualquer pessoa pode escolher qualquer mesa. As barreiras que restam são o limite por sessão (D3) e a confirmação do garçom antes de o pedido ir à cozinha. Tag e QR continuam abrindo direto na mesa certa.

## D21 · Login da equipe em um endereço próprio (`/gestao`)
**Contexto.** A página pública não deve oferecer login; dono, gerente e equipe entram por outro caminho.
**Decisão.** Um único login para toda a equipe em `/gestao`, sem link na página do cliente. `/login` redireciona para lá. Os papéis continuam separando o que cada um vê. Nomes reservados (`gestao`, `painel`, `api`…) não podem ser slug de café.
**Consequência.** Endereço pouco óbvio ajuda, mas não é segurança: a proteção real é autenticação + RLS + papel por rota. **Pendência:** limitar tentativas de login e, se necessário, separar a entrada do dono/gerente da dos demais.

## D22 · Recuperação e troca de senha dentro do app
**Contexto.** O dono esqueceu a senha e o app não tinha recuperação. Redefinir por baixo, direto no banco, troca a credencial de uma conta sem passar pelo dono.
**Decisão.** Fluxo padrão: `/gestao/esqueci` pede o e-mail (resposta sempre igual, para não revelar quais e-mails existem), o link do e-mail passa por `/auth/callback` (troca o código por uma sessão, destinos permitidos fixos) e leva a `/redefinir-senha`. A mesma tela serve para trocar a senha logado. Senha mínima de 8 caracteres, validada no servidor.
**Consequência.** Ninguém precisa de acesso ao banco para recuperar uma conta. **Dependência:** o Supabase precisa ter o endereço do site em *Redirect URLs*; o e-mail padrão do Supabase envia poucos e-mails por hora (configurar SMTP próprio em produção).

## D23 · A mesa é definida pelo link da tag; escolher mesa vira opção do dono
**Contexto.** A D20 deixava qualquer pessoa ver e escolher qualquer mesa, o que contradiz a ideia central do produto: o link da tag/QR define a mesa, e o cliente não deve mexer nas coisas de outra mesa.
**Decisão.** Nova configuração `permitir_escolher_mesa`, **desligada por padrão**. Desligada, `listar_mesas` não devolve nenhuma mesa (nem os códigos dos links) e a página do café só pede para aproximar o celular da tag ou ler o QR. Ligada pelo dono em *Configurações*, mostra o seletor de mesas (útil para cafés sem tags).
**Consequência.** Os códigos aleatórios (D17) voltam a ser a barreira real entre mesas. Quem quiser a conveniência do seletor assume conscientemente o risco, descrito na própria opção.

## D24 · Demonstração estática no GitHub Pages, publicada por GitHub Actions
**Contexto.** O app real (login, pedidos, tempo real, banco) precisa de servidor e roda na Vercel; o GitHub Pages só serve arquivos estáticos. Ainda assim, o portfólio precisa de um link que qualquer pessoa abra e experimente.
**Decisão.** A pasta `site/` tem uma vitrine (`index.html`) e uma demonstração interativa (`demo.html`) em HTML, CSS e JavaScript puros, com dados de exemplo espelhados do seed. O garçom e a cozinha são simulados por tempo. Um workflow do GitHub Actions publica só `site/` no Pages a cada mudança nela.
**Consequência.** Link público sem custo e sem backend. Em contrapartida, a demo é uma reimplementação (não o mesmo código React) e pode divergir do app real: por isso ela se declara "demonstração" e a vitrine aponta o app e o código reais. Nada na pasta `site/` carrega dado de cliente ou chave.
