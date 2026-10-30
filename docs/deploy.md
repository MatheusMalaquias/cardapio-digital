# Publicar: GitHub, Supabase e Vercel

Passo a passo para colocar o projeto no ar. **Os logins de teste (`Teste@1234`) existem só no banco local.**

## 1. GitHub
1. Em github.com, crie um repositório **vazio** (sem README, sem .gitignore, sem licença), privado no início.
2. No projeto: `git remote add origin <url-do-repo>` e `git push -u origin main`.
3. Confira que nenhum segredo foi enviado: `.env.local` fica fora do Git (só `.env.example` é versionado).

## 2. Supabase (produção)
1. Em supabase.com/dashboard, **New project**. Região: *South America (São Paulo)*. Guarde a senha do banco em um gerenciador de senhas.
2. Em **Project Settings > API**, anote: *Project URL*, a chave *anon/publishable* e a chave *service_role/secret*. A secret **nunca** vai para o front-end nem para o Git.
3. Entre no CLI e aplique as migrations (não aplica o seed):
   ```bash
   npx supabase login
   npx supabase link --project-ref <ref-do-projeto>
   npx supabase db push
   ```
4. Em **Authentication**:
   - *Sign In / Providers*: deixe só E-mail e **desative "Allow new users to sign up"**. A equipe é criada pelo dono.
   - *URL Configuration*: *Site URL* com o endereço final do app (Vercel) e, em *Redirect URLs*, `https://<seu-site>.vercel.app/**`. Sem isso o e-mail de "esqueci minha senha" não leva ao app.
5. Crie o dono em **Authentication > Users > Add user** (e-mail + senha forte, *Auto Confirm*).
6. Rode `supabase/producao/bootstrap.sql` no **SQL Editor** (preenchendo e-mail, slug e nome). Isso cria o estabelecimento, o vínculo do dono e as mesas com códigos imprevisíveis.
6b. (Opcional, para testar) rode `supabase/producao/demo-cardapio.sql` no SQL Editor, trocando o `v_slug`: cria 4 categorias, 15 produtos com ingredientes, opções, tamanhos e uma promoção. Não cria usuários nem pedidos.
7. Confira em **Storage** que o bucket `produtos` existe e, em **Database > Replication**, que `pedidos`, `chamados`, `comandas` e `produtos` estão no Realtime (as migrations já configuram).

## 3. Vercel
1. Importe o repositório do GitHub na Vercel (framework: Next.js).
2. Em **Environment Variables** (Production):
   | Nome | Valor |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | chave anon/publishable |
   | `SUPABASE_SERVICE_ROLE_KEY` | chave service_role/secret (somente servidor) |
3. Faça o deploy, volte ao Supabase e atualize o *Site URL* com o domínio real.

## 4. Acessos
- **Cliente:** a página inicial do site mostra só a escolha da mesa. Com a tag/QR, o link da mesa abre direto: `/<slug>/mesa/<código>`.
- **Equipe (dono, gerente, garçom, cozinha e caixa):** `/gestao`. Não há link para ele na página do cliente.
- **Esqueci a senha:** `/gestao/esqueci` envia um link por e-mail. Troca de senha logado: ícone de chave no topo do painel (`/redefinir-senha`).

## 5. Verificação
- Abrir `/<slug>/mesa/<codigo>` (o código aparece em Admin > Mesas e QR) e fazer um pedido.
- Entrar em `/gestao` como dono, confirmar o pedido como garçom/dono, fechar no caixa e ver as métricas.
- Rodar `scripts/metricas-reais.sql` para registrar números reais em `docs/numeros.md`.
