import { useEffect, useMemo, useState } from "react";
import Navbar from "../components/Navbar.jsx";
import ContenidoAsignatura from "../components/ContenidoAsignatura.jsx";
import {
  suscribirDepartamentos,
  suscribirProgramas,
  suscribirTodasLasAsignaturas,
  suscribirUsuarios,
} from "../services/asignaturas.js";
import {
  ESTADO_ADMIN,
  ESTADO_REVISOR,
  ETIQUETA_REVISOR,
  ROL_ADMIN_NOMBRE,
  listarComponentes,
  revisoresDeAsignatura,
} from "../utils/constantes.js";
import { exportarPdfPerfilPrograma } from "../utils/exportPdf.js";
import { exportarExcelPerfilPrograma } from "../utils/exportExcel.js";
import { formatearUltimaConexion } from "../utils/tiempo.js";

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
  const [departamentos, setDepartamentos] = useState([]);
  const [asignaturas, setAsignaturas] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [programaFiltro, setProgramaFiltro] = useState("");
  const [departamentoFiltro, setDepartamentoFiltro] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [soloPendientes, setSoloPendientes] = useState(false);
  const [seleccionadaId, setSeleccionadaId] = useState(null);

  useEffect(() => {
    const d1 = suscribirProgramas(setProgramas);
    const d2 = suscribirTodasLasAsignaturas((lista) => {
      setAsignaturas(lista);
      setCargando(false);
    });
    const d3 = suscribirUsuarios(setUsuarios);
    const d4 = suscribirDepartamentos(setDepartamentos);
    return () => {
      d1();
      d2();
      d3();
      d4();
    };
  }, []);

  // Última sesión de cada director/departamento, y del decano — solo la ve
  // el Director de Departamento (este panel), en ningún otro.
  const directorPorPrograma = useMemo(() => {
    const mapa = new Map();
    for (const u of usuarios) if (u.rol === "director" && u.programaId) mapa.set(u.programaId, u);
    return mapa;
  }, [usuarios]);
  const departamentoPorId = useMemo(() => {
    const mapa = new Map();
    for (const u of usuarios) if (u.rol === "departamento" && u.departamentoId) mapa.set(u.departamentoId, u);
    return mapa;
  }, [usuarios]);
  const decanoUsuario = useMemo(() => usuarios.find((u) => u.rol === "decano") || null, [usuarios]);

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
        (!departamentoFiltro || x.asignatura.departamentoId === departamentoFiltro) &&
        (!q || x.asignatura.nombre.toLowerCase().includes(q)) &&
        (!soloPendientes || x.pendientes > 0)
    );
  }, [conResumen, programaFiltro, departamentoFiltro, busqueda, soloPendientes]);

  const grupos = useMemo(() => {
    const mapa = new Map();
    for (const x of visibles) {
      const clave = x.asignatura.programaId;
      if (!mapa.has(clave)) {
        mapa.set(clave, { programaId: clave, nombre: x.asignatura.nombrePrograma || clave, items: [] });
      }
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

  // El consolidado se descarga por programa (sería un documento enorme si
  // fuera de todos a la vez): requiere que el filtro de programa tenga uno
  // elegido. Incluye TODAS las asignaturas de ese programa, ordenadas de
  // forma descendente, con el contenido completo de cada componente
  // (incluida la idoneidad), sin importar si tuvieron o no revisión.
  const nombreProgramaSeleccionado = programas.find((p) => p.id === programaFiltro)?.nombre || "";
  const asignaturasDelProgramaSeleccionado = useMemo(() => {
    if (!programaFiltro) return [];
    return ordenadas
      .filter((a) => a.programaId === programaFiltro)
      .sort((a, b) => (b.orden ?? 0) - (a.orden ?? 0));
  }, [ordenadas, programaFiltro]);

  const descargarPdf = () =>
    exportarPdfPerfilPrograma(
      nombreProgramaSeleccionado,
      asignaturasDelProgramaSeleccionado,
      `perfil-completo-${programaFiltro}.pdf`
    );
  const descargarExcel = () =>
    exportarExcelPerfilPrograma(
      nombreProgramaSeleccionado,
      asignaturasDelProgramaSeleccionado,
      `perfil-completo-${programaFiltro}.xlsx`
    );

  const resumenSeleccionada = seleccionada ? resumenSolicitudes(seleccionada) : null;

  // Al seleccionar una asignatura (p. ej. desde el listado de "solo con
  // modificaciones por resolver", viendo todos los programas a la vez), los
  // filtros de programa y departamento se ajustan solos a los de esa
  // asignatura, para que los botones de descarga del consolidado queden
  // habilitados de una vez y la lista quede ubicada donde corresponde.
  const seleccionarAsignatura = (asignatura) => {
    setSeleccionadaId(asignatura.id);
    setProgramaFiltro(asignatura.programaId);
    setDepartamentoFiltro(asignatura.departamentoId || "");
  };

  return (
    <div className="min-h-screen bg-slate-300 dark:bg-slate-950">
      <Navbar
        titulo={`Panel del ${ROL_ADMIN_NOMBRE}`}
        subtitulo="Revisión de perfiles docentes de todos los programas"
      />

      <main className="mx-auto w-full max-w-[2400px] space-y-4 px-4 py-6 sm:px-6 lg:px-8">
        <div className="card flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-slate-800 dark:text-slate-100">Consolidado por programa</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {programaFiltro
                ? `${nombreProgramaSeleccionado} · ${asignaturasDelProgramaSeleccionado.length} asignaturas listas para descargar.`
                : "Elige un programa en el filtro de la izquierda para descargar su consolidado completo."}
              {" · "}
              {pendientesTotal} solicitudes pendientes de resolver en total.
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              className="btn-secondary"
              disabled={!programaFiltro}
              onClick={descargarExcel}
            >
              ⬇ Excel
            </button>
            <button
              type="button"
              className="btn-primary"
              disabled={!programaFiltro}
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
                    <div className="sticky top-0 z-[1] border-b border-slate-200 bg-slate-50 px-3 py-1.5 dark:border-slate-700 dark:bg-slate-800">
                      <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                        {g.nombre} · {g.items.length}
                      </p>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500">
                        Última sesión del director:{" "}
                        {formatearUltimaConexion(directorPorPrograma.get(g.programaId)?.ultimaConexion)}
                      </p>
                    </div>
                    <ul>
                      {g.items.map(({ asignatura, total, pendientes }) => {
                        const activa = asignatura.id === seleccionadaId;
                        return (
                          <li key={asignatura.id}>
                            <button
                              type="button"
                              onClick={() => seleccionarAsignatura(asignatura)}
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
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {seleccionada.nombrePrograma}
                      {seleccionada.nombreDepartamento && ` · ${seleccionada.nombreDepartamento}`}
                    </span>
                    {" · "}
                    {resumenSeleccionada.total === 0
                      ? "Sin modificaciones solicitadas"
                      : `${resumenSeleccionada.pendientes} de ${resumenSeleccionada.total} modificaciones por resolver`}
                  </p>
                  <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                    Última sesión — Director:{" "}
                    {formatearUltimaConexion(directorPorPrograma.get(seleccionada.programaId)?.ultimaConexion)}
                    {seleccionada.departamentoId && (
                      <>
                        {" · "}
                        {seleccionada.nombreDepartamento || "Departamento"}:{" "}
                        {formatearUltimaConexion(departamentoPorId.get(seleccionada.departamentoId)?.ultimaConexion)}
                      </>
                    )}
                    {" · "}
                    Decano: {formatearUltimaConexion(decanoUsuario?.ultimaConexion)}
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
