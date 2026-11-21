import test from 'node:test';
import assert from 'node:assert/strict';
import { AxiosError } from 'axios';
import api from '../src/services/api.js';
import { TOKEN_KEY, EVENTO_SESSAO_EXPIRADA, expiracaoToken } from '../src/services/sessao.js';

test('sessão e cliente HTTP', async (t) => {
  const armazenamento = new Map();
  globalThis.localStorage = {
    getItem: chave => armazenamento.get(chave) ?? null,
    setItem: (chave, valor) => armazenamento.set(chave, valor),
    removeItem: chave => armazenamento.delete(chave),
  };
  globalThis.window = new EventTarget();
  let expiracoes = 0;
  window.addEventListener(EVENTO_SESSAO_EXPIRADA, () => { expiracoes += 1; });
  const adapterOriginal = api.defaults.adapter;
  const rejeitar = (status) => async config => {
    throw new AxiosError('Erro simulado', 'ERR_BAD_RESPONSE', config, null, { status, data: { erro: 'Falha' }, config });
  };
  try {
    await t.test('lê a expiração e rejeita tokens malformados ou sem exp', () => {
      const payload = Buffer.from(JSON.stringify({ exp: 1900000000 })).toString('base64url');
      assert.equal(expiracaoToken(`cabecalho.${payload}.assinatura`), 1900000000000);
      for (const token of ['', 'invalido', 'a.e30.c']) assert.equal(expiracaoToken(token), 0);
    });
    await t.test('adiciona o token persistido ao cabeçalho de autorização', async () => {
      localStorage.setItem(TOKEN_KEY, 'token-atual');
      api.defaults.adapter = async config => {
        assert.equal(config.headers.Authorization, 'Bearer token-atual');
        return { status: 200, data: {}, config };
      };
      await api.get('/auth/me');
    });
    await t.test('401 autenticado limpa a sessão e comunica expiração', async () => {
      api.defaults.adapter = rejeitar(401);
      await assert.rejects(api.get('/auth/me'));
      assert.equal(localStorage.getItem(TOKEN_KEY), null);
      assert.equal(expiracoes, 1);
    });
    await t.test('senha incorreta no login e falha do servidor preservam a sessão', async () => {
      localStorage.setItem(TOKEN_KEY, 'token-atual');
      api.defaults.adapter = rejeitar(401);
      await assert.rejects(api.post('/auth/login', {}));
      assert.equal(localStorage.getItem(TOKEN_KEY), 'token-atual');
      api.defaults.adapter = rejeitar(500);
      await assert.rejects(api.get('/auth/me'));
      assert.equal(localStorage.getItem(TOKEN_KEY), 'token-atual');
      assert.equal(expiracoes, 1);
    });
    await t.test('resposta antiga não encerra uma sessão nova', async () => {
      api.defaults.adapter = async config => {
        localStorage.setItem(TOKEN_KEY, 'novo-token');
        return rejeitar(401)(config);
      };
      await assert.rejects(api.get('/auth/me'));
      assert.equal(localStorage.getItem(TOKEN_KEY), 'novo-token');
      assert.equal(expiracoes, 1);
    });
  } finally {
    api.defaults.adapter = adapterOriginal;
    delete globalThis.localStorage;
    delete globalThis.window;
  }
});
