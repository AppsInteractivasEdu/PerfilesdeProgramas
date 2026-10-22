import { useState } from "react";
import ContenidoAsignatura from "./ContenidoAsignatura.jsx";
import { ESTADO_DIRECTOR, listarComponentes } from "../utils/constantes.js";

export default function AsignaturaCard({ asignatura }) {
  const [abierta, setAbierta] = useState(false);

  const componentes = asignatura.componentes || {};
  const pendientes = listarComponentes(componentes).filter(
    (c) => (componentes[c.clave]?.estadoDirector || ESTADO_DIRECTOR.PENDIENTE) === ESTADO_DIRECTOR.PENDIENTE
  ).length;

  return (
    <div className="card overflow-hidden">
      <button
        type="button"
        onClick={() => setAbierta((v) => !v)}
        aria-expanded={abierta}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
      >
        <span className="font-semibold text-slate-800 dark:text-slate-100">
          Asignatura: {asignatura.nombre}
        </span>
        <span className="flex shrink-0 items-center gap-3">
          {pendientes > 0 && <span className="badge-pending">{pendientes} por revisar</span>}
          <span className="text-slate-400">{abierta ? "▲" : "▼"}</span>
        </span>
      </button>

      {abierta && (
        <div className="border-t border-slate-200 p-5 dark:border-slate-700">
          <ContenidoAsignatura asignatura={asignatura} rol="director" />
          <div className="mt-6 flex justify-center border-t border-slate-200 pt-4 dark:border-slate-700">
            <button type="button" className="btn-secondary" onClick={() => setAbierta(false)}>
              ▲ Recoger
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
