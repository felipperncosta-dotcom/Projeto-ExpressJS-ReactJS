import 'dotenv/config';
import pg from 'pg';

if (!process.env.DATABASE_URL) {
  throw new Error('Configure DATABASE_URL no arquivo backend/.env.');
}

// Reutiliza conexões e limita o tempo de espera quando o banco está indisponível.
export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  connectionTimeoutMillis: 5000,
});

pool.on('error', () => {
  console.error('Uma conexão ociosa com o PostgreSQL foi encerrada inesperadamente.');
});
