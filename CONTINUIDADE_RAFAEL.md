# Continuidade do projeto — Rafael

## Ponto de partida

As etapas 01 a 10 implementam banco/schema, cadastro, login JWT, sessão React e CRUD de categorias, fontes/destinos e lançamentos, incluindo parcelas. A página inicial é uma apresentação da conta, não o dashboard financeiro.

O projeto anterior foi usado como referência, mas esta versão tem ajustes próprios. Não substitua a pasta inteira pela versão anterior: isso perderia validações, testes e tratamento de erros já corrigidos. Implemente e revise cada etapa antes de registrar seu commit com a sua identidade real.

Nenhum seed foi incluído até agora. Ao executar com banco vazio, cadastre usuários pela interface; o cadastro cria categorias e conta corrente. O seed com dois usuários e três meses de dados é parte da etapa 19.

## Antes de começar

1. Receba a versão atualizada no GitHub. Os commits feitos localmente só ficam disponíveis para clone/pull depois do push pelo Felippe.
2. Clone o repositório ou atualize uma cópia sem alterações pendentes. Verifique que o histórico contém as dez primeiras etapas.
3. Confira `git config user.name` e `git config user.email` e use sua própria identidade para seus commits.
4. Leia o README e o enunciado: https://costasilvati.github.io/fullStack/projeto-2.html.
5. Instale Node.js compatível, Docker Desktop ou PostgreSQL. Siga as instruções de banco abaixo antes de avaliar os fluxos reais.

## Execução e testes

Na raiz, com Docker Desktop em execução:

```powershell
docker compose up -d --wait
```

Dentro de backend:

```powershell
npm ci
Copy-Item .env.example .env
```

Se `.env` já existe, preserve-o em vez de copiar novamente. Defina JWT_SECRET com um segredo próprio de pelo menos 32 bytes, diferente do placeholder. Confira DATABASE_URL. O exemplo conecta ao banco local do Compose.

Em um banco novo e vazio:

```powershell
npm run db:schema
npm test
npm run dev
```

O script de schema não é idempotente nem apaga dados: não o execute novamente como rotina em banco já inicializado.

Em outro terminal, dentro de frontend:

```powershell
npm ci
npm test
npm run build
npm run dev
```

Abra o endereço exibido pelo Vite. A API deve estar em http://localhost:3000 e a origem do frontend deve coincidir com FRONTEND_ORIGIN. Não publique arquivos .env nem credenciais pessoais.

## Sequência restante

| Etapa | Implementação e critério de conclusão |
|---|---|
| 11 | API por categoria: totais de entradas/saídas, percentuais, ordenação e comparação com período anterior de igual duração; isolamento por usuário. |
| 12 | Tela por categoria: tabelas e gráfico; mostrar também categorias com gasto anterior e zero no período atual, indicando redução de 100%. |
| 13 | Relatório por fonte/destino: entradas, saídas e saldos por conta; tabelas devem incluir rendas e cartões, além das contas; gráficos e filtros. |
| 14 | Cálculo e API de faturas: datas de fechamento/vencimento, compra no dia de fechamento no próximo ciclo, meses curtos e virada de ano; limite comprometido por todas as parcelas ainda não vencidas. |
| 15 | Tela de faturas: atual aberta e próximas três, itens com número da parcela, totais e limites; datas brasileiras e referência MM/AAAA. |
| 16 | Dashboard mensal: entradas, saídas, saldo, movimentações recentes e gráfico integrado com as APIs; estados vazio, erro e carregamento. |
| 17 | Indicadores no backend: pelo menos três indicadores, reserva com saldo entradas menos saídas, projeção e dicas; revisar base histórica e evitar dupla contagem/omissão dos compromissos de cartão. |
| 18 | Saúde financeira no frontend: indicadores, gráfico de projeção, dicas e aviso educativo visível. |
| 19 | Seed com pelo menos dois usuários e três meses de lançamentos; testes integrados em PostgreSQL, checagem visual e correção dos problemas encontrados. |
| 20 | README completo, lista de rotas, regras/limiares das dicas, revisão item a item do enunciado e roteiro de apresentação de até dez minutos. |

Cada etapa deve resultar em uma mudança funcional que você consiga explicar, com mensagem de commit direta descrevendo o que foi feito. A sequência é planejamento; não altere autores ou datas para simular trabalho passado.

## Contratos que precisam ser preservados

- Backend: apenas routes, models, middlewares e config dentro de src; controladores nas rotas e SQL nos models.
- Autenticação: middleware autenticar preenche req.usuarioId a partir do JWT; nunca aceite usuário da URL ou do corpo como autorização.
- Relacionamentos: categoria e fonte/destino precisam pertencer ao usuário e ser compatíveis com o lançamento.
- Valores: NUMERIC no banco e centavos inteiros nas divisões; preserve precisão nos totais. A API devolve valores monetários como strings decimais.
- Parcelas: todas guardam a data da compra; a fatura futura deve usar essa data e parcela_atual. Uma compra de 100.00 em 3 vezes gera 33.34 + 33.33 + 33.33.
- Edição: altera somente a parcela escolhida; não muda total_parcelas, parcela_atual nem grupo_parcelamento. Exclusão do grupo é filtrada pelo usuário.
- Frontend: todas as chamadas passam por services/api.js; novas telas devem ficar dentro do layout e da rota protegida existentes.
- Token: expira em uma hora, persiste no localStorage e é removido em logout/401. Falhas temporárias ao restaurar sessão oferecem nova tentativa.

## Validação ainda pendente

No encerramento da etapa 10, passaram 49 testes de backend, 10 de frontend e o build. Os testes de banco usam consultas simuladas; não comprovam SQL executado, integridade ou atomicidade em PostgreSQL. Os testes do frontend não automatizam o navegador. Docker e PostgreSQL não estavam disponíveis no ambiente usado nessa etapa.

Antes de considerar a aplicação pronta, execute em banco de desenvolvimento:

1. Cadastre duas pessoas, teste e-mail/CPF repetidos com formatações diferentes e confira os erros no campo correto.
2. Faça login, recarregue a página, faça logout e teste token expirado/ausente.
3. Crie, edite e exclua categorias e contas; confirme bloqueio quando houver lançamentos.
4. Crie lançamentos e compra de 100.00 em três parcelas; confira valores, filtros, totais e paginação.
5. Edite uma parcela e confirme que as demais não mudam. Exclua uma parcela e depois outro grupo inteiro.
6. Tente ler, editar e excluir registros da segunda pessoa usando o token da primeira; espere 404 e confirme dados preservados no banco.
7. Provoque falha controlada durante a gravação de parcelas no banco de testes e confirme rollback real.
8. Verifique telas em desktop e largura móvel, navegação por teclado, erros de rede e confirmações dos diálogos.
9. Após implementar as etapas restantes, confira os exemplos de fechamento do enunciado, relatórios, reserva e projeção com valores conhecidos.

Avalie também concorrência entre mudança de tipo de categoria/conta e criação de lançamentos. As verificações atuais de tipo e as gravações são consultas separadas; se um teste concorrente revelar inconsistência, use uma estratégia transacional de bloqueio coerente nos fluxos envolvidos.

A aprovação das bibliotecas/banco pelo professor, a apresentação por ambos os integrantes e a compreensão do código são requisitos externos que o repositório sozinho não comprova.
