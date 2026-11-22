import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {pool} from '../src/config/database.js';
import {obterSaudeFinanceira} from '../src/models/saudeFinanceiraModel.js';

test('saúde considera despesas sem cartão e preserva centavos negativos',async()=>{
 let id;
 try {
 const u=await pool.query('INSERT INTO usuarios(nome,email,cpf,senha_hash) VALUES($1,$2,$3,$4) RETURNING id',['Teste saúde',randomUUID()+'@teste.test',String(Date.now()).slice(-11),'teste']);id=u.rows[0].id;
 const c=await pool.query("INSERT INTO categorias(usuario_id,nome,tipo) VALUES($1,'Teste','saida') RETURNING id",[id]);
 const f=await pool.query("INSERT INTO fontes_destinos(usuario_id,nome,tipo,reserva) VALUES($1,'Reserva','conta',true) RETURNING id",[id]);
 await pool.query("INSERT INTO lancamentos(usuario_id,tipo,descricao,valor,data,categoria_id,fonte_destino_id) VALUES($1,'saida','Teste',0.50,CURRENT_DATE,$2,$3)",[id,c.rows[0].id,f.rows[0].id]);
 const dados=await obterSaudeFinanceira(id);
 assert.equal(dados.indicadores.reservaEmergencia.total,'-0.50');
 assert.equal(dados.indicadores.saldoBaseProjecao,'-0.50');
 assert.equal(dados.indicadores.mediaLiquidaMensal,'-0.17');
 } finally {if(id) await pool.query('DELETE FROM usuarios WHERE id=$1',[id]);await pool.end();}
});
