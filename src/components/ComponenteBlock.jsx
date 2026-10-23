import { useState } from "react";
import RechazarModal from "./RechazarModal.jsx";
import {
  ESTADO_ADMIN,
  ESTADO_DIRECTOR,
  ROL_ADMIN_NOMBRE,
  partirCompetencia,
} from "../utils/constantes.js";

function BadgeDirector({ estadoDirector, estadoAdmin, textoActualizado }) {
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
  if (textoActualizado) {
    return <span className="badge-modify">Texto actualizado · por aprobar</span>;
  }
  return <span className="badge-pending">Pendiente de revisión</span>;
}

function BadgeAdmin({ estadoDirector, estadoAdmin, textoActualizado }) {
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
    return <span className="badge-modify">Modificación solicitada</span>;
  }
  if (textoActualizado) {
    return <span className="badge-modify">Texto actualizado · espera al director</span>;
  }
  return <span className="badge-pending">Sin revisión del director</span>;
}

const CAMPO =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-institucional-navy focus:ring-2 focus:ring-institucional-navy/30 dark:border-slate-600 dark:focus:border-institucional-gold dark:focus:ring-institucional-gold/30";

function claseTarjeta(resaltar, estadoAdmin) {
  const base = "flex h-full flex-col rounded-xl border p-4 ";
  if (!resaltar) return base + "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800";
  if (estadoAdmin === ESTADO_ADMIN.APROBADO) {
    return base + "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-300 dark:border-emerald-500 dark:bg-emerald-900/15 dark:ring-emerald-700";
  }
  if (estadoAdmin === ESTADO_ADMIN.RECHAZADO) {
    return base + "border-rose-400 bg-rose-50/60 ring-1 ring-rose-300 dark:border-rose-500 dark:bg-rose-900/10 dark:ring-rose-700";
  }
  return base + "border-orange-400 bg-orange-50 ring-2 ring-orange-300 dark:border-orange-500 dark:bg-orange-900/15 dark:ring-orange-700";
}

/**
 * rol="director": botones Aprobar / Modificar.
 * rol="admin": resalta lo que el director pidió modificar, permite aprobar o
 * rechazar (con comentario obligatorio) y editar el texto de cualquier componente.
 */
export default function ComponenteBlock({
  etiqueta,
  tipo = "fijo",
  componente,
  rol = "director",
  tituloContexto = "",
  onAprobar,
  onEnviarSugerencia,
  onAprobarModificacion,
  onRechazar,
  onEditarTexto,
}) {
  const [editandoSugerencia, setEditandoSugerencia] = useState(false);
  const [textoSugerencia, setTextoSugerencia] = useState(componente?.comentarioDirector || "");
  const [editandoValor, setEditandoValor] = useState(false);
  const [textoValor, setTextoValor] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [mostrarRechazo, setMostrarRechazo] = useState(false);

  const esAdmin = rol === "admin";
  const estadoDirector = componente?.estadoDirector || ESTADO_DIRECTOR.PENDIENTE;
  const estadoAdmin = componente?.estadoAdmin || ESTADO_ADMIN.PENDIENTE;
  const textoActualizado = Boolean(componente?.textoActualizado);
  const pidioModificar = estadoDirector === ESTADO_DIRECTOR.MODIFICAR;
  const fueRechazado = pidioModificar && estadoAdmin === ESTADO_ADMIN.RECHAZADO;
  const adminPuedeResolver = esAdmin && pidioModificar && estadoAdmin === ESTADO_ADMIN.PENDIENTE;

  const [nombreComp, descripcionComp] =
    tipo === "competencia" ? partirCompetencia(componente?.valor) : [etiqueta, componente?.valor];
  const titulo = tipo === "competencia" ? nombreComp : etiqueta;
  const cuerpo = tipo === "competencia" ? descripcionComp : componente?.valor;

  const guardarSugerencia = async () => {
    if (!textoSugerencia.trim()) return;
    setGuardando(true);
    await onEnviarSugerencia(textoSugerencia.trim());
    setGuardando(false);
    setEditandoSugerencia(false);
  };

  const guardarValor = async () => {
    setGuardando(true);
    await onEditarTexto(textoValor.trim());
    setGuardando(false);
    setEditandoValor(false);
  };

  const abrirEdicionValor = () => {
    setTextoValor(componente?.valor || "");
    setEditandoValor(true);
  };

  const idCampo = `${tituloContexto}-${titulo}`.replace(/\s+/g, "-");

  return (
    <div className={claseTarjeta(esAdmin && pidioModificar, estadoAdmin)}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h4 className="font-semibold text-slate-800 dark:text-slate-100">{titulo}</h4>
        {tipo === "idoneidad" ? null : esAdmin ? (
          <BadgeAdmin
            estadoDirector={estadoDirector}
            estadoAdmin={estadoAdmin}
            textoActualizado={textoActualizado}
          />
        ) : (
          <BadgeDirector
            estadoDirector={estadoDirector}
            estadoAdmin={estadoAdmin}
            textoActualizado={textoActualizado}
          />
        )}
      </div>

      {editandoValor ? (
        <div className="mt-3 space-y-2">
          <label className="field-label" htmlFor={`valor-${idCampo}`}>
            Texto del componente
          </label>
          <textarea
            id={`valor-${idCampo}`}
            value={textoValor}
            onChange={(e) => setTextoValor(e.target.value)}
            rows={Math.min(24, Math.max(6, Math.ceil(textoValor.length / 45) + textoValor.split("\n").length))}
            className={CAMPO}
          />
          <div className="flex gap-2">
            <button type="button" className="btn-primary" disabled={guardando} onClick={guardarValor}>
              {guardando ? "Guardando…" : "Guardar texto"}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setEditandoValor(false)}>
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          {cuerpo || "—"}
        </p>
      )}

      {esAdmin && pidioModificar && (
        <div className="mt-3 rounded-lg border border-orange-300 bg-orange-100/80 px-3 py-2 text-sm dark:border-orange-700 dark:bg-orange-900/30">
          <p className="field-label">Sugerencia del director de programa</p>
          <p className="mt-1 whitespace-pre-line text-slate-800 dark:text-orange-50">
            {componente?.comentarioDirector}
          </p>
        </div>
      )}

      {fueRechazado && componente?.comentarioAdmin && (
        <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">
          <strong>
            {esAdmin ? "Motivo del rechazo:" : `El ${ROL_ADMIN_NOMBRE} no aprobó esta sugerencia:`}
          </strong>{" "}
          {componente.comentarioAdmin}
        </p>
      )}

      <div className="mt-auto pt-3">
        {esAdmin ? (
          <div className="flex flex-wrap gap-2">
            {adminPuedeResolver && (
              <>
                <button type="button" className="btn-approve" onClick={onAprobarModificacion}>
                  ✓ Aprobar modificación
                </button>
                <button type="button" className="btn-danger" onClick={() => setMostrarRechazo(true)}>
                  ✕ Rechazar
                </button>
              </>
            )}
            {!editandoValor && (
              <button type="button" className="btn-secondary" onClick={abrirEdicionValor}>
                ✎ Editar texto
              </button>
            )}
          </div>
        ) : tipo === "idoneidad" ? null : !editandoSugerencia ? (
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-approve" onClick={onAprobar}>
              ✓ Aprobar
            </button>
            <button type="button" className="btn-modify" onClick={() => setEditandoSugerencia(true)}>
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
                  setTextoSugerencia(componente?.comentarioDirector || "");
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>

      {mostrarRechazo && (
        <RechazarModal
          titulo={`Rechazar modificación · ${titulo}`}
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
