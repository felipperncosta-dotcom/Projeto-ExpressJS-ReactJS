import { readFile } from 'node:fs/promises';
import { pool } from '../src/config/database.js';

let cliente;
try {
  const sql = await readFile(new URL('../database/schema.sql', import.meta.url), 'utf8');
  cliente = await pool.connect();
  await cliente.query('BEGIN');
  await cliente.query(sql);
  await cliente.query('COMMIT');
  console.log('Tabelas e índices criados com sucesso.');
} catch (erro) {
  if (cliente) await cliente.query('ROLLBACK');
  console.error('Não foi possível criar as tabelas:', erro.message);
  process.exitCode = 1;
} finally {
  if (cliente) cliente.release();
  await pool.end();
}
