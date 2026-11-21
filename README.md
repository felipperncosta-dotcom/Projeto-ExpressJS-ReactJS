# Projeto ExpressJS e ReactJS

Aplicação acadêmica de controle financeiro pessoal. Esta nova implementação usa como referência o projeto anterior da equipe.

Enunciado: https://costasilvati.github.io/fullStack/projeto-2.html

## Etapa 03 — Cadastro de usuários

Servidor Express, tela inicial React/Vite, schema PostgreSQL, pool de conexões e cadastro de usuários na API. Login e funcionalidades financeiras serão implementados nas próximas etapas. As dependências previstas já estão declaradas, mas não representam funcionalidades prontas.

## Executar

Requisito: Node.js 22.12 ou superior.

Em um terminal, dentro de `backend`:

```powershell
Copy-Item .env.example .env
npm ci
npm run dev
```

A API inicia na porta 3000. O cadastro está disponível em POST /api/auth/cadastro; URLs não implementadas retornam JSON com status 404. DATABASE_URL configura a conexão com o PostgreSQL. Substitua JWT_SECRET antes de implementar autenticação. Não publique `.env`.

Em outro terminal, dentro de `frontend`:

```powershell
npm ci
npm run dev
```

Abra o endereço exibido pelo Vite, normalmente http://localhost:5173. Use `npm run build` para compilar a interface.

## Estrutura

- `backend/database/schema.sql`: tabelas, restrições e índices. O seed será incluído posteriormente.
- `backend/src/server.js`: inicialização do Express.
- `backend/src/routes`: rotas e controladores.
- `backend/src/models`: persistência e regras de negócio.
- `backend/src/middlewares`: autenticação, validação e erros.
- `backend/src/config`: configurações e pool do banco.
- `backend/scripts/schema.js`: aplica o schema em uma transação.
- `frontend/src/components`: telas e componentes.
- `frontend/src/contexts`: estado compartilhado.
- `frontend/src/services`: cliente da API.

Arquivos `.gitkeep` preservam pastas ainda vazias. As tecnologias previstas são Express, PostgreSQL, React, Vite, JWT, bcrypt, Axios, React Router e Recharts. A documentação de banco, seed e rotas será acrescentada conforme a implementação.

## Plano de 20 etapas

O responsável de cada etapa deve participar efetivamente da implementação ou revisão e ser capaz de explicar o código. O plano não é um registro de trabalho já concluído; os commits devem refletir a autoria real.

| Etapa | Responsável | Entrega |
|---|---|---|
| 01 | Felippe | Estrutura inicial — concluída |
| 02 | Felippe | PostgreSQL: tabelas, restrições, pool e scripts — concluída |
| 03 | Felippe | Cadastro, validações e dados padrão |
| 04 | Felippe | Login JWT, isolamento e limitação de tentativas |
| 05 | Felippe | Telas de autenticação, contexto e rotas protegidas |
| 06 | Felippe | CRUD de categorias: API e interface |
| 07 | Felippe | CRUD de fontes e destinos: API e interface |
| 08 | Felippe | API de lançamentos, filtros, paginação e totais |
| 09 | Felippe | Parcelamento, transação, edição e exclusão |
| 10 | Felippe | Tela de lançamentos, testes e instruções de continuidade |
| 11 | Rafael | API de relatórios por categoria |
| 12 | Rafael | Tela por categoria, incluindo redução a zero |
| 13 | Rafael | Relatório por fonte/destino com tabelas e gráficos |
| 14 | Rafael | Cálculo de faturas e limites |
| 15 | Rafael | Tela de faturas e datas brasileiras |
| 16 | Rafael | Painel mensal |
| 17 | Rafael | Indicadores financeiros e revisão da reserva/projeção |
| 18 | Rafael | Tela de saúde financeira e dicas |
| 19 | Rafael | Seed, testes integrados e correções |
| 20 | Rafael | Documentação, regras das dicas e roteiro de apresentação |

## Criar o banco de desenvolvimento

Com Docker Desktop instalado e em execução, na raiz do projeto:

```powershell
docker compose up -d --wait
```

O serviço cria o banco `financas` no PostgreSQL 16 e mantém seus dados em um volume. A porta 5432 fica acessível somente pela máquina local. As credenciais do Compose são exclusivas para desenvolvimento. Se a porta já estiver ocupada, ajuste o mapeamento e DATABASE_URL juntos.

Dentro de `backend`, copie `.env.example` para `.env` se ainda não tiver feito isso. Depois de instalar as dependências, execute:

```powershell
npm run db:schema
```

O script cria as tabelas em uma única transação: se alguma instrução falhar, nenhuma alteração dessa execução permanece. Execute em um banco vazio. Rodar novamente retorna erro de tabela existente; o script não apaga tabelas nem registros e não é um sistema de migrations.

Como alternativa ao Docker, crie um banco vazio no PostgreSQL e configure DATABASE_URL com a conexão correspondente antes de executar o mesmo script.

### Modelo de dados

- `usuarios`: nome, e-mail e CPF únicos, hash da senha e data de criação.
- `categorias`: pertencem a um usuário, com tipo entrada/saída e nome único por usuário e tipo.
- `fontes_destinos`: rendas, contas e cartões; cartões exigem limite positivo e dias de fechamento/vencimento. Somente contas podem ser reservas.
- `lancamentos`: usuário, categoria, fonte/destino, valor positivo, data e informações de parcelamento. Valores usam NUMERIC(12,2); parcelas vão de 1 a 48.

Chaves estrangeiras impedem referências inexistentes. Categorias e fontes/destinos usados por lançamentos não podem ser excluídos. A API verificará a posse das relações e a compatibilidade dos tipos nas etapas de cadastro de lançamentos.

O pool usa até dez conexões e espera até cinco segundos para conectar. Os dados de demonstração serão incluídos na etapa 19.

## Cadastro de usuários

Com o banco configurado e as tabelas criadas, envie POST para `/api/auth/cadastro` com Content-Type `application/json`:

```json
{
  "nome": "Pessoa de Teste",
  "email": "pessoa@exemplo.com",
  "cpf": "529.982.247-25",
  "senha": "Senha1234",
  "confirmarSenha": "Senha1234"
}
```

O nome é obrigatório e limitado a 120 caracteres. O e-mail deve ter formato válido e até 160 caracteres; é armazenado sem espaços nas extremidades e em minúsculas. O CPF é armazenado só com dígitos e validado pelos dois dígitos verificadores. A senha exige pelo menos oito caracteres, letras e números, confirmação igual e no máximo 72 bytes UTF-8 (limite do bcrypt).

A senha é protegida por bcrypt com salt e custo 10. A API nunca retorna o hash. O usuário, dez categorias iniciais e uma conta corrente são criados na mesma transação. Se qualquer inserção falhar, o cadastro é desfeito.

| Resultado | Status | Resposta |
|---|---|---|
| Cadastro concluído | 201 | `usuario` com id, nome e e-mail |
| Dados inválidos | 400 | `erro` e, quando aplicável, `campos` |
| E-mail ou CPF já cadastrado | 409 | Mensagem no campo duplicado |
| Falha inesperada | 500 | Mensagem genérica, sem detalhes internos |

A unicidade é garantida pelas restrições do PostgreSQL, não por consulta prévia. O tratamento de erros fica em middleware. A função pura de validação de CPF fica em `models/utilitarios.js` como regra de negócio.

## Testes do cadastro

Dentro de `backend`, execute `npm test`. Os testes fazem requisições HTTP locais e usam um cliente de banco simulado para verificar validações, normalização, hash, respostas de conflito e comandos de transação. Não acessam nem alteram seu banco. A persistência real, as restrições SQL e concorrência ainda precisam de testes com PostgreSQL.
