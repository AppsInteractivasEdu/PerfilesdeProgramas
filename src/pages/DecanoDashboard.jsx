import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import Navbar from "../components/Navbar.jsx";
import AsignaturaCard from "../components/AsignaturaCard.jsx";
import { suscribirProgramas, suscribirTodasLasAsignaturas } from "../services/asignaturas.js";
import { ESTADO_REVISOR, listarComponentes } from "../utils/constantes.js";
import { exportarPdfDirector } from "../utils/exportPdf.js";

const CAMPO =
  "w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-institucional-navy focus:ring-2 focus:ring-institucional-navy/30 dark:border-slate-600 dark:bg-slate-800 dark:focus:border-institucional-gold dark:focus:ring-institucional-gold/30";

/**
 * Panel del Decano de la Facultad de Educación: ve todo lo que ven los
 * directores de programa (los 10 programas), con filtros para ubicarse
 * rápido, y hace sus propias aprobaciones/sugerencias (independientes de las
 * del director y, si aplica, del departamento), que también llegan al
 * Director de Departamento para su aprobación.
 */
export default function DecanoDashboard() {
  const { perfil } = useAuth();
  const [programas, setProgramas] = useState([]);
  const [asignaturas, setAsignaturas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [programaFiltro, setProgramaFiltro] = useState("");
  const [soloPendientes, setSoloPendientes] = useState(false);

  useEffect(() => {
    const d1 = suscribirProgramas(setProgramas);
    const d2 = suscribirTodasLasAsignaturas((lista) => {
      setAsignaturas(lista);
      setCargando(false);
    });
    return () => {
      d1();
      d2();
    };
  }, []);

  const filasModificar = useMemo(() => {
    const filas = [];
    for (const a of asignaturas) {
      for (const { clave, etiqueta } of listarComponentes(a.componentes)) {
        const rev = a.componentes?.[clave]?.revisiones?.decano;
        if (rev?.estado === ESTADO_REVISOR.MODIFICAR) {
          filas.push({
            asignatura: `${a.nombre} (${a.nombrePrograma || a.programaId})`,
            componente: etiqueta,
            comentario: rev.comentario || "",
          });
        }
      }
    }
    return filas;
  }, [asignaturas]);

  const conPendientes = useMemo(() => {
    return asignaturas.map((a) => {
      const pendientes = listarComponentes(a.componentes, { incluirIdoneidad: false }).filter((c) => {
        const rev = a.componentes?.[c.clave]?.revisiones?.decano;
        return (rev?.estado || ESTADO_REVISOR.PENDIENTE) === ESTADO_REVISOR.PENDIENTE;
      }).length;
      return { asignatura: a, pendientes };
    });
  }, [asignaturas]);

  const asignaturasFiltradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return conPendientes
      .filter(
        ({ asignatura: a, pendientes }) =>
          (!programaFiltro || a.programaId === programaFiltro) &&
          (!q || a.nombre.toLowerCase().includes(q)) &&
          (!soloPendientes || pendientes > 0)
      )
      .map(({ asignatura }) => asignatura)
      .sort(
        (a, b) =>
          (a.nombrePrograma || "").localeCompare(b.nombrePrograma || "", "es") ||
          (a.orden ?? 0) - (b.orden ?? 0)
      );
  }, [conPendientes, busqueda, programaFiltro, soloPendientes]);

  const descargarPdf = () => {
    exportarPdfDirector(
      "Decanatura · todos los programas",
      filasModificar,
      "sugerencias-decanatura.pdf"
    );
  };

  return (
    <div className="min-h-screen bg-slate-300 dark:bg-slate-950">
      <Navbar titulo={perfil?.nombre} subtitulo="Panel del Decano de la Facultad de Educación" />

      <main className="mx-auto w-full max-w-[2400px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="card flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-slate-800 dark:text-slate-100">
              Revisión de perfiles docentes · todos los programas
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Usa los filtros para ubicarte en un programa. Aprueba cada componente o sugiere una
              modificación; tu revisión queda a la espera de la aprobación del Director de
              Departamento.
            </p>
          </div>
          <button
            type="button"
            className="btn-primary shrink-0"
            disabled={filasModificar.length === 0}
            onClick={descargarPdf}
          >
            ⬇ Descargar reporte (PDF){" "}
            {filasModificar.length > 0 && `(${filasModificar.length})`}
          </button>
        </div>

        <div className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <select
            aria-label="Filtrar por programa"
            value={programaFiltro}
            onChange={(e) => setProgramaFiltro(e.target.value)}
            className={`sm:max-w-xs ${CAMPO}`}
          >
            <option value="">Todos los programas ({programas.length})</option>
            {programas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar asignatura…"
            className={CAMPO}
          />
          <label className="flex shrink-0 cursor-pointer items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              checked={soloPendientes}
              onChange={(e) => setSoloPendientes(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300"
            />
            Solo con componentes por revisar
          </label>
        </div>

        {cargando ? (
          <p className="text-center text-slate-500 dark:text-slate-400">Cargando asignaturas…</p>
        ) : asignaturasFiltradas.length === 0 ? (
          <p className="text-center text-slate-500 dark:text-slate-400">
            No se encontraron asignaturas con ese filtro.
          </p>
        ) : (
          <div className="space-y-3">
            {asignaturasFiltradas.map((a) => (
              <AsignaturaCard key={a.id} asignatura={a} revisor="decano" />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
