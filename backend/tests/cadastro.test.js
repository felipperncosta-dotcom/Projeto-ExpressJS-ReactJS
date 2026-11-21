import test from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcrypt';

// A conexão é substituída por um cliente simulado: estes testes não validam o PostgreSQL.
process.env.DATABASE_URL = 'postgres://teste:teste@127.0.0.1:1/teste';
const { app } = await import('../src/server.js');
const { pool } = await import('../src/config/database.js');
const { cpfValido } = await import('../src/models/utilitarios.js');

test('cadastro HTTP: validação, normalização, hash, conflitos e transação', async (t) => {
  const conectarOriginal = pool.connect;
  const consultas = [];
  let falha = null;
  let liberacoes = 0;
  pool.connect = async () => ({
    query: async (sql, parametros) => {
      consultas.push({ sql, parametros });
      if (falha && sql.includes(falha.trecho)) throw Object.assign(new Error('Falha simulada'), falha.erro);
      if (sql.includes('INSERT INTO usuarios')) {
        return { rows: [{ id: 42, nome: parametros[0], email: parametros[1] }] };
      }
      return { rows: [] };
    },
    release: () => { liberacoes += 1; },
  });
  const servidor = app.listen(0, '127.0.0.1');
  await new Promise(resolve => servidor.once('listening', resolve));
  const url = `http://127.0.0.1:${servidor.address().port}/api/auth/cadastro`;
  const valido = { nome: ' Pessoa Teste ', email: ' PESSOA@EXEMPLO.COM ', cpf: '529.982.247-25', senha: 'Senha1234', confirmarSenha: 'Senha1234' };
  const enviar = (body) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  try {
    await t.test('rejeita CPF inválido, campos ausentes, senha fraca e confirmação diferente', async () => {
      assert.equal(cpfValido('529.982.247-25'), true);
      assert.equal(cpfValido('52998224724'), false);
      assert.equal(cpfValido('11111111111'), false);
      for (const body of [{}, [], { ...valido, cpf: '11111111111' }, { ...valido, email: 'invalido' }, { ...valido, senha: '12345678' }, { ...valido, confirmarSenha: 'diferente' }, { ...valido, nome: 'a'.repeat(121) }, { ...valido, senha: 'a1'.repeat(37), confirmarSenha: 'a1'.repeat(37) }]) {
        const resposta = await enviar(body);
        assert.equal(resposta.status, 400);
        assert.ok((await resposta.json()).erro);
      }
      assert.equal(consultas.length, 0);
    });
    await t.test('normaliza dados, protege senha e cria padrões antes de confirmar', async () => {
      const resposta = await enviar(valido);
      assert.equal(resposta.status, 201);
      const dados = await resposta.json();
      assert.deepEqual(dados.usuario, { id: 42, nome: 'Pessoa Teste', email: 'pessoa@exemplo.com' });
      assert.equal(JSON.stringify(dados).includes('senha'), false);
      const usuario = consultas.find(item => item.sql.includes('INSERT INTO usuarios'));
      assert.equal(usuario.parametros[2], '52998224725');
      assert.notEqual(usuario.parametros[3], valido.senha);
      assert.equal(await bcrypt.compare(valido.senha, usuario.parametros[3]), true);
      assert.equal(consultas.filter(item => item.sql.includes('INSERT INTO categorias')).length, 10);
      assert.equal(consultas.filter(item => item.sql.includes('INSERT INTO fontes_destinos')).length, 1);
      assert.equal(consultas[0].sql, 'BEGIN');
      assert.equal(consultas.at(-1).sql, 'COMMIT');
      assert.equal(liberacoes, 1);
    });
    await t.test('traduz violações de unicidade para 409 por campo e desfaz transação', async () => {
      for (const campo of ['email', 'cpf']) {
        consultas.length = 0;
        falha = { trecho: 'INSERT INTO usuarios', erro: { code: '23505', constraint: `usuarios_${campo}_key` } };
        const resposta = await enviar(valido);
        assert.equal(resposta.status, 409);
        assert.ok((await resposta.json()).campos[campo]);
        assert.equal(consultas.at(-1).sql, 'ROLLBACK');
        assert.equal(consultas.some(item => item.sql === 'COMMIT'), false);
      }
    });
    await t.test('desfaz cadastro se a criação dos padrões falhar', async () => {
      consultas.length = 0;
      falha = { trecho: 'INSERT INTO categorias', erro: { code: 'XX000' } };
      const resposta = await enviar(valido);
      assert.equal(resposta.status, 500);
      assert.deepEqual(await resposta.json(), { erro: 'Erro interno do servidor.' });
      assert.equal(consultas.at(-1).sql, 'ROLLBACK');
      assert.equal(consultas.some(item => item.sql === 'COMMIT'), false);
      assert.equal(liberacoes, 4);
    });
    await t.test('JSON malformado retorna erro padronizado', async () => {
      const resposta = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' });
      assert.equal(resposta.status, 400);
      assert.equal((await resposta.json()).erro, 'JSON malformado.');
    });
  } finally {
    pool.connect = conectarOriginal;
    await new Promise(resolve => servidor.close(resolve));
    await pool.end();
  }
});
