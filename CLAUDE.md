# Cardápio Digital — convenções do projeto (portfólio profissional)

Este projeto é usado como portfólio. Ao trabalhar nele:

1. **Documente enquanto decide.** Toda decisão importante de arquitetura ou produto vira uma entrada nova em `docs/decisoes.md` (contexto → decisão → consequência), no mesmo commit da mudança. Mantenha o `README.md` atualizado quando algo visível mudar.
2. **Commits pequenos e claros.** Um assunto por commit, mensagem no imperativo e em português (ex.: `feat(cliente): adiciona caixa de combinação no detalhe do produto`). Prefixos: feat, fix, docs, chore, refactor, test, db.
3. **Evidências reais.** Guarde prints em `docs/prints/` e números medidos em `docs/numeros.md` (use `scripts/metricas-reais.sql`). Nunca invente ou estime números; dados do `seed.sql` não são resultados.
4. **Segredos.** Nada de chaves no código. `.env.local` fora do Git; só `.env.example`.
5. **Publicação.** O código vive no monorepo local `SmartMind` e é publicado no GitHub (repositório privado `MatheusMalaquias/cardapio-digital`) por subtree. Depois de commitar, atualize o GitHub com: `git subtree push --prefix=cardapio-digital cardapio main` (executar na raiz de `SmartMind`). Nunca dê `git push` direto: o remoto `origin` é o do ERP.
