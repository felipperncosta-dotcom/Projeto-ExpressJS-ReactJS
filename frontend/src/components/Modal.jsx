import { useEffect, useRef } from 'react';

export default function Modal({ children, tituloId, aoFechar, ocupado = false }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialogo = ref.current;
    dialogo.showModal();
    return () => dialogo.close();
  }, []);
  return <dialog ref={ref} className="modal-card" aria-labelledby={tituloId}
    onCancel={evento => { evento.preventDefault(); if (!ocupado) aoFechar(); }}>
    {children}
  </dialog>;
}
