import { useState } from "react";

export default function RechazarModal({ titulo, onConfirmar, onCancelar }) {
  const [comentario, setComentario] = useState("");
  const [enviando, setEnviando] = useState(false);

  const confirmar = async () => {
    if (!comentario.trim()) return;
    setEnviando(true);
    await onConfirmar(comentario.trim());
    setEnviando(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="card w-full max-w-md p-6">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100">{titulo}</h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Para rechazar esta modificación debes explicar el motivo. El
          director podrá ver este comentario.
        </p>
        <textarea
          autoFocus
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
          rows={4}
          placeholder="Motivo del rechazo (obligatorio)…"
          className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-institucional-navy focus:ring-2 focus:ring-institucional-navy/30 dark:border-slate-600 dark:focus:border-institucional-gold dark:focus:ring-institucional-gold/30"
        />
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onCancelar}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn-danger"
            disabled={!comentario.trim() || enviando}
            onClick={confirmar}
          >
            {enviando ? "Guardando…" : "Rechazar con comentario"}
          </button>
        </div>
      </div>
    </div>
  );
}
