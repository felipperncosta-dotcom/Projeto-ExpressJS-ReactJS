# Projeto ExpressJS e ReactJS

Aplicação acadêmica de controle financeiro pessoal. Esta nova implementação usa como referência o projeto anterior da equipe.

Enunciado: https://costasilvati.github.io/fullStack/projeto-2.html

## Etapa 08 — API de lançamentos simples

Servidor Express, telas React de cadastro/login, schema PostgreSQL, pool de conexões e cadastro de usuários na API. Login JWT e consulta do usuário autenticado estão disponíveis. O CRUD de categorias está disponível na API e no frontend. Contas, rendas e cartões também podem ser gerenciados. A API já permite criar e consultar lançamentos simples. Parcelamento, edição/exclusão, tela de lançamentos e relatórios serão implementados nas próximas etapas. As dependências previstas já estão declaradas, mas não representam funcionalidades prontas.

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
| 06 | Felippe | CRUD de categorias: API e interface — concluída |
| 07 | Felippe | CRUD de fontes e destinos: API e interface — concluída |
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

## Contas, rendas e cartões

A tela `/fontes-destinos`, acessível por **Contas e cartões** no menu, permite listar, criar, editar e excluir cadastros. O formulário mostra os campos de fechamento, vencimento e limite quando o tipo é cartão. Contas podem ser marcadas como reserva de emergência. A marcação ainda não calcula saldo: esse indicador será implementado na etapa de saúde financeira.

Todas as rotas exigem token e usam o usuário identificado por ele:

| Método | Rota | Resultado |
|---|---|---|
| GET | `/api/fontes-destinos` | 200 com fontesDestinos do usuário |
| POST | `/api/fontes-destinos` | 201 com fonteDestino criada |
| PUT | `/api/fontes-destinos/:id` | 200 com fonteDestino atualizada |
| DELETE | `/api/fontes-destinos/:id` | 204 sem corpo |

Exemplo de cartão:

```json
{
  "nome": "Visa",
  "tipo": "cartao_credito",
  "dia_fechamento": 25,
  "dia_vencimento": 5,
  "limite": "3000.50",
  "reserva": false
}
```

O nome tem até 60 caracteres e é único por usuário. Os tipos aceitos são `renda`, `conta` e `cartao_credito`. Cartões exigem dias inteiros de 1 a 31 e limite positivo, com até duas casas decimais e máximo de 9.999.999.999,99 (capacidade do NUMERIC(12,2)). A API usa ponto decimal; a interface aplica máscara brasileira e faz a conversão. Tipos booleanos e arrays não são aceitos como valores monetários ou dias.

Para renda e conta, os campos específicos de cartão são gravados como nulos. `reserva` é booleano e só pode ser verdadeiro para contas. Dados inválidos retornam 400; nome duplicado retorna 409 com erro no campo nome. Recursos inexistentes ou pertencentes a outro usuário retornam 404 em edição/exclusão. Cadastros com lançamentos associados não podem ser excluídos nem ter seu tipo alterado (409).

A tela confirma a exclusão, bloqueia ações durante o envio e distingue lista vazia de falha de carregamento, com opção de tentar novamente. Os testes HTTP usam banco simulado e cobrem validações, criação dos três tipos, duplicidade, edição, exclusão e parâmetros de isolamento. Há também teste da máscara monetária. A validação com PostgreSQL real e navegador permanece pendente.

## Lançamentos simples — API

Todas as rotas exigem token. A tela será implementada na etapa 10; parcelamento, edição e exclusão entram na etapa 09.

| Método | Rota | Finalidade |
|---|---|---|
| POST | `/api/lancamentos` | Criar lançamento simples; retorna 201 com array lancamentos |
| GET | `/api/lancamentos` | Listar com filtros, paginação e totais |
| GET | `/api/lancamentos/:id` | Consultar lançamento próprio; retorna 404 se inexistente ou de terceiro |

Exemplo de criação (substitua os IDs por cadastros do usuário autenticado):

```json
{
  "tipo": "saida",
  "descricao": "Mercado",
  "valor": "50.25",
  "data": "2026-11-21",
  "categoria_id": 10,
  "fonte_destino_id": 20
}
```

A descrição é obrigatória e tem até 120 caracteres. O valor é positivo, tem no máximo duas casas decimais e respeita o limite do NUMERIC(12,2); use ponto como separador. A conversão em centavos evita arredondar entradas como `1.001`. Datas seguem AAAA-MM-DD e precisam existir no calendário. IDs devem ser inteiros positivos.

Categoria e fonte/destino devem pertencer ao usuário do token. A categoria deve ter o mesmo tipo do lançamento. Entradas não podem usar cartão e saídas não podem usar uma fonte do tipo renda. Relações inexistentes ou de terceiros retornam 404; incompatibilidades e campos inválidos retornam 400 com detalhes. O usuário nunca é obtido do corpo da requisição.

### Filtros e paginação

Exemplo: `/api/lancamentos?inicio=2026-11-01&fim=2026-11-30&tipo=saida&categoriaId=10&fonteDestinoId=20&pagina=2&limite=10`.

O período padrão é o mês corrente. A primeira página é 1; o limite padrão é 20 e pode variar de 1 a 100. O resultado contém `lancamentos`, `pagina`, `limite`, `total`, `totalPaginas`, `totalEntradas`, `totalSaidas` e `saldo`. A ordenação é por data decrescente e, em seguida, id decrescente.

Os totais usam SUM no PostgreSQL e consideram todos os registros que atendem aos filtros, independentemente da página. O saldo também é subtraído no PostgreSQL usando NUMERIC; os valores monetários são devolvidos como strings decimais, sem conversão para ponto flutuante no JavaScript.

Nesta etapa, apenas uma parcela é aceita. Enviar total_parcelas maior que 1 retorna 400 explicitamente. Os campos de parcela permanecem nos registros para evolução na etapa seguinte.

Os testes verificam valores em centavos, datas reais, autenticação, posse das relações, compatibilidade, criação, detalhe, filtros e paginação por HTTP com banco simulado. Persistência real e execução das consultas SQL ainda precisam ser verificadas com PostgreSQL.
