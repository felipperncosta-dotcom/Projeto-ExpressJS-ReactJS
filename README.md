# Projeto ExpressJS e ReactJS

Aplicação acadêmica de controle financeiro pessoal. Esta nova implementação usa como referência o projeto anterior da equipe.

Enunciado: https://costasilvati.github.io/fullStack/projeto-2.html

## Etapa 01 — Estrutura inicial

Servidor Express e tela inicial React/Vite. Banco, autenticação e funcionalidades financeiras serão implementados nas próximas etapas. As dependências previstas já estão declaradas, mas não representam funcionalidades prontas.

## Executar

Requisito: Node.js 22.12 ou superior.

Em um terminal, dentro de `backend`:

```powershell
Copy-Item .env.example .env
npm ci
npm run dev
```

A API inicia na porta 3000. Nesta etapa todas as URLs retornam JSON com status 404, pois ainda não há rotas de negócio. DATABASE_URL está reservada para a próxima etapa. Substitua JWT_SECRET antes de implementar autenticação. Não publique `.env`.

Em outro terminal, dentro de `frontend`:

```powershell
npm ci
npm run dev
```

Abra o endereço exibido pelo Vite, normalmente http://localhost:5173. Use `npm run build` para compilar a interface.

## Estrutura

- `backend/database`: schema e seed futuros.
- `backend/src/server.js`: inicialização do Express.
- `backend/src/routes`: rotas e controladores.
- `backend/src/models`: persistência e regras de negócio.
- `backend/src/middlewares`: autenticação, validação e erros.
- `backend/src/config`: configurações e pool do banco.
- `frontend/src/components`: telas e componentes.
- `frontend/src/contexts`: estado compartilhado.
- `frontend/src/services`: cliente da API.

Arquivos `.gitkeep` preservam pastas ainda vazias. As tecnologias previstas são Express, PostgreSQL, React, Vite, JWT, bcrypt, Axios, React Router e Recharts. A documentação de banco, seed e rotas será acrescentada conforme a implementação.

## Plano de 20 etapas

O responsável de cada etapa deve participar efetivamente da implementação ou revisão e ser capaz de explicar o código. O plano não é um registro de trabalho já concluído; os commits devem refletir a autoria real.

| Etapa | Responsável | Entrega |
|---|---|---|
| 01 | Felippe | Estrutura inicial |
| 02 | Rafael | Banco e restrições |
| 03 | Felippe | Cadastro e validações |
| 04 | Rafael | Login e JWT |
| 05 | Felippe | Telas de cadastro e login |
| 06 | Rafael | Sessão e rotas protegidas |
| 07 | Felippe | API de categorias |
| 08 | Rafael | Tela de categorias |
| 09 | Felippe | API de fontes e destinos |
| 10 | Rafael | Tela de fontes e destinos |
| 11 | Felippe | API de lançamentos e parcelas |
| 12 | Rafael | Tela de lançamentos |
| 13 | Felippe | Relatório por categoria |
| 14 | Rafael | Relatório por fonte/destino |
| 15 | Felippe | API e cálculo de faturas |
| 16 | Rafael | Tela de faturas e painel |
| 17 | Felippe | Indicadores de saúde financeira |
| 18 | Rafael | Tela de saúde financeira |
| 19 | Felippe | Testes de integração e correções |
| 20 | Rafael | Documentação e validação da entrega |
