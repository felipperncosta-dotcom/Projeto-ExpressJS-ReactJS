import { Router } from 'express';
import { autenticar } from '../middlewares/autenticar.js';
import { asyncHandler } from '../middlewares/erros.js';
import { objetoBody, dataValida, idPositivo } from '../middlewares/validacao.js';
import { valorEmCentavos } from '../models/utilitarios.js';
import { listarLancamentos, buscarLancamento, validarCategoriaFonte, criarLancamento } from '../models/lancamentoModel.js';

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

router.post('/', objetoBody, asyncHandler(async (req, res) => {
  const body = req.body;
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
  if ((body.total_parcelas !== undefined && idPositivo(body.total_parcelas) !== 1)
    || (body.totalParcelas !== undefined && idPositivo(body.totalParcelas) !== 1)) {
    campos.total_parcelas = 'O parcelamento será disponibilizado na próxima etapa. Use uma parcela.';
  }
  if (Object.keys(campos).length) return res.status(400).json({ erro: 'Revise os campos informados.', campos });

  const relacoes = await validarCategoriaFonte(req.usuarioId, categoriaId, fonteDestinoId);
  if (!relacoes) return res.status(404).json({ erro: 'Categoria ou fonte/destino não encontrada.' });
  if (relacoes.categoria_tipo !== tipo) campos.categoria_id = 'A categoria precisa ter o mesmo tipo do lançamento.';
  if (tipo === 'entrada' && relacoes.fonte_destino_tipo === 'cartao_credito') campos.fonte_destino_id = 'Entradas não podem ser registradas em cartão de crédito.';
  if (tipo === 'saida' && relacoes.fonte_destino_tipo === 'renda') campos.fonte_destino_id = 'Saídas precisam usar uma conta ou cartão de crédito.';
  if (Object.keys(campos).length) return res.status(400).json({ erro: 'Categoria ou fonte incompatível.', campos });

  try {
    const lancamento = await criarLancamento(req.usuarioId, {
      tipo, descricao, data: body.data, categoria_id: categoriaId, fonte_destino_id: fonteDestinoId,
    }, centavos);
    return res.status(201).json({ lancamentos: [lancamento] });
  } catch (erro) {
    if (erro.code === '23503') return res.status(404).json({ erro: 'Categoria ou fonte/destino não encontrada.' });
    throw erro;
  }
}));

export default router;
