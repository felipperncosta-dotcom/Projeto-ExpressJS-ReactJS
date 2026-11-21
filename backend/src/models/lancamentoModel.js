import { pool } from '../config/database.js';
import { centavosParaDecimal } from './utilitarios.js';

const selecao = `l.id, l.tipo, l.descricao, l.valor, to_char(l.data, 'YYYY-MM-DD') AS data,
  l.categoria_id, c.nome AS categoria_nome, l.fonte_destino_id,
  f.nome AS fonte_destino_nome, f.tipo AS fonte_destino_tipo,
  l.parcela_atual, l.total_parcelas, l.grupo_parcelamento`;

export async function listarLancamentos(usuarioId, filtros) {
  const valores = [usuarioId];
  const condicoes = ['l.usuario_id = $1'];
  const adicionar = (condicao, valor) => {
    valores.push(valor);
    condicoes.push(condicao.replace('?', `$${valores.length}`));
  };
  if (filtros.inicio) adicionar('l.data >= ?::date', filtros.inicio);
  if (filtros.fim) adicionar('l.data <= ?::date', filtros.fim);
  if (filtros.tipo) adicionar('l.tipo = ?', filtros.tipo);
  if (filtros.categoriaId) adicionar('l.categoria_id = ?', filtros.categoriaId);
  if (filtros.fonteDestinoId) adicionar('l.fonte_destino_id = ?', filtros.fonteDestinoId);

  const where = condicoes.join(' AND ');
  const resumo = await pool.query(
    `SELECT
       COALESCE(SUM(valor) FILTER (WHERE tipo = 'entrada'), 0)::numeric AS "totalEntradas",
       COALESCE(SUM(valor) FILTER (WHERE tipo = 'saida'), 0)::numeric AS "totalSaidas",
       (COALESCE(SUM(valor) FILTER (WHERE tipo = 'entrada'), 0)
         - COALESCE(SUM(valor) FILTER (WHERE tipo = 'saida'), 0))::numeric AS saldo,
       COUNT(*)::integer AS total
     FROM lancamentos l WHERE ${where}`,
    valores,
  );
  const offset = (filtros.pagina - 1) * filtros.limite;
  const parametros = [...valores, filtros.limite, offset];
  const linhas = await pool.query(
    `SELECT ${selecao} FROM lancamentos l
     JOIN categorias c ON c.id = l.categoria_id AND c.usuario_id = l.usuario_id
     JOIN fontes_destinos f ON f.id = l.fonte_destino_id AND f.usuario_id = l.usuario_id
     WHERE ${where} ORDER BY l.data DESC, l.id DESC
     LIMIT $${valores.length + 1} OFFSET $${valores.length + 2}`,
    parametros,
  );
  return {
    lancamentos: linhas.rows,
    pagina: filtros.pagina,
    limite: filtros.limite,
    totalEntradas: resumo.rows[0].totalEntradas,
    totalSaidas: resumo.rows[0].totalSaidas,
    saldo: resumo.rows[0].saldo,
    total: resumo.rows[0].total,
    totalPaginas: Math.ceil(resumo.rows[0].total / filtros.limite),
  };
}

export async function buscarLancamento(usuarioId, id) {
  const { rows: [lancamento] } = await pool.query(
    `SELECT ${selecao} FROM lancamentos l
     JOIN categorias c ON c.id = l.categoria_id AND c.usuario_id = l.usuario_id
     JOIN fontes_destinos f ON f.id = l.fonte_destino_id AND f.usuario_id = l.usuario_id
     WHERE l.id = $1 AND l.usuario_id = $2`, [id, usuarioId],
  );
  return lancamento ?? null;
}

export async function validarCategoriaFonte(usuarioId, categoriaId, fonteDestinoId) {
  const { rows: [relacoes] } = await pool.query(
    `SELECT c.tipo AS categoria_tipo, f.tipo AS fonte_destino_tipo
     FROM categorias c CROSS JOIN fontes_destinos f
     WHERE c.id = $1 AND f.id = $2
       AND c.usuario_id = $3 AND f.usuario_id = $3`,
    [categoriaId, fonteDestinoId, usuarioId],
  );
  return relacoes ?? null;
}

export async function criarLancamento(usuarioId, dados, centavos) {
  const { rows: [lancamento] } = await pool.query(
    `INSERT INTO lancamentos
      (usuario_id, tipo, descricao, valor, data, categoria_id, fonte_destino_id)
     VALUES ($1, $2, $3, $4, $5::date, $6, $7)
     RETURNING id, tipo, descricao, valor, to_char(data, 'YYYY-MM-DD') AS data,
       categoria_id, fonte_destino_id, parcela_atual, total_parcelas, grupo_parcelamento`,
    [usuarioId, dados.tipo, dados.descricao, centavosParaDecimal(centavos),
      dados.data, dados.categoria_id, dados.fonte_destino_id],
  );
  return lancamento;
}
