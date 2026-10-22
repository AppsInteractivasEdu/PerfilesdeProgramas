import { useState } from "react";
import { ESTADO_ADMIN, ESTADO_DIRECTOR } from "../utils/constantes.js";

function Badge({ estadoDirector, estadoAdmin }) {
  if (estadoDirector === ESTADO_DIRECTOR.APROBADO) {
    return <span className="badge-approved">Aprobado por el director</span>;
  }
  if (estadoDirector === ESTADO_DIRECTOR.MODIFICAR) {
    if (estadoAdmin === ESTADO_ADMIN.APROBADO) {
      return <span className="badge-approved">Modificación aprobada</span>;
    }
    if (estadoAdmin === ESTADO_ADMIN.RECHAZADO) {
      return <span className="badge-rejected">Modificación rechazada</span>;
    }
    return <span className="badge-modify">Sugerencia enviada · en revisión</span>;
  }
  return <span className="badge-pending">Pendiente de revisión</span>;
}

export default function ComponenteBlock({ etiqueta, componente, onAprobar, onEnviarSugerencia }) {
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState(componente?.comentarioDirector || "");
  const [guardando, setGuardando] = useState(false);

  const estadoDirector = componente?.estadoDirector || ESTADO_DIRECTOR.PENDIENTE;
  const estadoAdmin = componente?.estadoAdmin || ESTADO_ADMIN.PENDIENTE;
  const fueRechazado =
    estadoDirector === ESTADO_DIRECTOR.MODIFICAR && estadoAdmin === ESTADO_ADMIN.RECHAZADO;

  const guardar = async () => {
    if (!texto.trim()) return;
    setGuardando(true);
    await onEnviarSugerencia(texto.trim());
    setGuardando(false);
    setEditando(false);
  };

  return (
    <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="font-semibold text-slate-800 dark:text-slate-100">{etiqueta}</h4>
        <Badge estadoDirector={estadoDirector} estadoAdmin={estadoAdmin} />
      </div>

      <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-700 dark:text-slate-300">
        {componente?.valor || "—"}
      </p>

      {fueRechazado && componente?.comentarioAdmin && (
        <p className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">
          <strong>El administrador no aprobó esta sugerencia:</strong>{" "}
          {componente.comentarioAdmin}
        </p>
      )}

      {!editando ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className="btn-approve" onClick={onAprobar}>
            ✓ Aprobar
          </button>
          <button
            type="button"
            className="btn-modify"
            onClick={() => setEditando(true)}
          >
            ✎ Modificar
          </button>
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          <label className="field-label" htmlFor={`sugerencia-${etiqueta}`}>
            Sugerencia para el administrador
          </label>
          <textarea
            id={`sugerencia-${etiqueta}`}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={3}
            placeholder="Describe qué debería cambiar en este componente…"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-institucional-navy focus:ring-2 focus:ring-institucional-navy/30 dark:border-slate-600 dark:focus:border-institucional-gold dark:focus:ring-institucional-gold/30"
          />
          <div className="flex gap-2">
            <button
              type="button"
              className="btn-primary"
              disabled={!texto.trim() || guardando}
              onClick={guardar}
            >
              {guardando ? "Guardando…" : "Guardar sugerencia"}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setEditando(false);
                setTexto(componente?.comentarioDirector || "");
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
