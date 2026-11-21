import test from 'node:test';
import assert from 'node:assert/strict';

process.env.DATABASE_URL = 'postgres://teste:teste@127.0.0.1:1/teste';
process.env.JWT_SECRET = 'segredo-exclusivo-dos-testes-de-categorias-123';
const { app } = await import('../src/server.js');
const { pool } = await import('../src/config/database.js');
const { criarToken } = await import('../src/config/jwt.js');

test('categorias por HTTP com consultas de banco simuladas', async (t) => {
  const queryOriginal = pool.query;
  const fila = [];
  const esperar = (sql, parametros, rows = [], erro = null) => fila.push({ sql, parametros, rows, erro });
  pool.query = async (sql, parametros) => {
    const esperado = fila.shift();
    assert.ok(esperado, `Consulta inesperada: ${sql}`);
    assert.match(sql, esperado.sql);
    assert.deepEqual(parametros, esperado.parametros);
    if (esperado.erro) throw Object.assign(new Error('Erro simulado'), { code: esperado.erro });
    return { rows: esperado.rows, rowCount: esperado.rows.length };
  };
  const servidor = app.listen(0, '127.0.0.1');
  await new Promise(resolve => servidor.once('listening', resolve));
  const base = `http://127.0.0.1:${servidor.address().port}/api/categorias`;
  const token = criarToken(1);
  const enviar = (metodo, caminho = '', body, autenticar = true) => fetch(base + caminho, {
    method: metodo,
    headers: { ...(autenticar ? { Authorization: `Bearer ${token}` } : {}), 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  try {
    await t.test('todas as operações exigem autenticação', async () => {
      for (const metodo of ['GET', 'POST', 'PUT', 'DELETE']) {
        assert.equal((await enviar(metodo, ['PUT', 'DELETE'].includes(metodo) ? '/1' : '', undefined, false)).status, 401);
      }
    });
    await t.test('lista somente categorias do usuário do token', async () => {
      esperar(/WHERE usuario_id = \$1/, [1], [{ id: 10, nome: 'Saúde', tipo: 'saida' }]);
      const resposta = await enviar('GET', '?usuarioId=2');
      assert.equal(resposta.status, 200);
      assert.deepEqual((await resposta.json()).categorias, [{ id: 10, nome: 'Saúde', tipo: 'saida' }]);
    });
    await t.test('valida nome, tipo, corpo e identificador', async () => {
      for (const dados of [{}, [], { nome: ' ', tipo: 'saida' }, { nome: 'a'.repeat(61), tipo: 'saida' }, { nome: 'Teste', tipo: 'outro' }]) {
        assert.equal((await enviar('POST', '', dados)).status, 400);
      }
      assert.equal((await enviar('PUT', '/10', [])).status, 400);
      assert.equal((await enviar('DELETE', '/abc')).status, 404);
      assert.equal((await enviar('DELETE', '/9007199254740992')).status, 404);
    });
    await t.test('cria e trata duplicidade sem aceitar usuário do corpo', async () => {
      const dados = { nome: ' Saúde ', tipo: 'saida', usuario_id: 2 };
      esperar(/INSERT INTO categorias/, [1, 'Saúde', 'saida'], [{ id: 10, nome: 'Saúde', tipo: 'saida' }]);
      assert.equal((await enviar('POST', '', dados)).status, 201);
      esperar(/INSERT INTO categorias/, [1, 'Saúde', 'saida'], [], '23505');
      const duplicada = await enviar('POST', '', dados);
      assert.equal(duplicada.status, 409);
      assert.ok((await duplicada.json()).campos.nome);
    });
    await t.test('edita categoria própria e trata nome duplicado', async () => {
      for (const erro of [null, '23505']) {
        esperar(/WHERE id = \$1 AND usuario_id = \$2/, [10, 1], [{ tipo: 'saida' }]);
        esperar(/UPDATE categorias[\s\S]*WHERE id = \$3 AND usuario_id = \$4/, ['Saúde nova', 'saida', 10, 1], [{ id: 10, nome: 'Saúde nova', tipo: 'saida' }], erro);
        const resposta = await enviar('PUT', '/10', { nome: 'Saúde nova', tipo: 'saida' });
        assert.equal(resposta.status, erro ? 409 : 200);
      }
    });
    await t.test('não altera nem exclui categoria de terceiro', async () => {
      esperar(/WHERE id = \$1 AND usuario_id = \$2/, [99, 1]);
      assert.equal((await enviar('PUT', '/99', { nome: 'Tentativa', tipo: 'saida' })).status, 404);
      esperar(/DELETE FROM categorias WHERE id = \$1 AND usuario_id = \$2/, [99, 1]);
      assert.equal((await enviar('DELETE', '/99')).status, 404);
    });
    await t.test('impede trocar tipo ou excluir categoria em uso', async () => {
      esperar(/WHERE id = \$1 AND usuario_id = \$2/, [10, 1], [{ tipo: 'saida' }]);
      esperar(/WHERE categoria_id = \$1 AND usuario_id = \$2/, [10, 1], [{ existe: 1 }]);
      const troca = await enviar('PUT', '/10', { nome: 'Saúde', tipo: 'entrada' });
      assert.equal(troca.status, 409);
      assert.ok((await troca.json()).campos.tipo);
      esperar(/DELETE FROM categorias WHERE id = \$1 AND usuario_id = \$2/, [10, 1], [], '23503');
      assert.equal((await enviar('DELETE', '/10')).status, 409);
    });
    await t.test('exclui categoria livre com resposta sem corpo', async () => {
      esperar(/DELETE FROM categorias WHERE id = \$1 AND usuario_id = \$2/, [10, 1], [{}]);
      const resposta = await enviar('DELETE', '/10');
      assert.equal(resposta.status, 204);
      assert.equal(await resposta.text(), '');
    });
    assert.equal(fila.length, 0);
  } finally {
    pool.query = queryOriginal;
    await new Promise(resolve => servidor.close(resolve));
    await pool.end();
  }
});
