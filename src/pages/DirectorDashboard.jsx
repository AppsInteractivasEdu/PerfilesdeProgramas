import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import Navbar from "../components/Navbar.jsx";
import AsignaturaCard from "../components/AsignaturaCard.jsx";
import { suscribirAsignaturasPorPrograma } from "../services/asignaturas.js";
import { ESTADO_DIRECTOR, listarComponentes } from "../utils/constantes.js";
import { exportarPdfDirector } from "../utils/exportPdf.js";

export default function DirectorDashboard() {
  const { perfil } = useAuth();
  const [asignaturas, setAsignaturas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    if (!perfil?.programaId) return;
    const desuscribir = suscribirAsignaturasPorPrograma(perfil.programaId, (lista) => {
      setAsignaturas(lista);
      setCargando(false);
    });
    return desuscribir;
  }, [perfil?.programaId]);

  const filasModificar = useMemo(() => {
    const filas = [];
    for (const a of asignaturas) {
      for (const { clave, etiqueta } of listarComponentes(a.componentes)) {
        const comp = a.componentes?.[clave];
        if (comp?.estadoDirector === ESTADO_DIRECTOR.MODIFICAR) {
          filas.push({
            asignatura: a.nombre,
            componente: etiqueta,
            comentario: comp.comentarioDirector || "",
          });
        }
      }
    }
    return filas;
  }, [asignaturas]);

  const asignaturasFiltradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return asignaturas;
    return asignaturas.filter((a) => a.nombre.toLowerCase().includes(q));
  }, [asignaturas, busqueda]);

  const descargarPdf = () => {
    exportarPdfDirector(
      perfil.nombrePrograma,
      filasModificar,
      `sugerencias-${perfil.programaId}.pdf`
    );
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900">
      <Navbar titulo={perfil?.nombrePrograma} subtitulo="Panel del director de programa" />

      <main className="mx-auto w-full max-w-[2400px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="card flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-slate-800 dark:text-slate-100">
              Revisión de perfiles docentes
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Aprueba cada componente o sugiere una modificación. Solo las
              asignaturas con sugerencias se incluyen en el reporte descargable.
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

        <input
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar asignatura…"
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-institucional-navy focus:ring-2 focus:ring-institucional-navy/30 dark:border-slate-600 dark:bg-slate-800 dark:focus:border-institucional-gold dark:focus:ring-institucional-gold/30"
        />

        {cargando ? (
          <p className="text-center text-slate-500 dark:text-slate-400">Cargando asignaturas…</p>
        ) : asignaturasFiltradas.length === 0 ? (
          <p className="text-center text-slate-500 dark:text-slate-400">
            No se encontraron asignaturas.
          </p>
        ) : (
          <div className="space-y-3">
            {asignaturasFiltradas.map((a) => (
              <AsignaturaCard key={a.id} asignatura={a} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
