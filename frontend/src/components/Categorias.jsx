import { useCallback, useEffect, useState } from 'react';
import api from '../services/api.js';

const vazio = { nome: '', tipo: 'saida' };

export default function Categorias() {
  const [categorias, setCategorias] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [erroLista, setErroLista] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [campos, setCampos] = useState({});
  const [form, setForm] = useState(vazio);
  const [editando, setEditando] = useState(null);
  const [aberto, setAberto] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErroLista('');
    try {
      const { data } = await api.get('/categorias');
      setCategorias(data.categorias);
    } catch (falha) {
      setErroLista(falha.response?.data?.erro || 'Não foi possível carregar as categorias.');
    } finally { setCarregando(false); }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  function iniciarEdicao(categoria) {
    setEditando(categoria.id);
    setForm({ nome: categoria.nome, tipo: categoria.tipo });
    setCampos({}); setErro(''); setAberto(true);
  }

  function cancelar() { setForm(vazio); setCampos({}); setEditando(null); setAberto(false); }

  async function salvar(evento) {
    evento.preventDefault();
    if (salvando) return;
    const novos = {};
    if (!form.nome.trim() || form.nome.trim().length > 60) novos.nome = 'Informe um nome com até 60 caracteres.';
    if (!['entrada', 'saida'].includes(form.tipo)) novos.tipo = 'Escolha um tipo.';
    setCampos(novos); setErro('');
    if (Object.keys(novos).length) return;
    setSalvando(true);
    try {
      if (editando) await api.put(`/categorias/${editando}`, { ...form, nome: form.nome.trim() });
      else await api.post('/categorias', { ...form, nome: form.nome.trim() });
      cancelar(); await carregar();
    } catch (falha) {
      setCampos((atuais) => ({ ...atuais, ...(falha.response?.data?.campos || {}) }));
      setErro(falha.response?.data?.erro || 'Não foi possível salvar a categoria.');
    } finally { setSalvando(false); }
  }

  async function excluir(categoria) {
    if (salvando) return;
    if (!window.confirm(`Excluir a categoria “${categoria.nome}”?`)) return;
    setErro('');
    setSalvando(true);
    try { await api.delete(`/categorias/${categoria.id}`); await carregar(); }
    catch (falha) { setErro(falha.response?.data?.erro || 'Não foi possível excluir a categoria.'); }
    finally { setSalvando(false); }
  }

  return (
    <section className="page-content">
      <div className="page-heading"><div><span className="eyebrow">ORGANIZAÇÃO</span><h1>Categorias</h1><p>Separe entradas e saídas pelos temas que fazem sentido para você.</p></div><button className="button button-primary" disabled={salvando} onClick={() => { setAberto(!aberto); setEditando(null); setForm(vazio); setCampos({}); setErro(''); }}>+ Nova categoria</button></div>
      {erro && <div className="alert" role="alert">{erro}</div>}
      {aberto && <form className="form-panel" onSubmit={salvar}>
        <div className="section-heading"><h2>{editando ? 'Editar categoria' : 'Nova categoria'}</h2><button type="button" className="button button-quiet" disabled={salvando} onClick={cancelar}>Fechar</button></div>
        <div className="form-row">
          <div className="form-control"><label htmlFor="categoria-nome">Nome</label><input maxLength={60} disabled={salvando} id="categoria-nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} aria-invalid={Boolean(campos.nome)} />{campos.nome && <small className="field-error">{campos.nome}</small>}</div>
          <div className="form-control"><label htmlFor="categoria-tipo">Tipo</label><select disabled={salvando} id="categoria-tipo" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}><option value="entrada">Entrada</option><option value="saida">Saída</option></select>{campos.tipo && <small className="field-error">{campos.tipo}</small>}</div>
        </div>
        <button disabled={salvando} className="button button-primary">{salvando ? 'Salvando…' : editando ? 'Salvar alterações' : 'Criar categoria'}</button>
      </form>}
      <section className="panel-card">
        <div className="section-heading"><div><span className="eyebrow">SEUS GRUPOS</span><h2>Categorias cadastradas</h2></div></div>
        {carregando ? <div className="state-card">Carregando categorias…</div> : erroLista ? <div className="alert" role="alert">{erroLista} <button className="button" onClick={carregar}>Tentar novamente</button></div> : categorias.length === 0 ? <div className="empty-state"><strong>Nenhuma categoria cadastrada.</strong><p>Crie uma categoria para organizar seus lançamentos.</p></div> : (
          <div className="table-wrap"><table><thead><tr><th>Nome</th><th>Tipo</th><th className="actions-heading">Ações</th></tr></thead><tbody>
            {categorias.map((categoria) => <tr key={categoria.id}><td><strong>{categoria.nome}</strong></td><td><span className={`tag ${categoria.tipo}`}>{categoria.tipo === 'entrada' ? 'Entrada' : 'Saída'}</span></td><td className="row-actions"><button className="text-button" disabled={salvando} onClick={() => iniciarEdicao(categoria)}>Editar</button><button className="text-button danger" disabled={salvando} onClick={() => excluir(categoria)}>Excluir</button></td></tr>)}
          </tbody></table></div>
        )}
      </section>
    </section>
  );
}
