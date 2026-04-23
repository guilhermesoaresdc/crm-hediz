# Preferências do projeto

## Publicação / Deploy

- **Sempre publicar alterações automaticamente** sem pedir confirmação.
- **IMPORTANTE**: o Vercel deploya da branch `claude/crm-hediz-mvp-TvaKr`, não de `main`. Depois de mergear um PR em `main`, é obrigatório rodar:
  ```
  git fetch origin main && git push origin origin/main:claude/crm-hediz-mvp-TvaKr
  ```
  pra disparar o deploy de produção.
- Fluxo padrão: abrir PR contra `main`, mergear, e em seguida fast-forward da branch de deploy.
- Não precisa perguntar antes de abrir PR, mergear, fazer push em branches de feature ou sincronizar a branch de deploy.
