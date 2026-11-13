import { useEffect, useMemo, useState } from "react";
import { suscribirOfertaTodas } from "../services/oferta.js";
import { formatearUltimaConexion } from "../utils/tiempo.js";
import { exportarExcelOfertaPrograma, exportarExcelOfertaCompleta } from "../utils/exportExcel.js";
import { exportarPdfOfertaPrograma, exportarPdfOfertaCompleta } from "../utils/exportPdf.js";

const aMs = (t) => (t?.toMillis ? t.toMillis() : typeof t === "number" ? t : t ? Date.parse(t) || 0 : 0);

/**
 * Para el Director de Departamento: cuánto ha avanzado cada director de programa en definir la
 * oferta de grupos 2027-I. Solo lectura. directorPorPrograma (opcional): Map(programaId -> usuario)
 * para mostrar la última sesión de cada director.
 */
export default function AvanceOferta({ directorPorPrograma = new Map() }) {
  const [filas, setFilas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [abierto, setAbierto] = useState(null);

  const descargarTodoPdf = async () => {
    const programasData = [...new Map(filas.map((f) => [f.programaId, f.nombrePrograma])).entries()]
      .sort((a, b) => a[1].localeCompare(b[1], "es"))
      .map(([id, nombre]) => ({ nombre, filas: filas.filter((f) => f.programaId === id) }));
    exportarPdfOfertaCompleta(programasData, "Oferta_2027-I_todos_los_programas.pdf");
  };
  const descargarTodoExcel = async () => {
    const programasData = [...new Map(filas.map((f) => [f.programaId, f.nombrePrograma])).entries()]
      .sort((a, b) => a[1].localeCompare(b[1], "es"))
      .map(([id, nombre]) => ({ nombre, filas: filas.filter((f) => f.programaId === id) }));
    await exportarExcelOfertaCompleta(programasData, "Oferta_2027-I_todos_los_programas.xlsx");
  };

  useEffect(
    () =>
      suscribirOfertaTodas(
        (lista) => {
          setFilas(lista);
          setCargando(false);
          setError("");
        },
        (e) => {
          setCargando(false);
          setError(e?.message || "No se pudo cargar la oferta.");
        }
      ),
    []
  );

  const programas = useMemo(() => {
    const mapa = new Map();
    for (const f of filas) {
      if (!mapa.has(f.programaId)) {
        mapa.set(f.programaId, {
          programaId: f.programaId, nombre: f.nombrePrograma, total: 0, definidas: 0, ofertadas: 0,
          sinOfertar: 0, pendientes: 0, grupos: 0, ultima: 0, ultimoPor: "", filas: [],
        });
      }
      const p = mapa.get(f.programaId);
      p.total++;
      p.filas.push(f);
      if (f.grupos == null) p.pendientes++;
      else if (f.grupos === 0) { p.definidas++; p.sinOfertar++; }
      else { p.definidas++; p.ofertadas++; p.grupos += f.grupos; }
      const t = aMs(f.actualizadoEn);
      if (t > p.ultima) { p.ultima = t; p.ultimoPor = f.actualizadoPor || ""; }
    }
    for (const p of mapa.values()) {
      p.filas.sort((a, b) => (a.plan === b.plan ? 0 : a.plan === "Plan anterior" ? -1 : 1) || (a.orden ?? 0) - (b.orden ?? 0));
    }
    return [...mapa.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  }, [filas]);

  const totales = useMemo(
    () => programas.reduce((t, p) => ({ total: t.total + p.total, definidas: t.definidas + p.definidas, grupos: t.grupos + p.grupos, completos: t.completos + (p.pendientes === 0 ? 1 : 0) }), { total: 0, definidas: 0, grupos: 0, completos: 0 }),
    [programas]
  );

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
          Avance de la oferta 2027-I por programa
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Aquí ves en tiempo real cuántas asignaturas ha definido cada director de programa (grupos a
          ofertar o SIN OFERTAR). Lo que está «por definir» aún no aparece en Asignación Docente.
        </p>
        {!cargando && !error && programas.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <span className="badge bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-100">
              {totales.completos} de {programas.length} programas completos
            </span>
            <span className="badge bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-100">
              {totales.definidas} de {totales.total} asignaturas definidas
            </span>
            <span className="badge bg-emerald-600 text-white">{totales.grupos} grupos ofertados</span>
            <div className="ml-auto flex gap-3">
              <button type="button"
                className="rounded-lg bg-institucional-navy px-5 py-2 text-sm font-semibold text-white shadow hover:bg-blue-900 dark:bg-blue-700 dark:hover:bg-blue-600"
                onClick={descargarTodoPdf}>
                ⬇ PDF completo
              </button>
              <button type="button"
                className="rounded-lg bg-institucional-navy px-5 py-2 text-sm font-semibold text-white shadow hover:bg-blue-900 dark:bg-blue-700 dark:hover:bg-blue-600"
                onClick={descargarTodoExcel}>
                ⬇ Excel completo
              </button>
            </div>
          </div>
        )}
      </div>

      {cargando ? (
        <p className="text-center text-slate-500 dark:text-slate-400">Cargando el avance…</p>
      ) : error ? (
        <div className="card p-5 text-sm text-rose-700 dark:text-rose-300">
          No se pudo cargar el avance de la oferta: {error}
        </div>
      ) : programas.length === 0 ? (
        <div className="card p-5 text-sm text-slate-600 dark:text-slate-300">
          Todavía no se han cargado las asignaturas de la oferta 2027-I (falta correr el script
          <code className="mx-1 rounded bg-slate-100 px-1 dark:bg-slate-700">node scripts/seed_oferta.cjs</code>).
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-slate-300 text-xs font-bold uppercase tracking-wide text-slate-800 dark:bg-slate-600 dark:text-slate-100">
              <tr>
                <th className="px-4 py-3.5">Programa</th>
                <th className="w-56 px-3 py-3.5">Avance</th>
                <th className="px-3 py-3.5 text-center">Con oferta</th>
                <th className="px-3 py-3.5 text-center">Grupos</th>
                <th className="px-3 py-3.5 text-center">Sin ofertar</th>
                <th className="px-3 py-3.5 text-center">Por definir</th>
                <th className="px-3 py-3.5">Última actualización</th>
                <th className="px-3 py-3.5">Última sesión del director</th>
              </tr>
            </thead>
            <tbody>
              {programas.map((p) => {
                const pct = p.total ? Math.round((p.definidas / p.total) * 100) : 0;
                const completo = p.pendientes === 0;
                const iniciado = p.definidas > 0;
                const abiertoAqui = abierto === p.programaId;
                const slugP = p.nombre.replace(/[^a-z0-9]/gi, "_").toLowerCase();
                return (
                  <FilaPrograma key={p.programaId} p={p} pct={pct} completo={completo} iniciado={iniciado}
                    abierto={abiertoAqui} alternar={() => setAbierto(abiertoAqui ? null : p.programaId)}
                    sesion={directorPorPrograma.get(p.programaId)?.ultimaConexion}
                    onPdf={() => exportarPdfOfertaPrograma(p.nombre, p.filas, `Oferta_2027-I_${slugP}.pdf`)}
                    onExcel={() => exportarExcelOfertaPrograma(p.nombre, p.filas, `Oferta_2027-I_${slugP}.xlsx`).catch(console.error)} />
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function FilaPrograma({ p, pct, completo, iniciado, abierto, alternar, sesion, onPdf, onExcel }) {
  return (
    <>
      <tr className="cursor-pointer border-t border-slate-300 bg-slate-50 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800/60 dark:hover:bg-slate-700/60" onClick={alternar}>
        <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-slate-100 text-base">
          <span className="mr-2 text-slate-400">{abierto ? "▾" : "▸"}</span>
          {p.nombre.replace("Licenciatura en ", "Lic. ")}
          <span className={"ml-2 " + (completo ? "badge-approved" : iniciado ? "badge-modify" : "badge-pending")}>
            {completo ? "Completo" : iniciado ? "En curso" : "Sin iniciar"}
          </span>
        </td>
        <td className="px-3 py-3.5">
          <div className="flex items-center gap-2">
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-300 dark:bg-slate-600">
              <div className={"h-full " + (completo ? "bg-emerald-600" : "bg-orange-500")} style={{ width: pct + "%" }} />
            </div>
            <span className="w-24 shrink-0 text-xs font-semibold">{p.definidas} de {p.total} ({pct}%)</span>
          </div>
        </td>
        <td className="px-3 py-3.5 text-center text-sm">{p.ofertadas}</td>
        <td className="px-3 py-3.5 text-center text-sm font-bold">{p.grupos}</td>
        <td className="px-3 py-3.5 text-center text-sm">{p.sinOfertar}</td>
        <td className="px-3 py-3.5 text-center text-sm">{p.pendientes ? <span className="badge-modify">{p.pendientes}</span> : 0}</td>
        <td className="px-3 py-3.5 text-xs">
          {p.ultima ? (
            <>
              {new Date(p.ultima).toLocaleString("es-CO")}
              {p.ultimoPor && <div className="text-slate-500 dark:text-slate-400">{p.ultimoPor}</div>}
            </>
          ) : (
            <span className="text-slate-500 dark:text-slate-400">—</span>
          )}
        </td>
        <td className="px-3 py-3.5 text-xs">{sesion !== undefined ? formatearUltimaConexion(sesion) : "—"}</td>
      </tr>
      {abierto && (
        <tr className="border-t border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/40">
          <td colSpan={8} className="px-4 py-4">
            <div className="mb-4 flex justify-end gap-3">
              <button type="button" className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-700" onClick={onPdf}>
                ⬇ PDF de este programa
              </button>
              <button type="button" className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-700" onClick={onExcel}>
                ⬇ Excel de este programa
              </button>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              {["Plan anterior", "Plan de transición"].map((plan) => {
                const lista = p.filas.filter((f) => f.plan === plan);
                if (!lista.length) return null;
                return (
                  <div key={plan}>
                    <p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                      {lista[0].acuerdo}
                    </p>
                    <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white text-sm dark:divide-slate-700 dark:border-slate-700 dark:bg-slate-800">
                      {lista.map((f) => (
                        <li key={f.id} className="flex items-center justify-between gap-3 px-3 py-1.5">
                          <span>{f.asignatura}</span>
                          <span className={"shrink-0 font-semibold " + (f.grupos == null ? "text-orange-600" : f.grupos === 0 ? "text-slate-500" : "text-emerald-700 dark:text-emerald-400")}>
                            {f.grupos == null ? "Por definir" : f.grupos === 0 ? "SIN OFERTAR" : f.grupos + (f.grupos === 1 ? " grupo" : " grupos")}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
