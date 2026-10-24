import { useState } from "react";
import RechazarModal from "./RechazarModal.jsx";
import {
  ESTADO_ADMIN,
  ESTADO_REVISOR,
  ETIQUETA_REVISOR,
  ROL_ADMIN_NOMBRE,
  partirCompetencia,
} from "../utils/constantes.js";

function Badge({ estado, estadoAdmin, textoActualizado, paraAdmin }) {
  if (estado === ESTADO_REVISOR.APROBADO) {
    return <span className="badge-approved">Aprobado</span>;
  }
  if (estado === ESTADO_REVISOR.MODIFICAR) {
    if (estadoAdmin === ESTADO_ADMIN.APROBADO) {
      return <span className="badge-approved">Modificación aprobada</span>;
    }
    if (estadoAdmin === ESTADO_ADMIN.RECHAZADO) {
      return <span className="badge-rejected">Modificación rechazada</span>;
    }
    return (
      <span className="badge-modify">
        {paraAdmin ? "Modificación solicitada" : "Sugerencia enviada · en revisión"}
      </span>
    );
  }
  if (textoActualizado) {
    return (
      <span className="badge-modify">
        {paraAdmin ? "Texto actualizado · espera revisión" : "Texto actualizado · por aprobar"}
      </span>
    );
  }
  return <span className="badge-pending">{paraAdmin ? "Sin revisión" : "Pendiente de revisión"}</span>;
}

const CAMPO =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-institucional-navy focus:ring-2 focus:ring-institucional-navy/30 dark:border-slate-600 dark:focus:border-institucional-gold dark:focus:ring-institucional-gold/30";

function claseTarjeta(resaltar) {
  const base = "flex h-full flex-col rounded-xl border p-4 ";
  if (!resaltar) return base + "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800";
  return base + "border-orange-400 bg-orange-50 ring-2 ring-orange-300 dark:border-orange-500 dark:bg-orange-900/15 dark:ring-orange-700";
}

/** Bloque de revisión de UN revisor (director de programa, departamento o decano), para la vista del administrador. */
function PanelRevisor({ revisor, rev, onAprobarModificacion, onRechazar }) {
  const [mostrarRechazo, setMostrarRechazo] = useState(false);
  const estado = rev?.estado || ESTADO_REVISOR.PENDIENTE;
  const estadoAdmin = rev?.estadoAdmin || ESTADO_ADMIN.PENDIENTE;
  const pidioModificar = estado === ESTADO_REVISOR.MODIFICAR;
  const fueRechazado = pidioModificar && estadoAdmin === ESTADO_ADMIN.RECHAZADO;
  const puedeResolver = pidioModificar && estadoAdmin === ESTADO_ADMIN.PENDIENTE;

  return (
    <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700/80 dark:bg-slate-800/40">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {ETIQUETA_REVISOR[revisor]}
        </p>
        <Badge estado={estado} estadoAdmin={estadoAdmin} textoActualizado={false} paraAdmin />
      </div>

      {pidioModificar && rev?.comentario && (
        <p className="mt-2 whitespace-pre-line rounded bg-orange-100/80 px-2 py-1.5 text-sm text-slate-800 dark:bg-orange-900/30 dark:text-orange-50">
          {rev.comentario}
        </p>
      )}

      {fueRechazado && rev?.comentarioAdmin && (
        <p className="mt-2 rounded bg-rose-50 px-2 py-1.5 text-xs text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">
          <strong>Motivo del rechazo:</strong> {rev.comentarioAdmin}
        </p>
      )}

      {puedeResolver && (
        <div className="mt-2 flex flex-wrap gap-2">
          <button type="button" className="btn-approve" onClick={onAprobarModificacion}>
            ✓ Aprobar
          </button>
          <button type="button" className="btn-danger" onClick={() => setMostrarRechazo(true)}>
            ✕ Rechazar
          </button>
        </div>
      )}

      {mostrarRechazo && (
        <RechazarModal
          titulo={`Rechazar modificación · ${ETIQUETA_REVISOR[revisor]}`}
          onCancelar={() => setMostrarRechazo(false)}
          onConfirmar={async (comentario) => {
            await onRechazar(comentario);
            setMostrarRechazo(false);
          }}
        />
      )}
    </div>
  );
}

/**
 * rol="director" | "departamento" | "decano": vista de revisor único, con
 * botones Aprobar / Modificar sobre su propia revisión (prop revisorActivo).
 * rol="admin": de SOLO LECTURA — muestra el texto original y la revisión de
 * cada revisor aplicable (prop revisoresAplicables), con Aprobar/Rechazar
 * para cada una. La edición del texto se hace aparte, en el recuadro
 * duplicado (ComponenteEditorAdmin) que solo aparece cuando el filtro "Ver
 * componente" está puesto en un componente concreto.
 */
export default function ComponenteBlock({
  etiqueta,
  tipo = "fijo",
  componente,
  rol = "director",
  tituloContexto = "",
  revisorActivo,
  revisoresAplicables = [],
  onAprobar,
  onEnviarSugerencia,
  onAprobarModificacion,
  onRechazar,
}) {
  const [editandoSugerencia, setEditandoSugerencia] = useState(false);
  const [textoSugerencia, setTextoSugerencia] = useState("");
  const [guardando, setGuardando] = useState(false);

  const esAdmin = rol === "admin";
  const revisiones = componente?.revisiones || {};
  const textoActualizado = Boolean(componente?.textoActualizado);

  const miRevision = revisorActivo ? revisiones[revisorActivo] || {} : {};
  const miEstado = miRevision.estado || ESTADO_REVISOR.PENDIENTE;
  const miEstadoAdmin = miRevision.estadoAdmin || ESTADO_ADMIN.PENDIENTE;
  const yoPidiModificar = miEstado === ESTADO_REVISOR.MODIFICAR;
  const miSugerenciaFueRechazada = yoPidiModificar && miEstadoAdmin === ESTADO_ADMIN.RECHAZADO;

  const hayModificacionPendiente = esAdmin
    ? revisoresAplicables.some((r) => (revisiones[r]?.estado || ESTADO_REVISOR.PENDIENTE) === ESTADO_REVISOR.MODIFICAR)
    : false;

  const [nombreComp, descripcionComp] =
    tipo === "competencia" ? partirCompetencia(componente?.valor) : [etiqueta, componente?.valor];
  const titulo = tipo === "competencia" ? nombreComp : etiqueta;
  const cuerpo = tipo === "competencia" ? descripcionComp : componente?.valor;

  const guardarSugerencia = async () => {
    if (!textoSugerencia.trim()) return;
    setGuardando(true);
    await onEnviarSugerencia(revisorActivo, textoSugerencia.trim());
    setGuardando(false);
    setEditandoSugerencia(false);
  };

  const idCampo = `${tituloContexto}-${titulo}`.replace(/\s+/g, "-");

  return (
    <div className={claseTarjeta(esAdmin && hayModificacionPendiente)}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h4 className="font-semibold text-slate-800 dark:text-slate-100">{titulo}</h4>
        {tipo !== "idoneidad" && !esAdmin && (
          <Badge estado={miEstado} estadoAdmin={miEstadoAdmin} textoActualizado={textoActualizado} />
        )}
      </div>

      <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-700 dark:text-slate-300">
        {cuerpo || "—"}
      </p>

      {esAdmin && tipo !== "idoneidad" && (
        <div className="mt-3 space-y-2">
          {revisoresAplicables.map((revisor) => (
            <PanelRevisor
              key={revisor}
              revisor={revisor}
              rev={revisiones[revisor]}
              onAprobarModificacion={() => onAprobarModificacion(revisor)}
              onRechazar={(comentario) => onRechazar(revisor, comentario)}
            />
          ))}
        </div>
      )}

      {!esAdmin && miSugerenciaFueRechazada && miRevision.comentarioAdmin && (
        <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">
          <strong>El {ROL_ADMIN_NOMBRE} no aprobó esta sugerencia:</strong> {miRevision.comentarioAdmin}
        </p>
      )}

      <div className="mt-auto pt-3">
        {esAdmin ? null : tipo === "idoneidad" ? null : !editandoSugerencia ? (
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-approve" onClick={() => onAprobar(revisorActivo)}>
              ✓ Aprobar
            </button>
            <button
              type="button"
              className="btn-modify"
              onClick={() => {
                setTextoSugerencia(miRevision.comentario || "");
                setEditandoSugerencia(true);
              }}
            >
              ✎ Modificar
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <label className="field-label" htmlFor={`sugerencia-${idCampo}`}>
              Sugerencia para el {ROL_ADMIN_NOMBRE}
            </label>
            <textarea
              id={`sugerencia-${idCampo}`}
              value={textoSugerencia}
              onChange={(e) => setTextoSugerencia(e.target.value)}
              rows={4}
              placeholder="Describe qué debería cambiar en este componente…"
              className={CAMPO}
            />
            <div className="flex gap-2">
              <button
                type="button"
                className="btn-primary"
                disabled={!textoSugerencia.trim() || guardando}
                onClick={guardarSugerencia}
              >
                {guardando ? "Guardando…" : "Guardar sugerencia"}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setEditandoSugerencia(false);
                  setTextoSugerencia(miRevision.comentario || "");
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
