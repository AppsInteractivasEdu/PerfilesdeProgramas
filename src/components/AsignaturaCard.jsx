import { useState } from "react";
import ComponenteBlock from "./ComponenteBlock.jsx";
import { COMPONENTES, ESTADO_DIRECTOR } from "../utils/constantes.js";
import {
  aprobarComponenteDirector,
  enviarSugerenciaDirector,
} from "../services/asignaturas.js";

export default function AsignaturaCard({ asignatura }) {
  const [abierta, setAbierta] = useState(false);

  const componentes = asignatura.componentes || {};
  const pendientes = COMPONENTES.filter(
    (c) => (componentes[c.clave]?.estadoDirector || ESTADO_DIRECTOR.PENDIENTE) === ESTADO_DIRECTOR.PENDIENTE
  ).length;

  return (
    <div className="card overflow-hidden">
      <button
        type="button"
        onClick={() => setAbierta((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
      >
        <span className="font-semibold text-slate-800 dark:text-slate-100">
          {asignatura.nombre}
        </span>
        <span className="flex shrink-0 items-center gap-3">
          {pendientes > 0 && (
            <span className="badge-pending">{pendientes} por revisar</span>
          )}
          <span className="text-slate-400">{abierta ? "▲" : "▼"}</span>
        </span>
      </button>

      {abierta && (
        <div className="space-y-3 border-t border-slate-200 p-5 dark:border-slate-700">
          {COMPONENTES.map(({ clave, etiqueta }) => (
            <ComponenteBlock
              key={clave}
              etiqueta={etiqueta}
              componente={componentes[clave]}
              onAprobar={() => aprobarComponenteDirector(asignatura.id, clave)}
              onEnviarSugerencia={(texto) =>
                enviarSugerenciaDirector(asignatura.id, clave, texto)
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
