import { Router } from 'express';
import bcrypt from 'bcrypt';
import { cpfValido } from '../models/utilitarios.js';
import { criarUsuarioComPadroes } from '../models/usuarioModel.js';
import { emailValido, objetoBody, senhaValida } from '../middlewares/validacao.js';
import { asyncHandler } from '../middlewares/erros.js';

const router = Router();

router.post('/cadastro', objetoBody, asyncHandler(async (req, res) => {
  const campos = {};
  const nome = typeof req.body.nome === 'string' ? req.body.nome.trim() : '';
  const emailOriginal = typeof req.body.email === 'string' ? req.body.email.trim() : '';
  const email = emailOriginal.toLowerCase();
  const cpf = typeof req.body.cpf === 'string' ? req.body.cpf.replace(/\D/g, '') : '';
  const senha = typeof req.body.senha === 'string' ? req.body.senha : '';
  const confirmarSenha = typeof req.body.confirmarSenha === 'string' ? req.body.confirmarSenha : '';

  if (!nome || nome.length > 120) campos.nome = 'Informe seu nome com até 120 caracteres.';
  if (!email) campos.email = 'Informe seu e-mail.';
  else if (email.length > 160 || !emailValido(email)) campos.email = 'Informe um e-mail válido.';
  if (!cpf) campos.cpf = 'Informe seu CPF.';
  else if (!cpfValido(cpf)) campos.cpf = 'Informe um CPF válido.';
  if (!senha) campos.senha = 'Informe uma senha.';
  else if (!senhaValida(senha)) campos.senha = 'Use ao menos 8 caracteres, com letras e números, e no máximo 72 bytes.';
  if (!confirmarSenha) campos.confirmarSenha = 'Confirme sua senha.';
  else if (senha !== confirmarSenha) campos.confirmarSenha = 'As senhas não coincidem.';

  if (Object.keys(campos).length) {
    return res.status(400).json({ erro: 'Revise os campos informados.', campos });
  }

  try {
    const senhaHash = await bcrypt.hash(senha, 10);
    const usuario = await criarUsuarioComPadroes({ nome, email, cpf, senhaHash });
    return res.status(201).json({ usuario });
  } catch (erro) {
    if (erro.code === '23505') {
      const campo = erro.constraint?.includes('cpf') ? 'cpf' : 'email';
      const nomeCampo = campo === 'cpf' ? 'CPF' : 'e-mail';
      return res.status(409).json({
        erro: 'Usuário já cadastrado.',
        campos: { [campo]: `Já existe um usuário com este ${nomeCampo}.` },
      });
    }
    throw erro;
  }
}));


export default router;
