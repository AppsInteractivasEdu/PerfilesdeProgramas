import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import Navbar from "../components/Navbar.jsx";
import AsignaturaCard from "../components/AsignaturaCard.jsx";
import { suscribirAsignaturasPorDepartamento } from "../services/asignaturas.js";
import { ESTADO_REVISOR, listarComponentes } from "../utils/constantes.js";
import { exportarPdfDirector } from "../utils/exportPdf.js";

const CAMPO =
  "w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-institucional-navy focus:ring-2 focus:ring-institucional-navy/30 dark:border-slate-600 dark:bg-slate-800 dark:focus:border-institucional-gold dark:focus:ring-institucional-gold/30";

/**
 * Panel de un departamento (p. ej. Matemática y Estadística): revisa las
 * asignaturas que le fueron asignadas, que pueden pertenecer a varios
 * programas distintos. Su revisión es independiente de la del director de
 * programa y llega también al Director de Departamento para aprobación.
 */
export default function DepartamentoDashboard() {
  const { perfil } = useAuth();
  const [asignaturas, setAsignaturas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [programaFiltro, setProgramaFiltro] = useState("");

  useEffect(() => {
    if (!perfil?.departamentoId) return;
    const desuscribir = suscribirAsignaturasPorDepartamento(perfil.departamentoId, (lista) => {
      setAsignaturas(lista);
      setCargando(false);
    });
    return desuscribir;
  }, [perfil?.departamentoId]);

  const programasDisponibles = useMemo(() => {
    const mapa = new Map();
    for (const a of asignaturas) mapa.set(a.programaId, a.nombrePrograma || a.programaId);
    return [...mapa.entries()]
      .map(([id, nombre]) => ({ id, nombre }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  }, [asignaturas]);

  const filasModificar = useMemo(() => {
    const filas = [];
    for (const a of asignaturas) {
      for (const { clave, etiqueta } of listarComponentes(a.componentes)) {
        const rev = a.componentes?.[clave]?.revisiones?.departamento;
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

  const asignaturasFiltradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return asignaturas
      .filter(
        (a) =>
          (!programaFiltro || a.programaId === programaFiltro) &&
          (!q || a.nombre.toLowerCase().includes(q))
      )
      .sort(
        (a, b) =>
          (a.nombrePrograma || "").localeCompare(b.nombrePrograma || "", "es") ||
          (a.orden ?? 0) - (b.orden ?? 0)
      );
  }, [asignaturas, busqueda, programaFiltro]);

  const descargarPdf = () => {
    exportarPdfDirector(
      perfil.nombreDepartamento,
      filasModificar,
      `sugerencias-${perfil.departamentoId}.pdf`
    );
  };

  return (
    <div className="min-h-screen bg-slate-300 dark:bg-slate-950">
      <Navbar titulo={perfil?.nombreDepartamento} subtitulo="Panel del departamento" />

      <main className="mx-auto w-full max-w-[2400px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="card flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-slate-800 dark:text-slate-100">
              Revisión de asignaturas asignadas al departamento
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {asignaturas.length} asignaturas en {programasDisponibles.length} programa(s). Aprueba
              cada componente o sugiere una modificación; tu revisión es independiente de la del
              director de cada programa y queda a la espera de la aprobación del Director de
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

        <div className="flex flex-col gap-3 sm:flex-row">
          <select
            aria-label="Filtrar por programa"
            value={programaFiltro}
            onChange={(e) => setProgramaFiltro(e.target.value)}
            className={`sm:max-w-xs ${CAMPO}`}
          >
            <option value="">Todos los programas</option>
            {programasDisponibles.map((p) => (
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
        </div>

        {cargando ? (
          <p className="text-center text-slate-500 dark:text-slate-400">Cargando asignaturas…</p>
        ) : asignaturasFiltradas.length === 0 ? (
          <p className="text-center text-slate-500 dark:text-slate-400">
            No se encontraron asignaturas.
          </p>
        ) : (
          <div className="space-y-3">
            {asignaturasFiltradas.map((a) => (
              <AsignaturaCard key={a.id} asignatura={a} revisor="departamento" />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
