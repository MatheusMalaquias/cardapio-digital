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
