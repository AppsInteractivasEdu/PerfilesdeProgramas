import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { MAX_GRUPOS, guardarOferta, suscribirOfertaPorPrograma } from "../services/oferta.js";
import { exportarExcelOfertaPrograma } from "../utils/exportExcel.js";
import { exportarPdfOfertaPrograma } from "../utils/exportPdf.js";

const CAMPO =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-institucional-navy focus:ring-2 focus:ring-institucional-navy/30 dark:border-slate-600 dark:bg-slate-800 dark:focus:border-institucional-gold dark:focus:ring-institucional-gold/30";

const OPCIONES = [
  { valor: "", etiqueta: "— Sin definir —" },
  { valor: "0", etiqueta: "SIN OFERTAR" },
  ...Array.from({ length: MAX_GRUPOS }, (_, i) => ({
    valor: String(i + 1),
    etiqueta: `${i + 1} ${i === 0 ? "grupo" : "grupos"}`,
  })),
];

const aTexto = (grupos) => (grupos == null ? "" : String(grupos));
const aValor = (texto) => (texto === "" ? null : Number(texto));

function claseFila(texto) {
  if (texto === "") return "bg-amber-50/70 dark:bg-amber-900/10";
  if (texto === "0") return "bg-slate-100 text-slate-500 dark:bg-slate-900/40 dark:text-slate-400";
  return "bg-emerald-50/70 dark:bg-emerald-900/10";
}

/**
 * Panel del director de programa para definir, por asignatura, cuántos grupos se ofertarán en
 * 2027-I. Las asignaturas vienen del formato de necesidades, agrupadas por ACUERDO ACADÉMICO
 * (plan anterior y plan de transición). Lo que se guarda lo toma en tiempo real el aplicativo de
 * Asignación Docente (pestaña «Asignación docente» → vista «Asignación 2027-I»).
 */
export default function OfertaPrograma() {
  const { perfil, usuarioFirebase } = useAuth();
  const [filas, setFilas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState("");
  const [borrador, setBorrador] = useState({}); // { [id]: "" | "0".."10" } solo lo que difiere de lo guardado
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState(null); // { tipo: "ok" | "error", texto }

  useEffect(() => {
    if (!perfil?.programaId) return;
    return suscribirOfertaPorPrograma(
      perfil.programaId,
      (lista) => {
        setFilas(lista);
        setCargando(false);
        setErrorCarga("");
        // Lo que ya coincide con lo guardado deja de ser un cambio pendiente.
        setBorrador((b) => {
          const sig = {};
          for (const f of lista) if (f.id in b && b[f.id] !== aTexto(f.grupos)) sig[f.id] = b[f.id];
          return Object.keys(sig).length === Object.keys(b).length ? b : sig;
        });
      },
      (e) => {
        setCargando(false);
        setErrorCarga(e?.message || "No se pudo cargar la oferta.");
      }
    );
  }, [perfil?.programaId]);

  const valorDe = (f) => (f.id in borrador ? borrador[f.id] : aTexto(f.grupos));
  const pendientes = Object.keys(borrador).length;

  useEffect(() => {
    if (!pendientes) return;
    const avisar = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", avisar);
    return () => window.removeEventListener("beforeunload", avisar);
  }, [pendientes]);

  const secciones = useMemo(() => {
    const mapa = new Map();
    for (const f of filas) {
      const k = `${f.plan}|${f.acuerdo}`;
      if (!mapa.has(k)) mapa.set(k, { plan: f.plan, acuerdo: f.acuerdo, filas: [] });
      mapa.get(k).filas.push(f);
    }
    return [...mapa.values()];
  }, [filas]);

  const resumen = useMemo(() => {
    let definidas = 0, ofertadas = 0, grupos = 0;
    for (const f of filas) {
      const v = valorDe(f);
      if (v !== "") definidas++;
      if (v !== "" && v !== "0") { ofertadas++; grupos += Number(v); }
    }
    return { definidas, ofertadas, grupos, total: filas.length };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filas, borrador]);

  const cambiar = (f, texto) => {
    setMensaje(null);
    setBorrador((b) => {
      const sig = { ...b };
      if (texto === aTexto(f.grupos)) delete sig[f.id];
      else sig[f.id] = texto;
      return sig;
    });
  };

  const nombrePrograma = perfil?.nombrePrograma || perfil?.programaId || "programa";
  const slugPrograma = nombrePrograma.replace(/[^a-z0-9]/gi, "_").toLowerCase();

  const descargarPdf = () => {
    exportarPdfOfertaPrograma(nombrePrograma, filas, `Oferta_2027-I_${slugPrograma}.pdf`);
  };
  const descargarExcel = () => {
    exportarExcelOfertaPrograma(nombrePrograma, filas, `Oferta_2027-I_${slugPrograma}.xlsx`);
  };

  const guardar = async () => {
    setGuardando(true);
    setMensaje(null);
    try {
      const cambios = {};
      for (const [id, texto] of Object.entries(borrador)) cambios[id] = aValor(texto);
      await guardarOferta(cambios, usuarioFirebase?.email);
      setBorrador({});
      setMensaje({
        tipo: "ok",
        texto: `Cambios guardados (${new Date().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}). El aplicativo de Asignación Docente ya los refleja.`,
      });
    } catch (e) {
      setMensaje({
        tipo: "error",
        texto:
          e?.code === "permission-denied"
            ? "No se pudo guardar: el sistema no te dio permiso. Avísale al Director de Departamento."
            : "No se pudo guardar: " + (e?.message || "error desconocido") + ". Inténtalo de nuevo.",
      });
    }
    setGuardando(false);
  };

  return (
    <div className="space-y-6 pb-28">
      <div className="card p-5">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
          Oferta de grupos · vigencia 2027-I
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Para cada asignatura de tu programa elige cuántos grupos se ofertarán (de 1 a {MAX_GRUPOS}) o
          marca <b>SIN OFERTAR</b>. Al final de la página pulsa <b>Guardar</b>; puedes volver a
          modificar y guardar cuantas veces lo necesites: el aplicativo de Asignación Docente se
          actualiza al instante. Las asignaturas «Sin ofertar» o «Sin definir» no aparecen allí.
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          <span className="badge bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-100">
            Definidas: {resumen.definidas} de {resumen.total}
          </span>
          <span className="badge bg-emerald-600 text-white">
            {resumen.grupos} {resumen.grupos === 1 ? "grupo ofertado" : "grupos ofertados"} en {resumen.ofertadas}{" "}
            {resumen.ofertadas === 1 ? "asignatura" : "asignaturas"}
          </span>
          {resumen.total - resumen.definidas > 0 && (
            <span className="badge bg-amber-500 text-white">
              Por definir: {resumen.total - resumen.definidas}
            </span>
          )}
        </div>
      </div>

      {cargando ? (
        <p className="text-center text-slate-500 dark:text-slate-400">Cargando la oferta…</p>
      ) : errorCarga ? (
        <div className="card border-rose-300 p-5 text-sm text-rose-700 dark:text-rose-300">
          No se pudo cargar la oferta de tu programa: {errorCarga}
        </div>
      ) : filas.length === 0 ? (
        <div className="card p-5 text-sm text-slate-600 dark:text-slate-300">
          Todavía no se han cargado las asignaturas de la oferta 2027-I para tu programa. Avísale al
          Director de Departamento.
        </div>
      ) : (
        secciones.map((s) => {
          const definidasSeccion = s.filas.filter((f) => valorDe(f) !== "").length;
          return (
            <section key={s.acuerdo} className="card overflow-hidden">
              <div className="bg-institucional-navy px-6 py-5 text-white dark:bg-slate-900">
                <p className="text-xs font-semibold uppercase tracking-widest text-institucional-gold">
                  {s.plan}
                </p>
                <h3 className="mt-1 text-xl font-bold sm:text-2xl">{s.acuerdo}</h3>
                <p className="mt-1 text-sm text-slate-200">
                  Establece la oferta 2027-I de las asignaturas de este acuerdo · {definidasSeccion} de{" "}
                  {s.filas.length} definidas
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-600 dark:bg-slate-700 dark:text-slate-200">
                    <tr>
                      <th className="px-5 py-3">Asignatura</th>
                      <th className="px-3 py-3 text-center">Créditos</th>
                      <th className="px-3 py-3">Componente</th>
                      <th className="w-56 px-5 py-3">Número de grupos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.filas.map((f) => {
                      const v = valorDe(f);
                      const sucio = f.id in borrador;
                      return (
                        <tr
                          key={f.id}
                          className={`border-t border-slate-200 dark:border-slate-700 ${claseFila(v)}`}
                        >
                          <td className="px-5 py-2.5 font-semibold text-slate-900 dark:text-slate-100">
                            {f.asignatura}
                            {sucio && (
                              <span className="ml-2 text-xs font-semibold text-orange-600 dark:text-orange-400">
                                ● sin guardar
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-center">{f.creditos}</td>
                          <td className="px-3 py-2.5">{f.componente}</td>
                          <td className="px-5 py-2.5">
                            <select
                              aria-label={`Número de grupos de ${f.asignatura}`}
                              value={v}
                              onChange={(e) => cambiar(f, e.target.value)}
                              className={CAMPO}
                            >
                              {OPCIONES.map((o) => (
                                <option key={o.valor} value={o.valor}>
                                  {o.etiqueta}
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })
      )}

      {filas.length > 0 && (
        <div className="sticky bottom-4 z-10">
          <div className="card flex flex-col gap-3 border-2 border-institucional-navy p-4 shadow-lg dark:border-institucional-gold sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm">
              {mensaje ? (
                <p
                  className={
                    mensaje.tipo === "ok"
                      ? "font-semibold text-emerald-700 dark:text-emerald-400"
                      : "font-semibold text-rose-700 dark:text-rose-400"
                  }
                  role="status"
                >
                  {mensaje.tipo === "ok" ? "✓ " : "✕ "}
                  {mensaje.texto}
                </p>
              ) : pendientes > 0 ? (
                <p className="font-semibold text-orange-700 dark:text-orange-400">
                  {pendientes} {pendientes === 1 ? "cambio sin guardar" : "cambios sin guardar"}
                </p>
              ) : (
                <p className="text-slate-600 dark:text-slate-300">
                  Sin cambios pendientes. Modifica el número de grupos de cualquier asignatura y pulsa Guardar.
                </p>
              )}
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <button
                type="button"
                className="btn-secondary"
                title="Descargar consolidado en PDF"
                onClick={descargarPdf}
              >
                ⬇ PDF
              </button>
              <button
                type="button"
                className="btn-secondary"
                title="Descargar consolidado en Excel"
                onClick={descargarExcel}
              >
                ⬇ Excel
              </button>
              <button
                type="button"
                className="btn-secondary"
                disabled={pendientes === 0 || guardando}
                onClick={() => {
                  setBorrador({});
                  setMensaje(null);
                }}
              >
                Descartar
              </button>
              <button
                type="button"
                className="btn-primary px-6"
                disabled={pendientes === 0 || guardando}
                onClick={guardar}
              >
                {guardando ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
