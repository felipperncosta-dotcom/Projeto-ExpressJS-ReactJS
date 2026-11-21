import 'dotenv/config';
import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors({ origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());

// As rotas financeiras serão implementadas nas próximas etapas.
app.use((_req, res) => res.status(404).json({ erro: 'Rota não encontrada.' }));

const porta = Number(process.env.PORT || 3000);
app.listen(porta, () => console.log(`API iniciada em http://localhost:${porta}`));
