# Projeto ExpressJS e ReactJS

Aplicação web para controle financeiro pessoal, desenvolvida com React, Express e PostgreSQL. O sistema permite registrar entradas e despesas, organizá-las por categorias e fontes/destinos, acompanhar faturas e consultar indicadores educativos.

## Requisitos

- Node.js 22.12 ou superior
- Docker Desktop com Docker Compose, ou PostgreSQL 16 instalado

## Executar localmente

1. Inicie o PostgreSQL com Docker, na raiz do repositório:

   ```powershell
   docker compose up -d postgres
   ```

2. No backend, configure o ambiente e prepare a base:

   ```powershell
   cd backend
   Copy-Item .env.example .env
   npm ci
   # Gere um segredo e substitua JWT_SECRET no .env antes de iniciar:
   node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
   npm run db:schema
   npm run db:seed
   npm run dev
   ```

   O servidor fica em `http://localhost:3000`. O arquivo `.env.example` usa a conexão local do Compose. Substitua `JWT_SECRET` pelo segredo gerado, inclusive na demonstração: o servidor rejeita o valor de exemplo. Não publique o arquivo `.env`.

3. Em outro terminal, na pasta `frontend`:

   ```powershell
   npm ci
   npm run dev
   ```

   Abra `http://localhost:5173`. Para gerar a versão de produção, execute `npm run build` nessa pasta.

## Acesso de demonstração

Depois de carregar o seed, use uma destas contas:

| E-mail | Senha |
| --- | --- |
| `marina@financas.test` | `Marina1234` |
| `rafael@financas.test` | `Rafael1234` |

**Atenção: o seed executa TRUNCATE e apaga todos os usuários e lançamentos da base configurada. Use somente uma base local descartável.**

O seed é destinado a uma base local limpa de demonstração e deve ser executado uma vez. Ele cria duas contas próprias para os dados de exemplo; se quiser recriar a base, remova e prepare novamente o volume local do PostgreSQL antes de executar o seed.

## Funcionalidades

- Cadastro, login com JWT e separação de dados por usuário.
- CRUD de categorias, contas, rendas e cartões.
- Lançamentos de entradas e despesas, incluindo compras parceladas.
- Relatório por categoria com comparação com um período anterior de igual duração. Categorias com gasto anterior e gasto atual igual a zero continuam visíveis como redução de 100%.
- Relatórios por fonte e destino, com tabelas e gráficos de entradas, saídas e saldos.
- Faturas em aberto e três períodos seguintes, com datas brasileiras, parcelas futuras e limite comprometido.
- Painel mensal com totais, movimentações recentes e gráfico por categoria.
- Indicadores de saúde financeira, projeção de seis meses, dicas e aviso educativo.

## Regras dos indicadores e dicas

Os indicadores são calculados a partir dos lançamentos registrados e têm finalidade educativa:

- **Taxa de poupança:** entradas menos saídas no período recente analisado, em relação às entradas.
- **Reserva de emergência:** soma das entradas menos as saídas vinculadas a contas marcadas como reserva.
- **Limite dos cartões:** compromissos de faturas e parcelas futuras são considerados para estimar o limite utilizado.
- **Projeção:** parte do saldo calculado e repete a média líquida recente pelos seis meses seguintes, descontando parcelas e faturas conhecidas. Despesas futuras ainda não registradas não são previstas.
- **Dica de poupança:** aparece abaixo de 10%.
- **Dica de cartões:** aparece quando o comprometimento somado atinge 70% do limite.
- **Dica de categoria:** aparece se a despesa de uma categoria estiver pelo menos 50% e R$ 100 acima da média dos três meses anteriores.
- **Dica de reserva:** aparece quando o saldo reservado fica abaixo de três meses da média de despesas.

A interface informa: “As informações são educativas e não constituem recomendação financeira profissional.”

## API principal

Todas as rotas abaixo usam o prefixo `/api`:

| Recurso | Rotas |
| --- | --- |
| Autenticação | `/auth/cadastro`, `/auth/login`, `/auth/me` |
| Categorias | `/categorias` |
| Contas e cartões | `/fontes-destinos` |
| Lançamentos | `/lancamentos` |
| Relatórios | `/relatorios/categorias`, `/relatorios/fontes-destinos`, `/relatorios/faturas` |
| Saúde financeira | `/saude-financeira` |

As rotas pessoais exigem autenticação. Os relatórios de período aceitam `inicio` e `fim` no formato `AAAA-MM-DD`; o relatório de faturas aceita `meses` entre 1 e 12.

## Testes

No backend:

```powershell
npm test
```

Os testes de cálculo são independentes. Os testes integrados usam PostgreSQL quando `DATABASE_URL` está configurada; execute-os depois de preparar o schema e carregar a base de demonstração. A interface pode ser verificada com:

```powershell
cd ../frontend
npm test
npm run build
```

## Estrutura

- `backend/database/schema.sql`: tabelas, restrições e índices PostgreSQL.
- `backend/database/seed.js`: dados de demonstração.
- `backend/src/routes`: endpoints e autenticação.
- `backend/src/models`: consultas e regras de negócio.
- `backend/tests`: testes integrados de API; os testes de cálculo ficam junto ao utilitário testado.
- `frontend/src/components`: páginas e componentes React.

## Apresentação

[Assistir à apresentação do projeto no Google Drive](https://drive.google.com/file/d/1GTwFDjJ9TepaN-Qu_oImVT7dsmXHw_0l/view?usp=drive_link)

