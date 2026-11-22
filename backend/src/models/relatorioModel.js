import { pool } from '../config/database.js';

function centavos(valor) {
  const [inteiro, fracao = '00'] = String(valor ?? '0').split('.');
  return Number(inteiro) * 100 + Number(fracao.padEnd(2, '0').slice(0, 2));
}

function decimal(valor) {
  const sinal = valor < 0 ? '-' : '';
  const absoluto = Math.abs(valor);
  return `${sinal}${Math.floor(absoluto / 100)}.${String(absoluto % 100).padStart(2, '0')}`;
}

function comparar(atual, anterior) {
  const diferenca = atual - anterior;
  return {
    totalAnterior: decimal(anterior),
    diferenca: decimal(Math.abs(diferenca)),
    variacaoPercentual: anterior ? Number(((diferenca / anterior) * 100).toFixed(2)) : null,
    tendencia: diferenca > 0 ? 'aumento' : diferenca < 0 ? 'reducao' : 'igual',
  };
}

export async function relatorioCategorias(usuarioId, periodo) {
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
  const saidas = rows.filter((item) => item.tipo === 'saida');
  const entradas = rows.filter((item) => item.tipo === 'entrada');
  const totalSaidas = saidas.reduce((soma, item) => soma + centavos(item.atual), 0);
  const totalEntradas = entradas.reduce((soma, item) => soma + centavos(item.atual), 0);
  const mapear = (item, total) => {
    const atual = centavos(item.atual);
    const anterior = centavos(item.anterior);
    return {
      id: item.id, nome: item.nome, total: decimal(atual),
      percentual: total ? Number(((atual / total) * 100).toFixed(2)) : 0,
      ...comparar(atual, anterior),
    };
  };
  saidas.sort((a, b) => centavos(b.atual) - centavos(a.atual) || a.nome.localeCompare(b.nome));
  entradas.sort((a, b) => centavos(b.atual) - centavos(a.atual) || a.nome.localeCompare(b.nome));
  return {
    periodo: { inicio: periodo.inicio, fim: periodo.fim },
    periodoAnterior: { inicio: periodo.anteriorInicio, fim: periodo.anteriorFim },
    totalSaidas: decimal(totalSaidas), totalEntradas: decimal(totalEntradas),
    saldo: decimal(totalEntradas - totalSaidas),
    categoriasSaida: saidas.map((item) => mapear(item, totalSaidas)),
    categoriasEntrada: entradas.map((item) => mapear(item, totalEntradas)),
  };
}
