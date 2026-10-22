import { useState } from "react";
import RechazarModal from "./RechazarModal.jsx";
import { ESTADO_ADMIN } from "../utils/constantes.js";
import { aprobarSolicitudAdmin, rechazarSolicitudAdmin } from "../services/asignaturas.js";

function BadgeAdmin({ estado }) {
  if (estado === ESTADO_ADMIN.APROBADO) return <span className="badge-approved">Aprobada</span>;
  if (estado === ESTADO_ADMIN.RECHAZADO) return <span className="badge-rejected">Rechazada</span>;
  return <span className="badge-pending">Pendiente</span>;
}

export default function SolicitudRow({ asignaturaId, asignaturaNombre, clave, etiqueta, componente }) {
  const [mostrarRechazo, setMostrarRechazo] = useState(false);
  const estadoAdmin = componente?.estadoAdmin || ESTADO_ADMIN.PENDIENTE;

  return (
    <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-slate-800 dark:text-slate-100">
            {asignaturaNombre}
          </p>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {etiqueta}
          </p>
        </div>
        <BadgeAdmin estado={estadoAdmin} />
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <p className="field-label">Texto actual</p>
          <p className="mt-1 whitespace-pre-line text-sm text-slate-600 dark:text-slate-300">
            {componente?.valor}
          </p>
        </div>
        <div>
          <p className="field-label">Sugerencia del director</p>
          <p className="mt-1 whitespace-pre-line text-sm text-slate-700 dark:text-slate-200">
            {componente?.comentarioDirector}
          </p>
        </div>
      </div>

      {estadoAdmin === ESTADO_ADMIN.RECHAZADO && componente?.comentarioAdmin && (
        <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">
          <strong>Motivo del rechazo:</strong> {componente.comentarioAdmin}
        </p>
      )}

      {estadoAdmin === ESTADO_ADMIN.PENDIENTE && (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            className="btn-approve"
            onClick={() => aprobarSolicitudAdmin(asignaturaId, clave)}
          >
            ✓ Aprobar modificación
          </button>
          <button
            type="button"
            className="btn-danger"
            onClick={() => setMostrarRechazo(true)}
          >
            ✕ Rechazar
          </button>
        </div>
      )}

      {mostrarRechazo && (
        <RechazarModal
          titulo={`Rechazar modificación · ${asignaturaNombre}`}
          onCancelar={() => setMostrarRechazo(false)}
          onConfirmar={async (comentario) => {
            await rechazarSolicitudAdmin(asignaturaId, clave, comentario);
            setMostrarRechazo(false);
          }}
        />
      )}
    </div>
  );
}
