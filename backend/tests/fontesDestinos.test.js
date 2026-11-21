import test from 'node:test';
import assert from 'node:assert/strict';

process.env.DATABASE_URL = 'postgres://teste:teste@127.0.0.1:1/teste';
process.env.JWT_SECRET = 'segredo-exclusivo-dos-testes-de-fontes-12345';
const { app } = await import('../src/server.js');
const { pool } = await import('../src/config/database.js');
const { criarToken } = await import('../src/config/jwt.js');

test('fontes e destinos por HTTP com banco simulado', async (t) => {
  const original = pool.query;
  const fila = [];
  const esperar = (sql, parametros, rows = [], erro = null) => fila.push({ sql, parametros, rows, erro });
  pool.query = async (sql, parametros) => {
    const item = fila.shift();
    assert.ok(item, `Consulta inesperada: ${sql}`);
    assert.match(sql, item.sql);
    assert.deepEqual(parametros, item.parametros);
    if (item.erro) throw Object.assign(new Error('Falha simulada'), { code: item.erro });
    return { rows: item.rows, rowCount: item.rows.length };
  };
  const servidor = app.listen(0, '127.0.0.1');
  await new Promise(resolve => servidor.once('listening', resolve));
  const base = `http://127.0.0.1:${servidor.address().port}/api/fontes-destinos`;
  const token = criarToken(1);
  const enviar = (method, caminho = '', body, autenticado = true) => fetch(base + caminho, {
    method, headers: { 'Content-Type': 'application/json', ...(autenticado ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const cartao = { nome: 'Visa', tipo: 'cartao_credito', dia_fechamento: 25, dia_vencimento: 5, limite: '3000.50' };
  try {
    await t.test('exige autenticação em todas as operações', async () => {
      for (const metodo of ['GET', 'POST', 'PUT', 'DELETE']) {
        assert.equal((await enviar(metodo, ['PUT', 'DELETE'].includes(metodo) ? '/10' : '', undefined, false)).status, 401);
      }
    });
    await t.test('lista somente dados do usuário autenticado', async () => {
      esperar(/FROM fontes_destinos WHERE usuario_id = \$1/, [1], [{ id: 10, nome: 'Conta', tipo: 'conta' }]);
      const resposta = await enviar('GET', '?usuarioId=2');
      assert.equal(resposta.status, 200);
      assert.equal((await resposta.json()).fontesDestinos[0].id, 10);
    });
    await t.test('rejeita campos inválidos, reserva incompatível e limites imprecisos', async () => {
      const invalidos = [[], {}, { nome: 'a'.repeat(61), tipo: 'conta' },
        { nome: 'Reserva', tipo: 'renda', reserva: true }, { nome: 'Reserva', tipo: 'conta', reserva: 'true' },
        { nome: 'Visa', tipo: 'cartao_credito' },
        ...[0, 32, true, [], 2.5].map(dia_fechamento => ({ ...cartao, dia_fechamento })),
        ...['0', '-1', '0.001', '10000000000.00', true, [], 'abc'].map(limite => ({ ...cartao, limite })),
      ];
      for (const body of invalidos) assert.equal((await enviar('POST', '', body)).status, 400, JSON.stringify(body));
      assert.equal((await enviar('PUT', '/10', [])).status, 400);
      assert.equal((await enviar('DELETE', '/abc')).status, 404);
    });
    await t.test('cria renda, conta com reserva e cartão ignorando usuário do corpo', async () => {
      const exemplos = [
        [{ nome: ' Salário ', tipo: 'renda', usuario_id: 2 }, [1, 'Salário', 'renda', null, null, null, false]],
        [{ nome: 'Poupança', tipo: 'conta', reserva: true }, [1, 'Poupança', 'conta', null, null, null, true]],
        [cartao, [1, 'Visa', 'cartao_credito', 25, 5, '3000.50', false]],
      ];
      for (const [body, parametros] of exemplos) {
        esperar(/INSERT INTO fontes_destinos/, parametros, [{ id: 10, ...body }]);
        assert.equal((await enviar('POST', '', body)).status, 201);
      }
      esperar(/INSERT INTO fontes_destinos/, [1, 'Visa', 'cartao_credito', 25, 5, '3000.50', false], [], '23505');
      const duplicado = await enviar('POST', '', cartao);
      assert.equal(duplicado.status, 409);
      assert.ok((await duplicado.json()).campos.nome);
    });
    await t.test('atualiza dados próprios e impede alterações de outro usuário', async () => {
      esperar(/WHERE id = \$1 AND usuario_id = \$2/, [10, 1], [{ tipo: 'cartao_credito' }]);
      esperar(/UPDATE fontes_destinos[\s\S]*WHERE id = \$7 AND usuario_id = \$8/, ['Visa', 'cartao_credito', 25, 5, '3000.50', false, 10, 1], [{ id: 10, ...cartao }]);
      assert.equal((await enviar('PUT', '/10', cartao)).status, 200);
      esperar(/WHERE id = \$1 AND usuario_id = \$2/, [99, 1]);
      assert.equal((await enviar('PUT', '/99', cartao)).status, 404);
      esperar(/DELETE FROM fontes_destinos WHERE id = \$1 AND usuario_id = \$2/, [99, 1]);
      assert.equal((await enviar('DELETE', '/99')).status, 404);
    });
    await t.test('bloqueia troca de tipo e exclusão quando há lançamentos', async () => {
      esperar(/WHERE id = \$1 AND usuario_id = \$2/, [10, 1], [{ tipo: 'conta' }]);
      esperar(/WHERE fonte_destino_id = \$1 AND usuario_id = \$2/, [10, 1], [{}]);
      const troca = await enviar('PUT', '/10', cartao);
      assert.equal(troca.status, 409);
      assert.ok((await troca.json()).campos.tipo);
      esperar(/DELETE FROM fontes_destinos WHERE id = \$1 AND usuario_id = \$2/, [10, 1], [], '23503');
      assert.equal((await enviar('DELETE', '/10')).status, 409);
    });
    await t.test('exclui cadastro livre sem retornar corpo', async () => {
      esperar(/DELETE FROM fontes_destinos WHERE id = \$1 AND usuario_id = \$2/, [10, 1], [{}]);
      const resposta = await enviar('DELETE', '/10');
      assert.equal(resposta.status, 204);
      assert.equal(await resposta.text(), '');
    });
    assert.equal(fila.length, 0);
  } finally {
    pool.query = original;
    await new Promise(resolve => servidor.close(resolve));
    await pool.end();
  }
});
