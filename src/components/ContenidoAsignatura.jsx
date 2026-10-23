import ComponenteBlock from "./ComponenteBlock.jsx";
import { listarComponentes } from "../utils/constantes.js";
import {
  aprobarComponenteDirector,
  aprobarSolicitudAdmin,
  editarTextoComponente,
  enviarSugerenciaDirector,
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

/** Todos los componentes de una asignatura, acomodados en horizontal según el ancho disponible. */
export default function ContenidoAsignatura({ asignatura, rol = "director" }) {
  const componentes = asignatura.componentes || {};
  const lista = listarComponentes(componentes);
  const fijos = lista.filter((c) => c.tipo === "fijo");
  const competencias = lista.filter((c) => c.tipo === "competencia");
  const idoneidad = lista.filter((c) => c.tipo === "idoneidad");

  const enDirector = rol === "director";
  const clasesFijos = enDirector ? "lg:grid-cols-3" : "xl:grid-cols-3";
  const clasesCompetencias = enDirector
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
      onAprobar={() => aprobarComponenteDirector(asignatura.id, clave)}
      onEnviarSugerencia={(texto) => enviarSugerenciaDirector(asignatura.id, clave, texto)}
      onAprobarModificacion={() => aprobarSolicitudAdmin(asignatura.id, clave)}
      onRechazar={(comentario) => rechazarSolicitudAdmin(asignatura.id, clave, comentario)}
      onEditarTexto={(texto) => editarTextoComponente(asignatura.id, clave, texto)}
    />
  );

  return (
    <div className="space-y-6">
      <Seccion titulo="Formación y experiencia" clases={clasesFijos}>
        {fijos.map(bloque)}
      </Seccion>
      {competencias.length > 0 && (
        <Seccion titulo="Competencias" cantidad={competencias.length} clases={clasesCompetencias}>
          {competencias.map(bloque)}
        </Seccion>
      )}
      {idoneidad.length > 0 && (
        <Seccion titulo="Criterio de idoneidad" clases="">
          {idoneidad.map(bloque)}
        </Seccion>
      )}
    </div>
  );
}
