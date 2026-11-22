import { pool } from '../config/database.js';
import { calcularFatura } from './utilitarios.js';

function cents(valor) {
  const [inteiro, decimal = '00'] = String(valor ?? '0').split('.');
  return Number(inteiro) * 100 + Number(decimal.padEnd(2, '0').slice(0, 2));
}

function decimal(centavos) {
  const sinal = centavos < 0 ? '-' : '';
  const absoluto = Math.abs(centavos);
  return `${sinal}${Math.floor(absoluto / 100)}.${String(absoluto % 100).padStart(2, '0')}`;
}

function tendencia(atual, anterior) {
  const diferenca = atual - anterior;
  return {
    totalAnterior: decimal(anterior),
    diferenca: decimal(Math.abs(diferenca)),
    variacaoPercentual: anterior === 0 ? null : Number(((diferenca / anterior) * 100).toFixed(2)),
    tendencia: diferenca > 0 ? 'aumento' : diferenca < 0 ? 'reducao' : 'igual',
  };
}

export async function relatorioCategorias(usuarioId, periodo) {
  // A consulta agrega o período atual e o anterior em uma única leitura.
  const { rows } = await pool.query(
    `SELECT c.id, c.nome, c.tipo,
       COALESCE(SUM(l.valor) FILTER (WHERE l.data BETWEEN $2::date AND $3::date), 0)::numeric(12,2) AS atual,
       COALESCE(SUM(l.valor) FILTER (WHERE l.data BETWEEN $4::date AND $5::date), 0)::numeric(12,2) AS anterior
     FROM categorias c
     LEFT JOIN lancamentos l ON l.categoria_id = c.id AND l.usuario_id = c.usuario_id
       AND l.data BETWEEN $4::date AND $3::date
     WHERE c.usuario_id = $1
     GROUP BY c.id, c.nome, c.tipo`,
    [usuarioId, periodo.inicio, periodo.fim, periodo.anteriorInicio, periodo.anteriorFim],
  );
  const saidas = rows.filter((row) => row.tipo === 'saida');
  const entradas = rows.filter((row) => row.tipo === 'entrada');
  const totalSaidas = saidas.reduce((total, row) => total + cents(row.atual), 0);
  const totalEntradas = entradas.reduce((total, row) => total + cents(row.atual), 0);
  const montar = (row, total) => {
    const atual = cents(row.atual);
    const anterior = cents(row.anterior);
    return {
      id: row.id, nome: row.nome, total: decimal(atual),
      percentual: total ? Number(((atual / total) * 100).toFixed(2)) : 0,
      ...tendencia(atual, anterior),
    };
  };
  saidas.sort((a, b) => cents(b.atual) - cents(a.atual));
  entradas.sort((a, b) => cents(b.atual) - cents(a.atual));
  return {
    periodo: { inicio: periodo.inicio, fim: periodo.fim },
    periodoAnterior: { inicio: periodo.anteriorInicio, fim: periodo.anteriorFim },
    totalSaidas: decimal(totalSaidas),
    totalEntradas: decimal(totalEntradas),
    saldo: decimal(totalEntradas - totalSaidas),
    categoriasSaida: saidas.map((row) => montar(row, totalSaidas)),
    categoriasEntrada: entradas.map((row) => montar(row, totalEntradas)),
  };
}

export async function relatorioFontesDestinos(usuarioId, periodo) {
  // Entradas, saídas e saldos são agrupados por cadastro no PostgreSQL.
  const { rows } = await pool.query(
    `SELECT f.id, f.nome, f.tipo,
       COALESCE(SUM(l.valor) FILTER (WHERE l.tipo = 'entrada'), 0)::numeric(12,2) AS entradas,
       COALESCE(SUM(l.valor) FILTER (WHERE l.tipo = 'saida'), 0)::numeric(12,2) AS saidas
     FROM fontes_destinos f
     LEFT JOIN lancamentos l ON l.fonte_destino_id = f.id AND l.usuario_id = f.usuario_id
       AND l.data BETWEEN $2::date AND $3::date
     WHERE f.usuario_id = $1
     GROUP BY f.id, f.nome, f.tipo
     ORDER BY f.nome`,
    [usuarioId, periodo.inicio, periodo.fim],
  );
  const mapear = (row) => ({
    id: row.id, nome: row.nome, tipo: row.tipo,
    entradas: row.entradas, saidas: row.saidas,
    saldo: decimal(cents(row.entradas) - cents(row.saidas)),
  });
  const fontes = rows.map(mapear);
  return {
    periodo: { inicio: periodo.inicio, fim: periodo.fim },
    totalEntradas: decimal(rows.reduce((soma, row) => soma + cents(row.entradas), 0)),
    totalSaidas: decimal(rows.reduce((soma, row) => soma + cents(row.saidas), 0)),
    entradasPorFonte: fontes.filter((row) => cents(row.entradas) > 0),
    saidasPorDestino: fontes.filter((row) => cents(row.saidas) > 0),
    saldoPorConta: fontes.filter((row) => row.tipo === 'conta'),
  };
}

