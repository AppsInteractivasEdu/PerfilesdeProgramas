import { useEffect, useMemo, useState } from "react";
import Navbar from "../components/Navbar.jsx";
import ContenidoAsignatura from "../components/ContenidoAsignatura.jsx";
import {
  suscribirProgramas,
  suscribirTodasLasAsignaturas,
} from "../services/asignaturas.js";
import {
  ESTADO_ADMIN,
  ESTADO_REVISOR,
  ETIQUETA_REVISOR,
  ROL_ADMIN_NOMBRE,
  listarComponentes,
  revisoresDeAsignatura,
} from "../utils/constantes.js";
import { exportarPdfAdmin } from "../utils/exportPdf.js";
import { exportarExcelAdmin } from "../utils/exportExcel.js";

const CAMPO =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-institucional-navy focus:ring-2 focus:ring-institucional-navy/30 dark:border-slate-600 dark:bg-slate-800 dark:focus:border-institucional-gold dark:focus:ring-institucional-gold/30";

/** Solicitudes de modificación de una asignatura (de cualquier revisor): total y pendientes de resolver. */
function resumenSolicitudes(asignatura) {
  let total = 0;
  let pendientes = 0;
  const revisores = revisoresDeAsignatura(asignatura);
  for (const { clave } of listarComponentes(asignatura.componentes)) {
    const revisiones = asignatura.componentes?.[clave]?.revisiones || {};
    for (const revisor of revisores) {
      const rev = revisiones[revisor];
      if (rev?.estado === ESTADO_REVISOR.MODIFICAR) {
        total++;
        if ((rev.estadoAdmin || ESTADO_ADMIN.PENDIENTE) === ESTADO_ADMIN.PENDIENTE) pendientes++;
      }
    }
  }
  return { total, pendientes };
}

export default function AdminDashboard() {
  const [programas, setProgramas] = useState([]);
  const [asignaturas, setAsignaturas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [programaFiltro, setProgramaFiltro] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [soloPendientes, setSoloPendientes] = useState(false);
  const [seleccionadaId, setSeleccionadaId] = useState(null);

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

  const ordenadas = useMemo(
    () =>
      [...asignaturas].sort(
        (a, b) =>
          (a.nombrePrograma || "").localeCompare(b.nombrePrograma || "", "es") ||
          (a.orden ?? 0) - (b.orden ?? 0)
      ),
    [asignaturas]
  );

  const conResumen = useMemo(
    () => ordenadas.map((a) => ({ asignatura: a, ...resumenSolicitudes(a) })),
    [ordenadas]
  );

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return conResumen.filter(
      (x) =>
        (!programaFiltro || x.asignatura.programaId === programaFiltro) &&
        (!q || x.asignatura.nombre.toLowerCase().includes(q)) &&
        (!soloPendientes || x.pendientes > 0)
    );
  }, [conResumen, programaFiltro, busqueda, soloPendientes]);

  const grupos = useMemo(() => {
    const mapa = new Map();
    for (const x of visibles) {
      const clave = x.asignatura.programaId;
      if (!mapa.has(clave)) mapa.set(clave, { nombre: x.asignatura.nombrePrograma || clave, items: [] });
      mapa.get(clave).items.push(x);
    }
    return [...mapa.values()];
  }, [visibles]);

  const seleccionada = asignaturas.find((a) => a.id === seleccionadaId) || null;

  /** Todas las solicitudes de modificación, de cualquier revisor, con su estado, para los reportes. */
  const todasLasSolicitudes = useMemo(() => {
    const filas = [];
    for (const a of ordenadas) {
      const revisores = revisoresDeAsignatura(a);
      for (const { clave, etiqueta } of listarComponentes(a.componentes)) {
        const revisiones = a.componentes?.[clave]?.revisiones || {};
        for (const revisor of revisores) {
          const rev = revisiones[revisor];
          if (!rev) continue;
          const base = {
            asignaturaId: a.id,
            programaId: a.programaId,
            programa: a.nombrePrograma || a.programaId,
            asignatura: a.nombre,
            clave,
            etiqueta,
            componente: etiqueta,
            revisor,
            origen: ETIQUETA_REVISOR[revisor],
          };
          for (const h of rev.historial || []) {
            filas.push({
              ...base,
              comentarioDirector: h.sugerencia || "",
              estadoAdmin: h.estadoAdmin,
              comentarioAdmin: h.comentarioAdmin || "",
            });
          }
          if (rev.estado === ESTADO_REVISOR.MODIFICAR) {
            filas.push({
              ...base,
              comentarioDirector: rev.comentario || "",
              estadoAdmin: rev.estadoAdmin || ESTADO_ADMIN.PENDIENTE,
              comentarioAdmin: rev.comentarioAdmin || "",
            });
          }
        }
      }
    }
    return filas;
  }, [ordenadas]);

  const pendientesTotal = todasLasSolicitudes.filter(
    (s) => s.estadoAdmin === ESTADO_ADMIN.PENDIENTE
  ).length;

  const descargarPdf = () =>
    exportarPdfAdmin(todasLasSolicitudes, "consolidado-perfiles-docentes.pdf");
  const descargarExcel = () =>
    exportarExcelAdmin(todasLasSolicitudes, "consolidado-perfiles-docentes.xlsx");

  const resumenSeleccionada = seleccionada ? resumenSolicitudes(seleccionada) : null;

  return (
    <div className="min-h-screen bg-slate-300 dark:bg-slate-950">
      <Navbar
        titulo={`Panel del ${ROL_ADMIN_NOMBRE}`}
        subtitulo="Revisión de perfiles docentes de todos los programas"
      />

      <main className="mx-auto w-full max-w-[2400px] space-y-4 px-4 py-6 sm:px-6 lg:px-8">
        <div className="card flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-slate-800 dark:text-slate-100">Consolidado general</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {todasLasSolicitudes.length} solicitudes de modificación en los {programas.length} programas
              {" · "}
              {pendientesTotal} pendientes de resolver.
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              className="btn-secondary"
              disabled={todasLasSolicitudes.length === 0}
              onClick={descargarExcel}
            >
              ⬇ Excel
            </button>
            <button
              type="button"
              className="btn-primary"
              disabled={todasLasSolicitudes.length === 0}
              onClick={descargarPdf}
            >
              ⬇ PDF
            </button>
          </div>
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
                <option value="">Todos los programas</option>
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
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={soloPendientes}
                  onChange={(e) => setSoloPendientes(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300"
                />
                Solo con modificaciones por resolver
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
                  <div key={g.nombre}>
                    <p className="sticky top-0 z-[1] border-b border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                      {g.nombre} · {g.items.length}
                    </p>
                    <ul>
                      {g.items.map(({ asignatura, total, pendientes }) => {
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
                              {pendientes > 0 ? (
                                <span className="badge-modify shrink-0">{pendientes}</span>
                              ) : total > 0 ? (
                                <span className="badge-approved shrink-0">✓</span>
                              ) : null}
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
                Selecciona una asignatura de la lista para ver su perfil completo, las
                modificaciones solicitadas por el director y editar su contenido.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="card p-5">
                  <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                    Asignatura: {seleccionada.nombre}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {seleccionada.nombrePrograma}
                    {" · "}
                    {resumenSeleccionada.total === 0
                      ? "Sin modificaciones solicitadas"
                      : `${resumenSeleccionada.pendientes} de ${resumenSeleccionada.total} modificaciones por resolver`}
                  </p>
                </div>
                <ContenidoAsignatura key={seleccionada.id} asignatura={seleccionada} rol="admin" />
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
