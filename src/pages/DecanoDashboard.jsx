import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import Navbar from "../components/Navbar.jsx";
import ContenidoAsignatura from "../components/ContenidoAsignatura.jsx";
import {
  suscribirDepartamentos,
  suscribirProgramas,
  suscribirTodasLasAsignaturas,
} from "../services/asignaturas.js";
import { ESTADO_REVISOR, listarComponentes } from "../utils/constantes.js";
import { exportarPdfDirector } from "../utils/exportPdf.js";

const CAMPO =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-institucional-navy focus:ring-2 focus:ring-institucional-navy/30 dark:border-slate-600 dark:bg-slate-800 dark:focus:border-institucional-gold dark:focus:ring-institucional-gold/30";

/** Componentes pendientes de la revisión del decano en una asignatura. */
function pendientesDelDecano(asignatura) {
  return listarComponentes(asignatura.componentes, { incluirIdoneidad: false }).filter((c) => {
    const rev = asignatura.componentes?.[c.clave]?.revisiones?.decano;
    return (rev?.estado || ESTADO_REVISOR.PENDIENTE) === ESTADO_REVISOR.PENDIENTE;
  }).length;
}

/**
 * Panel del Decano de la Facultad de Educación: ve todos los programas (y,
 * si aplica, el departamento) de cada asignatura, con filtros para
 * ubicarse rápido en vez de una lista interminable. Ve en solo lectura lo
 * que opinaron el director de programa y el departamento, y conserva su
 * propia revisión independiente (Aprobar/Modificar), que llega igual al
 * Director de Departamento para su aprobación.
 */
export default function DecanoDashboard() {
  const { perfil } = useAuth();
  const [programas, setProgramas] = useState([]);
  const [departamentos, setDepartamentos] = useState([]);
  const [asignaturas, setAsignaturas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [programaFiltro, setProgramaFiltro] = useState("");
  const [departamentoFiltro, setDepartamentoFiltro] = useState("");
  const [soloPendientes, setSoloPendientes] = useState(false);
  const [seleccionadaId, setSeleccionadaId] = useState(null);

  useEffect(() => {
    const d1 = suscribirProgramas(setProgramas);
    const d2 = suscribirDepartamentos(setDepartamentos);
    const d3 = suscribirTodasLasAsignaturas((lista) => {
      setAsignaturas(lista);
      setCargando(false);
    });
    return () => {
      d1();
      d2();
      d3();
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

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return asignaturas
      .map((a) => ({ asignatura: a, pendientes: pendientesDelDecano(a) }))
      .filter(
        ({ asignatura: a, pendientes }) =>
          (!programaFiltro || a.programaId === programaFiltro) &&
          (!departamentoFiltro || a.departamentoId === departamentoFiltro) &&
          (!q || a.nombre.toLowerCase().includes(q)) &&
          (!soloPendientes || pendientes > 0)
      );
  }, [asignaturas, busqueda, programaFiltro, departamentoFiltro, soloPendientes]);

  const grupos = useMemo(() => {
    const mapa = new Map();
    for (const x of visibles) {
      const clave = x.asignatura.programaId;
      if (!mapa.has(clave)) {
        mapa.set(clave, { programaId: clave, nombre: x.asignatura.nombrePrograma || clave, items: [] });
      }
      mapa.get(clave).items.push(x);
    }
    return [...mapa.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  }, [visibles]);

  const seleccionada = asignaturas.find((a) => a.id === seleccionadaId) || null;

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

      <main className="mx-auto w-full max-w-[2400px] space-y-4 px-4 py-6 sm:px-6 lg:px-8">
        <div className="card flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-slate-800 dark:text-slate-100">
              Revisión de perfiles docentes · todos los programas
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Usa los filtros para ubicarte en un programa o departamento. Ves en solo lectura lo
              que opinaron el director y el departamento; tu propia revisión queda a la espera de
              la aprobación del Director de Departamento.
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

        <div className="grid gap-4 lg:grid-cols-[22rem_minmax(0,1fr)] xl:grid-cols-[26rem_minmax(0,1fr)]">
          <aside className="card flex max-h-[60vh] flex-col overflow-hidden lg:sticky lg:top-20 lg:max-h-[calc(100vh-7rem)]">
            <div className="space-y-2 border-b border-slate-200 p-3 dark:border-slate-700">
              <select
                aria-label="Filtrar por programa"
                value={programaFiltro}
                onChange={(e) => setProgramaFiltro(e.target.value)}
                className={CAMPO}
              >
                <option value="">Todos los programas ({programas.length})</option>
                {programas.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
              <select
                aria-label="Filtrar por departamento"
                value={departamentoFiltro}
                onChange={(e) => setDepartamentoFiltro(e.target.value)}
                className={CAMPO}
              >
                <option value="">Todos los departamentos</option>
                {departamentos.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nombre}
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
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={soloPendientes}
                  onChange={(e) => setSoloPendientes(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300"
                />
                Solo con componentes por revisar
              </label>
            </div>

            <div className="flex-1 overflow-y-auto">
              {cargando ? (
                <p className="p-4 text-center text-sm text-slate-500 dark:text-slate-400">
                  Cargando asignaturas…
                </p>
              ) : grupos.length === 0 ? (
                <p className="p-4 text-center text-sm text-slate-500 dark:text-slate-400">
                  No hay asignaturas con ese filtro.
                </p>
              ) : (
                grupos.map((g) => (
                  <div key={g.programaId}>
                    <p className="sticky top-0 z-[1] border-b border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
                      {g.nombre} · {g.items.length}
                    </p>
                    <ul>
                      {g.items.map(({ asignatura, pendientes }) => {
                        const activa = asignatura.id === seleccionadaId;
                        return (
                          <li key={asignatura.id}>
                            <button
                              type="button"
                              onClick={() => setSeleccionadaId(asignatura.id)}
                              aria-current={activa}
                              className={
                                "flex w-full items-center justify-between gap-2 border-b border-slate-100 px-3 py-2.5 text-left text-sm transition-colors dark:border-slate-700/60 " +
                                (activa
                                  ? "bg-institucional-navy/10 font-semibold text-institucional-navy dark:bg-institucional-gold/15 dark:text-institucional-gold"
                                  : "text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700/40")
                              }
                            >
                              <span>{asignatura.nombre}</span>
                              {pendientes > 0 && <span className="badge-pending shrink-0">{pendientes}</span>}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))
              )}
            </div>
          </aside>

          <section className="min-w-0">
            {!seleccionada ? (
              <div className="card p-10 text-center text-slate-500 dark:text-slate-400">
                Selecciona una asignatura de la lista para ver su perfil completo y revisarla.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="card p-5">
                  <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                    Asignatura: {seleccionada.nombre}
                  </h2>
                  <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {seleccionada.nombrePrograma}
                    {seleccionada.nombreDepartamento && ` · ${seleccionada.nombreDepartamento}`}
                  </p>
                </div>
                <ContenidoAsignatura key={seleccionada.id} asignatura={seleccionada} rol="decano" />
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
