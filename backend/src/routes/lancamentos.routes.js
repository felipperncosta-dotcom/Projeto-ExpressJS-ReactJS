import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { autenticar } from '../middlewares/autenticar.js';
import { asyncHandler } from '../middlewares/erros.js';
import { objetoBody, dataValida, idPositivo } from '../middlewares/validacao.js';
import { valorEmCentavos, dividirParcelas } from '../models/utilitarios.js';
import { listarLancamentos, buscarLancamento, validarCategoriaFonte, criarLancamento, criarLancamentosTransacao, atualizarLancamento, removerLancamento } from '../models/lancamentoModel.js';

const router = Router();
router.use(autenticar);

function parametrosDeLista(query) {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = hoje.getMonth();
  const inicio = query.inicio ?? new Date(Date.UTC(ano, mes, 1)).toISOString().slice(0, 10);
  const fim = query.fim ?? new Date(Date.UTC(ano, mes + 1, 0)).toISOString().slice(0, 10);
  const pagina = query.pagina === undefined ? 1 : idPositivo(query.pagina);
  const limite = query.limite === undefined ? 20 : idPositivo(query.limite);
  const tipo = query.tipo || null;
  const categoriaId = query.categoriaId === undefined ? null : idPositivo(query.categoriaId);
  const fonteDestinoId = query.fonteDestinoId === undefined ? null : idPositivo(query.fonteDestinoId);
  const campos = {};
  if (!dataValida(inicio)) campos.inicio = 'Data inicial inválida.';
  if (!dataValida(fim)) campos.fim = 'Data final inválida.';
  if (dataValida(inicio) && dataValida(fim) && inicio > fim) campos.fim = 'Data final deve ser igual ou posterior à inicial.';
  if (!pagina) campos.pagina = 'Página deve ser um inteiro positivo.';
  if (!limite || limite > 100) campos.limite = 'Limite deve estar entre 1 e 100.';
  if (tipo && !['entrada', 'saida'].includes(tipo)) campos.tipo = 'Tipo deve ser entrada ou saida.';
  if (query.categoriaId !== undefined && !categoriaId) campos.categoriaId = 'Categoria inválida.';
  if (query.fonteDestinoId !== undefined && !fonteDestinoId) campos.fonteDestinoId = 'Fonte ou destino inválido.';
  return { campos, filtros: { inicio, fim, pagina, limite, tipo, categoriaId, fonteDestinoId } };
}

router.get('/', asyncHandler(async (req, res) => {
  const { campos, filtros } = parametrosDeLista(req.query);
  if (Object.keys(campos).length) return res.status(400).json({ erro: 'Revise os filtros informados.', campos });
  return res.json(await listarLancamentos(req.usuarioId, filtros));
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const id = idPositivo(req.params.id);
  if (!id) return res.status(404).json({ erro: 'Lançamento não encontrado.' });
  const lancamento = await buscarLancamento(req.usuarioId, id);
  if (!lancamento) return res.status(404).json({ erro: 'Lançamento não encontrado.' });
  return res.json({ lancamento });
}));

function validarDados(body, parcelasPadrao = 1, criacao = true) {
  const campos = {};
  const tipo = body.tipo;
  const descricao = typeof body.descricao === 'string' ? body.descricao.trim() : '';
  const categoriaId = idPositivo(body.categoria_id ?? body.categoriaId);
  const fonteDestinoId = idPositivo(body.fonte_destino_id ?? body.fonteDestinoId);
  let centavos;
  try { centavos = valorEmCentavos(body.valor); }
  catch { campos.valor = 'Informe um valor positivo de até 9.999.999.999,99, com no máximo duas casas decimais.'; }
  if (!['entrada', 'saida'].includes(tipo)) campos.tipo = 'Tipo deve ser entrada ou saida.';
  if (!descricao || descricao.length > 120) campos.descricao = 'Informe uma descrição com até 120 caracteres.';
  if (!dataValida(body.data)) campos.data = 'Informe uma data válida no formato AAAA-MM-DD.';
  if (!categoriaId) campos.categoria_id = 'Selecione uma categoria válida.';
  if (!fonteDestinoId) campos.fonte_destino_id = 'Selecione uma fonte ou destino válido.';
  const informado = body.total_parcelas !== undefined ? body.total_parcelas
    : body.totalParcelas !== undefined ? body.totalParcelas : parcelasPadrao;
  const totalParcelas = idPositivo(informado);
  if (!totalParcelas || totalParcelas > 48) campos.total_parcelas = 'Use de 1 a 48 parcelas.';
  else if (criacao && centavos !== undefined && totalParcelas > centavos) {
    campos.total_parcelas = 'Cada parcela precisa valer pelo menos um centavo.';
  }
  if (body.total_parcelas !== undefined && body.totalParcelas !== undefined
    && idPositivo(body.total_parcelas) !== idPositivo(body.totalParcelas)) {
    campos.total_parcelas = 'Informe uma única quantidade de parcelas.';
  }
  return {
    campos, centavos, totalParcelas,
    dados: { tipo, descricao, data: body.data, categoria_id: categoriaId, fonte_destino_id: fonteDestinoId },
  };
}

function validarCompatibilidade(tipo, relacoes, totalParcelas) {
  const campos = {};
  if (relacoes.categoria_tipo !== tipo) campos.categoria_id = 'A categoria precisa ter o mesmo tipo do lançamento.';
  if (tipo === 'entrada' && relacoes.fonte_destino_tipo === 'cartao_credito') campos.fonte_destino_id = 'Entradas não podem ser registradas em cartão de crédito.';
  if (tipo === 'saida' && relacoes.fonte_destino_tipo === 'renda') campos.fonte_destino_id = 'Saídas precisam usar uma conta ou cartão de crédito.';
  if (totalParcelas > 1 && relacoes.fonte_destino_tipo !== 'cartao_credito') campos.total_parcelas = 'Parcelamento só é permitido em cartão de crédito.';
  return campos;
}

router.post('/', objetoBody, asyncHandler(async (req, res) => {
  const { campos, centavos, totalParcelas, dados } = validarDados(req.body);
  if (Object.keys(campos).length) return res.status(400).json({ erro: 'Revise os campos informados.', campos });
  const relacoes = await validarCategoriaFonte(req.usuarioId, dados.categoria_id, dados.fonte_destino_id);
  if (!relacoes) return res.status(404).json({ erro: 'Categoria ou fonte/destino não encontrada.' });
  const incompatibilidade = validarCompatibilidade(dados.tipo, relacoes, totalParcelas);
  if (Object.keys(incompatibilidade).length) return res.status(400).json({ erro: 'Categoria, fonte ou parcelamento incompatível.', campos: incompatibilidade });
  try {
    const lancamentos = totalParcelas === 1
      ? [await criarLancamento(req.usuarioId, dados, centavos)]
      : await criarLancamentosTransacao(req.usuarioId, dados, dividirParcelas(req.body.valor, totalParcelas), randomUUID());
    return res.status(201).json({ lancamentos });
  } catch (erro) {
    if (erro.code === '23503') return res.status(404).json({ erro: 'Categoria ou fonte/destino não encontrada.' });
    throw erro;
  }
}));

router.put('/:id', objetoBody, asyncHandler(async (req, res) => {
  const id = idPositivo(req.params.id);
  if (!id) return res.status(404).json({ erro: 'Lançamento não encontrado.' });
  const existente = await buscarLancamento(req.usuarioId, id);
  if (!existente) return res.status(404).json({ erro: 'Lançamento não encontrado.' });
  const { campos, centavos, totalParcelas, dados } = validarDados(req.body, existente.total_parcelas, false);
  if (Object.keys(campos).length) return res.status(400).json({ erro: 'Revise os campos informados.', campos });
  if (totalParcelas !== existente.total_parcelas) {
    return res.status(400).json({ erro: 'A quantidade de parcelas não pode ser alterada.', campos: { total_parcelas: 'Mantenha a quantidade original de parcelas.' } });
  }
  const relacoes = await validarCategoriaFonte(req.usuarioId, dados.categoria_id, dados.fonte_destino_id);
  if (!relacoes) return res.status(404).json({ erro: 'Categoria ou fonte/destino não encontrada.' });
  const incompatibilidade = validarCompatibilidade(dados.tipo, relacoes, totalParcelas);
  if (Object.keys(incompatibilidade).length) return res.status(400).json({ erro: 'Categoria, fonte ou parcelamento incompatível.', campos: incompatibilidade });
  try {
    const lancamento = await atualizarLancamento(req.usuarioId, id, dados, centavos);
    if (!lancamento) return res.status(404).json({ erro: 'Lançamento não encontrado.' });
    return res.json({ lancamento });
  } catch (erro) {
    if (erro.code === '23503') return res.status(404).json({ erro: 'Categoria ou fonte/destino não encontrada.' });
    throw erro;
  }
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const id = idPositivo(req.params.id);
  if (!id) return res.status(404).json({ erro: 'Lançamento não encontrado.' });
  if (req.query.todasParcelas !== undefined && !['true', 'false'].includes(req.query.todasParcelas)) {
    return res.status(400).json({ erro: 'Use true ou false em todasParcelas.' });
  }
  const apagados = await removerLancamento(req.usuarioId, id, req.query.todasParcelas === 'true');
  if (!apagados) return res.status(404).json({ erro: 'Lançamento não encontrado.' });
  return res.status(204).end();
}));

export default router;
