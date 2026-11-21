# Projeto ExpressJS e ReactJS

Aplicação acadêmica de controle financeiro pessoal. Esta nova implementação usa como referência o projeto anterior da equipe.

Enunciado: https://costasilvati.github.io/fullStack/projeto-2.html

## Etapa 06 — Categorias

Servidor Express, telas React de cadastro/login, schema PostgreSQL, pool de conexões e cadastro de usuários na API. Login JWT e consulta do usuário autenticado estão disponíveis. O CRUD de categorias está disponível na API e no frontend. Contas, lançamentos e relatórios serão implementados nas próximas etapas. As dependências previstas já estão declaradas, mas não representam funcionalidades prontas.

## Executar

Requisito: Node.js 22.12 ou superior.

Em um terminal, dentro de `backend`:

```powershell
Copy-Item .env.example .env
npm ci
npm run dev
```

A API inicia na porta 3000. O cadastro está disponível em POST /api/auth/cadastro; URLs não implementadas retornam JSON com status 404. DATABASE_URL configura a conexão com o PostgreSQL. Configure JWT_SECRET com um segredo próprio de pelo menos 32 bytes; o valor de exemplo não é aceito pela API. Não publique `.env`.

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
| 03 | Felippe | Cadastro, validações e dados padrão — concluída |
| 04 | Felippe | Login JWT, identidade pelo token e limitação de tentativas — concluída |
| 05 | Felippe | Telas de autenticação, contexto e rotas protegidas — concluída |
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

## Login e autenticação

Antes de iniciar a API, defina JWT_SECRET em `backend/.env` com um segredo próprio de pelo menos 32 bytes. O servidor recusa segredo ausente, curto ou igual ao placeholder do exemplo. Uma forma de gerar um valor aleatório é executar:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Copie o resultado para JWT_SECRET e não o publique no Git.

| Método | Rota | Finalidade |
|---|---|---|
| POST | `/api/auth/login` | Autenticar por e-mail e senha; retornar token e usuário |
| GET | `/api/auth/me` | Consultar id, nome e e-mail do usuário indicado pelo token |

Exemplo de corpo do login:

```json
{ "email": "pessoa@exemplo.com", "senha": "Senha1234" }
```

O login normaliza o e-mail e compara a senha com bcrypt. Credenciais incorretas retornam 401 com a mesma mensagem, independentemente de o e-mail existir. Campos inválidos retornam 400. Nenhuma resposta inclui senha ou hash.

O token usa HS256 e expira em uma hora. Envie `Authorization: Bearer <token>` ao consultar `/api/auth/me`. Token ausente, inválido, expirado, sem expiração ou com algoritmo diferente retorna 401. Usuário removido retorna 404 nessa consulta. A identidade fica em `req.usuarioId` e vem exclusivamente do token, não do corpo ou da URL.

O login aceita até dez requisições por endereço IP a cada quinze minutos; a seguinte retorna 429 com mensagem e cabeçalho Retry-After. Esse contador é mantido em memória e reinicia com o servidor. A configuração atual corresponde à execução local, sem proxy intermediário.

O middleware de autenticação será aplicado às rotas financeiras quando elas forem criadas. O isolamento completo dos registros será validado nessas etapas. O frontend descarta o token no logout e retorna ao login quando ele expira ou uma requisição autenticada recebe 401.

Os testes de autenticação fazem HTTP local com banco simulado: verificam login, expiração, assinatura e algoritmo, identificação pelo token, rejeição de credenciais e limitação de tentativas. Execute `npm test` dentro de `backend`. A validação com PostgreSQL real permanece pendente.

## Interface de cadastro, login e sessão

Com o banco preparado e a API em execução, inicie o frontend com `npm run dev`. As rotas disponíveis são:

| Caminho | Tela |
|---|---|
| `/cadastro` | Cadastro com validação, máscara de CPF e erros junto aos campos |
| `/login` | Login com estado de envio, erros e confirmação após cadastro |
| `/` | Página inicial protegida com identificação do usuário e botão Sair |

A página inicial ainda não é o dashboard financeiro da etapa 16. Após cadastrar, entre com as credenciais criadas. Nesta etapa não há usuários de demonstração pré-carregados.

O cliente Axios fica em `frontend/src/services/api.js` e usa `http://localhost:3000/api` por padrão. Para mudar o endereço, copie `frontend/.env.example` para `frontend/.env`, ajuste VITE_API_URL e reinicie o Vite. As chamadas vão diretamente à API, sem proxy do Vite. Se mudar a origem do frontend, ajuste também FRONTEND_ORIGIN no backend.

AuthContext fornece usuário, token, cadastro, login e logout. Somente o token é persistido no localStorage; ao recarregar, os dados do usuário são consultados em `/api/auth/me`. A rota protegida mostra o carregamento da sessão, permite tentar novamente em falhas temporárias e redireciona visitantes sem sessão para o login.

O cliente HTTP adiciona Authorization automaticamente. Respostas 401 de requisições autenticadas encerram a sessão, exceto no próprio login. Respostas de uma sessão antiga não apagam um token novo. A expiração também é acompanhada por um temporizador para retornar ao login sem exigir nova interação. A leitura local da validade não substitui a verificação da assinatura pela API.

O logout remove o token do navegador; ele não revoga um JWT já emitido no servidor, que permanece válido até expirar. A proteção visual das rotas não substitui a autorização no backend.

### Verificações desta etapa

Dentro de `frontend`:

```powershell
npm test
npm run build
```

Os testes cobrem o cliente HTTP e a leitura da validade do token, com armazenamento e respostas simulados. A compilação verifica a integração dos componentes. A navegação visual e o fluxo completo de cadastro/login com PostgreSQL real ainda precisam ser validados em execução.

## Categorias

Após fazer login, abra **Categorias** no menu ou acesse `/categorias`. A tela permite listar, criar, editar e excluir categorias, com validação do formulário, erros por campo, carregamento e confirmação antes da exclusão. Uma falha ao carregar a lista oferece a ação Tentar novamente. As ações ficam desabilitadas enquanto uma alteração é enviada.

Todas as rotas abaixo exigem `Authorization: Bearer <token>`:

| Método | Rota | Resultado |
|---|---|---|
| GET | `/api/categorias` | 200 com categorias do usuário autenticado |
| POST | `/api/categorias` | 201 com a categoria criada |
| PUT | `/api/categorias/:id` | 200 com a categoria atualizada |
| DELETE | `/api/categorias/:id` | 204, sem corpo |

Criação e edição recebem `{ "nome": "Alimentação", "tipo": "saida" }`. O nome é obrigatório, tem até 60 caracteres e é salvo sem espaços nas extremidades. O tipo deve ser `entrada` ou `saida`. Nomes duplicados para o mesmo usuário e tipo retornam 409; dados inválidos retornam 400.

O usuário vem exclusivamente do token. As consultas de lista, edição e exclusão filtram por esse usuário. Uma tentativa de editar ou excluir categoria inexistente ou de outra pessoa retorna 404. A API não permite excluir uma categoria com lançamentos vinculados nem mudar seu tipo enquanto estiver em uso (409). A restrição de chave estrangeira garante o bloqueio da exclusão no banco.

Os testes HTTP de categorias verificam autenticação, validações, parâmetros de usuário nas consultas, respostas de duplicidade, edição, exclusão e bloqueio de categoria em uso. O banco é simulado: a persistência, as restrições reais e o fluxo visual ainda precisam ser verificados com PostgreSQL e navegador em execução.
