import { Fragment, useMemo, useState } from "react";
import ComponenteBlock from "./ComponenteBlock.jsx";
import ComponenteEditorAdmin from "./ComponenteEditorAdmin.jsx";
import { listarComponentes, revisoresDeAsignatura } from "../utils/constantes.js";
import {
  aprobarComponente,
  aprobarSolicitudAdmin,
  editarTextoComponente,
  enviarSugerencia,
  rechazarSolicitudAdmin,
} from "../services/asignaturas.js";

function Seccion({ titulo, cantidad, clases, children }) {
  return (
    <section>
      <h3 className="mb-3 text-sm font-semibold text-slate-600 dark:text-slate-300">
        {titulo}
        {cantidad > 0 && (
          <span className="ml-2 font-normal text-slate-400 dark:text-slate-500">({cantidad})</span>
        )}
      </h3>
      <div className={`grid items-stretch gap-4 ${clases}`}>{children}</div>
    </section>
  );
}

const CAMPO_FILTRO =
  "w-full max-w-sm rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-institucional-navy focus:ring-2 focus:ring-institucional-navy/30 dark:border-slate-600 dark:bg-slate-800 dark:focus:border-institucional-gold dark:focus:ring-institucional-gold/30";

/**
 * Todos los componentes de una asignatura, acomodados en horizontal según el ancho disponible.
 *
 * rol="director" | "departamento" | "decano": cada uno revisa su propia
 * columna de aprobaciones/sugerencias (prop "rol" hace también de revisor).
 * rol="admin": el Director de Departamento ve, por componente, la revisión
 * de cada revisor aplicable (director de programa, departamento si existe, y
 * decano), con un filtro para ubicarse rápido en un componente concreto.
 */
export default function ContenidoAsignatura({ asignatura, rol = "director" }) {
  const componentes = asignatura.componentes || {};
  const listaCompleta = listarComponentes(componentes);
  const esAdmin = rol === "admin";
  const revisorActivo = esAdmin ? null : rol;
  const revisoresAplicables = useMemo(() => revisoresDeAsignatura(asignatura), [asignatura]);

  const [filtroClave, setFiltroClave] = useState("todos");
  const filtrandoUnComponente = esAdmin && filtroClave !== "todos";
  const lista = filtrandoUnComponente ? listaCompleta.filter((c) => c.clave === filtroClave) : listaCompleta;

  const fijos = lista.filter((c) => c.tipo === "fijo");
  const competencias = lista.filter((c) => c.tipo === "competencia");
  const idoneidad = lista.filter((c) => c.tipo === "idoneidad");

  const enDirector = !esAdmin;
  const clasesFijos = filtrandoUnComponente
    ? "sm:grid-cols-2"
    : enDirector
      ? "lg:grid-cols-3"
      : "xl:grid-cols-3";
  const clasesCompetencias = filtrandoUnComponente
    ? "sm:grid-cols-2"
    : enDirector
      ? "md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
      : "md:grid-cols-2 2xl:grid-cols-3";

  const bloque = ({ clave, etiqueta, tipo }) => (
    <ComponenteBlock
      key={clave}
      rol={rol}
      tipo={tipo}
      etiqueta={etiqueta}
      tituloContexto={asignatura.id}
      componente={componentes[clave]}
      revisorActivo={revisorActivo}
      revisoresAplicables={revisoresAplicables}
      onAprobar={(revisor) => aprobarComponente(asignatura.id, clave, revisor)}
      onEnviarSugerencia={(revisor, texto) => enviarSugerencia(asignatura.id, clave, revisor, texto)}
      onAprobarModificacion={(revisor) => aprobarSolicitudAdmin(asignatura.id, clave, revisor)}
      onRechazar={(revisor, comentario) => rechazarSolicitudAdmin(asignatura.id, clave, revisor, comentario)}
    />
  );

  // Solo cuando el filtro está puesto en UN componente concreto se agrega,
  // al lado, el recuadro duplicado editable (único lugar donde se edita el
  // texto, según lo pedido: no se edita directamente sobre el recuadro que
  // muestra las revisiones de los demás).
  const bloqueConEditor = ({ clave, etiqueta, tipo }) => (
    <Fragment key={clave}>
      {bloque({ clave, etiqueta, tipo })}
      <ComponenteEditorAdmin
        tipo={tipo}
        etiqueta={etiqueta}
        tituloContexto={asignatura.id}
        componente={componentes[clave]}
        onEditarTexto={(texto) => editarTextoComponente(asignatura.id, clave, texto)}
      />
    </Fragment>
  );

  const renderBloque = filtrandoUnComponente ? bloqueConEditor : bloque;

  return (
    <div className="space-y-6">
      {esAdmin && (
        <div className="flex flex-wrap items-center gap-2">
          <label className="field-label shrink-0" htmlFor={`filtro-componente-${asignatura.id}`}>
            Ver componente
          </label>
          <select
            id={`filtro-componente-${asignatura.id}`}
            value={filtroClave}
            onChange={(e) => setFiltroClave(e.target.value)}
            className={CAMPO_FILTRO}
          >
            <option value="todos">Todos los componentes</option>
            {listaCompleta.map((c) => (
              <option key={c.clave} value={c.clave}>
                {c.etiqueta}
              </option>
            ))}
          </select>
        </div>
      )}

      {fijos.length > 0 && (
        <Seccion titulo="Formación y experiencia" clases={clasesFijos}>
          {fijos.map(renderBloque)}
        </Seccion>
      )}
      {competencias.length > 0 && (
        <Seccion titulo="Competencias" cantidad={competencias.length} clases={clasesCompetencias}>
          {competencias.map(renderBloque)}
        </Seccion>
      )}
      {idoneidad.length > 0 && (
        <Seccion titulo="Criterio de idoneidad" clases={filtrandoUnComponente ? "sm:grid-cols-2" : ""}>
          {idoneidad.map(renderBloque)}
        </Seccion>
      )}
    </div>
  );
}
