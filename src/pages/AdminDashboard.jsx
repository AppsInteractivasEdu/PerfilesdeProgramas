import { useEffect, useMemo, useState } from "react";
import Navbar from "../components/Navbar.jsx";
import SolicitudRow from "../components/SolicitudRow.jsx";
import {
  suscribirProgramas,
  suscribirTodasLasAsignaturas,
} from "../services/asignaturas.js";
import { COMPONENTES, ESTADO_ADMIN, ESTADO_DIRECTOR } from "../utils/constantes.js";
import { exportarPdfAdmin } from "../utils/exportPdf.js";
import { exportarExcelAdmin } from "../utils/exportExcel.js";

export default function AdminDashboard() {
  const [programas, setProgramas] = useState([]);
  const [asignaturas, setAsignaturas] = useState([]);
  const [programaSeleccionado, setProgramaSeleccionado] = useState("");
  const [cargando, setCargando] = useState(true);

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

  useEffect(() => {
    if (!programaSeleccionado && programas.length > 0) {
      setProgramaSeleccionado(programas[0].id);
    }
  }, [programas, programaSeleccionado]);

  /** Toda solicitud de modificación de todos los programas, con su estado. */
  const todasLasSolicitudes = useMemo(() => {
    const filas = [];
    for (const a of asignaturas) {
      for (const { clave, etiqueta } of COMPONENTES) {
        const comp = a.componentes?.[clave];
        if (comp?.estadoDirector === ESTADO_DIRECTOR.MODIFICAR) {
          filas.push({
            asignaturaId: a.id,
            programaId: a.programaId,
            programa: a.nombrePrograma || a.programaId,
            asignatura: a.nombre,
            clave,
            etiqueta,
            componente: etiqueta,
            comentarioDirector: comp.comentarioDirector || "",
            estadoAdmin: comp.estadoAdmin || ESTADO_ADMIN.PENDIENTE,
            comentarioAdmin: comp.comentarioAdmin || "",
          });
        }
      }
    }
    return filas;
  }, [asignaturas]);

  const solicitudesDelPrograma = useMemo(
    () => todasLasSolicitudes.filter((s) => s.programaId === programaSeleccionado),
    [todasLasSolicitudes, programaSeleccionado]
  );

  const pendientesDelPrograma = solicitudesDelPrograma.filter(
    (s) => s.estadoAdmin === ESTADO_ADMIN.PENDIENTE
  ).length;

  const descargarPdf = () =>
    exportarPdfAdmin(todasLasSolicitudes, "consolidado-perfiles-docentes.pdf");
  const descargarExcel = () =>
    exportarExcelAdmin(todasLasSolicitudes, "consolidado-perfiles-docentes.xlsx");

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900">
      <Navbar titulo="Panel de administrador" subtitulo="Revisión de solicitudes de todos los programas" />

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6">
        <div className="card flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-slate-800 dark:text-slate-100">
              Consolidado general
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {todasLasSolicitudes.length} solicitudes de modificación en total,
              de los {programas.length} programas.
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

        <div className="flex flex-wrap gap-2">
          {programas.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setProgramaSeleccionado(p.id)}
              className={
                p.id === programaSeleccionado
                  ? "rounded-full bg-institucional-navy px-4 py-1.5 text-sm font-medium text-white dark:bg-institucional-gold dark:text-institucional-navyDark"
                  : "rounded-full bg-white px-4 py-1.5 text-sm font-medium text-slate-600 ring-1 ring-slate-300 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-600 dark:hover:bg-slate-700"
              }
            >
              {p.nombre}
            </button>
          ))}
        </div>

        {cargando ? (
          <p className="text-center text-slate-500 dark:text-slate-400">Cargando solicitudes…</p>
        ) : solicitudesDelPrograma.length === 0 ? (
          <p className="card p-6 text-center text-slate-500 dark:text-slate-400">
            Este programa no tiene solicitudes de modificación por ahora.
          </p>
        ) : (
          <>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {pendientesDelPrograma} pendientes de revisión en este programa.
            </p>
            <div className="space-y-3">
              {solicitudesDelPrograma.map((s) => (
                <SolicitudRow
                  key={`${s.asignaturaId}-${s.clave}`}
                  asignaturaId={s.asignaturaId}
                  asignaturaNombre={s.asignatura}
                  clave={s.clave}
                  etiqueta={s.etiqueta}
                  componente={asignaturas
                    .find((a) => a.id === s.asignaturaId)
                    ?.componentes?.[s.clave]}
                />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
