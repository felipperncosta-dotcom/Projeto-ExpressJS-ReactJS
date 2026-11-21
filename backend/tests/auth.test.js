import test from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

process.env.DATABASE_URL = 'postgres://teste:teste@127.0.0.1:1/teste';
process.env.JWT_SECRET = 'segredo-exclusivo-dos-testes-de-login-12345';
const { app } = await import('../src/server.js');
const { pool } = await import('../src/config/database.js');
const { criarToken } = await import('../src/config/jwt.js');

test('login e identidade autenticada por HTTP com banco simulado', async (t) => {
  const senhaHash = await bcrypt.hash('Senha1234', 10);
  const pessoas = [
    { id: 1, nome: 'Pessoa A', email: 'a@teste.com', senha_hash: senhaHash },
    { id: 2, nome: 'Pessoa B', email: 'b@teste.com', senha_hash: senhaHash },
  ];
  const queryOriginal = pool.query;
  const consultas = [];
  pool.query = async (sql, parametros) => {
    consultas.push({ sql, parametros });
    const pessoa = sql.includes('WHERE email = $1')
      ? pessoas.find(item => item.email === parametros[0])
      : pessoas.find(item => item.id === parametros[0]);
    if (!pessoa) return { rows: [] };
    return { rows: [sql.includes('senha_hash') ? pessoa : { id: pessoa.id, nome: pessoa.nome, email: pessoa.email }] };
  };
  const servidor = app.listen(0, '127.0.0.1');
  await new Promise(resolve => servidor.once('listening', resolve));
  const base = `http://127.0.0.1:${servidor.address().port}/api/auth`;
  const login = (body) => fetch(`${base}/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const me = (token, query = '') => fetch(`${base}/me${query}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  try {
    await t.test('emite JWT com uma hora de validade e normaliza e-mail', async () => {
      const resposta = await login({ email: ' A@TESTE.COM ', senha: 'Senha1234' });
      assert.equal(resposta.status, 200);
      const dados = await resposta.json();
      const payload = jwt.verify(dados.token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
      assert.equal(payload.sub, '1');
      assert.equal(payload.exp - payload.iat, 3600);
      assert.deepEqual(dados.usuario, { id: 1, nome: 'Pessoa A', email: 'a@teste.com' });
      assert.equal(JSON.stringify(dados).includes('senha_hash'), false);
      assert.deepEqual(consultas.at(-1).parametros, ['a@teste.com']);
    });
    await t.test('responde igualmente para senha errada e usuário inexistente', async () => {
      const errado = await login({ email: 'a@teste.com', senha: 'Errada123' });
      const ausente = await login({ email: 'ninguem@teste.com', senha: 'Errada123' });
      assert.equal(errado.status, 401);
      assert.equal(ausente.status, 401);
      assert.deepEqual(await errado.json(), await ausente.json());
      assert.equal((await login({})).status, 400);
      assert.equal((await login({ email: 'a@teste.com', senha: 'a'.repeat(73) })).status, 400);
    });
    await t.test('recusa token ausente, adulterado, expirado ou com algoritmo/identidade inválidos', async () => {
      const segredo = process.env.JWT_SECRET;
      const tokens = [undefined, 'invalido',
        jwt.sign({}, 'outro-segredo', { subject: '1', expiresIn: '1h' }),
        jwt.sign({}, segredo, { subject: '1', expiresIn: -1 }),
        jwt.sign({}, segredo, { subject: '1', algorithm: 'HS384', expiresIn: '1h' }),
        jwt.sign({}, segredo, { subject: '0', expiresIn: '1h' }),
        jwt.sign({}, segredo, { subject: '1' }),
      ];
      const antes = consultas.length;
      for (const token of tokens) assert.equal((await me(token)).status, 401);
      assert.equal(consultas.length, antes);
    });
    await t.test('identidade vem do token, mesmo com outro id na query', async () => {
      for (const pessoa of pessoas) {
        const resposta = await me(criarToken(pessoa.id), `?usuarioId=${pessoa.id === 1 ? 2 : 1}`);
        assert.equal(resposta.status, 200);
        assert.equal((await resposta.json()).usuario.id, pessoa.id);
        assert.deepEqual(consultas.at(-1).parametros, [pessoa.id]);
      }
      assert.equal((await me(criarToken(999))).status, 404);
    });
    await t.test('limita a dez requisições de login por IP em quinze minutos', async () => {
      for (let i = 0; i < 5; i += 1) {
        assert.equal((await login({ email: 'a@teste.com', senha: 'Errada123' })).status, 401);
      }
      const antes = consultas.length;
      const bloqueada = await login({ email: 'a@teste.com', senha: 'Senha1234' });
      assert.equal(bloqueada.status, 429);
      assert.ok(bloqueada.headers.get('retry-after'));
      assert.ok((await bloqueada.json()).erro);
      assert.equal(consultas.length, antes);
    });
  } finally {
    pool.query = queryOriginal;
    await new Promise(resolve => servidor.close(resolve));
    await pool.end();
  }
});
