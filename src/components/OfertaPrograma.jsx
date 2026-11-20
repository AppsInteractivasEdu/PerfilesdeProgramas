import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import {
  MAX_ESTUDIANTES,
  MAX_GRUPOS,
  MAX_SUBGRUPOS,
  admiteSubgrupos,
  guardarOferta,
  suscribirOfertaPorPrograma,
} from "../services/oferta.js";
import { exportarExcelOfertaPrograma } from "../utils/exportExcel.js";
import { exportarPdfOfertaPrograma } from "../utils/exportPdf.js";

const CAMPO =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-institucional-navy focus:ring-2 focus:ring-institucional-navy/30 dark:border-slate-600 dark:bg-slate-800 dark:focus:border-institucional-gold dark:focus:ring-institucional-gold/30";

const CAMPO_SM =
  "rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold outline-none focus:border-institucional-navy focus:ring-2 focus:ring-institucional-navy/20 dark:border-slate-600 dark:bg-slate-800 dark:focus:border-institucional-gold dark:focus:ring-institucional-gold/20";

const CAMPO_DOCENTE =
  "rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm font-semibold outline-none focus:border-institucional-navy focus:ring-2 focus:ring-institucional-navy/20 dark:border-slate-600 dark:bg-slate-900 dark:focus:border-institucional-gold dark:focus:ring-institucional-gold/20";

const OPCIONES = [
  { valor: "", etiqueta: "— Sin definir —" },
  { valor: "0", etiqueta: "SIN OFERTAR" },
  ...Array.from({ length: MAX_GRUPOS }, (_, i) => ({
    valor: String(i + 1),
    etiqueta: `${i + 1} ${i === 0 ? "grupo" : "grupos"}`,
  })),
];

const OPCIONES_SUBGRUPOS = [
  { valor: "0", etiqueta: "1 Docente" },
  ...Array.from({ length: MAX_SUBGRUPOS - 1 }, (_, i) => ({
    valor: String(i + 2),
    etiqueta: `${i + 2} Docentes`,
  })),
];

const OPCIONES_REPARTO = [
  { valor: "distintos", etiqueta: "Docentes distintos" },
  { valor: "mismo", etiqueta: "Mismo docente" },
];

const OPCIONES_COMPACTO = [
  { valor: "repartido", etiqueta: "Estudiantes repartidos" },
  { valor: "compacto", etiqueta: "Grupo compacto (mismos estudiantes)" },
];

const aTexto = (grupos) => (grupos == null ? "" : String(grupos));
const aValor = (texto) => (texto === "" ? null : Number(texto));
const numDeTexto = (texto) => (texto === "" ? 0 : Number(texto) || 0);

/** Recorta/rellena un arreglo a longitud n (relleno con `def`). */
function ajustar(arr, n, def = null) {
  const a = (Array.isArray(arr) ? arr : []).slice(0, n);
  while (a.length < n) a.push(def);
  return a;
}

/** Estado "efectivo" (guardado + lo que el director está editando) de una fila. */
function efectivoDe(f, borrador) {
  const entry = borrador[f.id];
  if (entry) return entry;
  const n = numDeTexto(aTexto(f.grupos));
  return { grupos: aTexto(f.grupos), estudiantes: ajustar(f.estudiantes, n, null), subgrupos: ajustar(f.subgrupos, n, null) };
}

function claseFila(texto) {
  if (texto === "") return "bg-amber-50/70 dark:bg-amber-900/10";
  if (texto === "0") return "bg-slate-100 text-slate-500 dark:bg-slate-900/40 dark:text-slate-400";
  return "bg-emerald-50/70 dark:bg-emerald-900/10";
}

const nombreDocente = (idx, mismoDocente) => (mismoDocente ? "Docente 1" : `Docente ${idx + 1}`);

/** Reparte `total` estudiantes entre `n` docentes (repartido) o les asigna a todos el grupo completo (compacto). */
function listaDocentes(total, n, mismoDocente, compacto) {
  const t = total || 0;
  if (compacto) {
    return Array.from({ length: n }, (_, i) => ({ nombre: nombreDocente(i, mismoDocente), estudiantes: t }));
  }
  const base = Math.floor(t / n);
  const resto = t - base * n;
  return Array.from({ length: n }, (_, i) => ({ nombre: nombreDocente(i, mismoDocente), estudiantes: base + (i < resto ? 1 : 0) }));
}

/**
 * Panel del director de programa para definir, por asignatura, cuántos grupos se ofertarán en
 * 2027-I, cuántos estudiantes tendrá cada grupo (0 a {MAX_ESTUDIANTES}) y, para las asignaturas que
 * lo admiten (ver admiteSubgrupos en services/oferta.js: Saberes Específicos y Disciplinares de
 * Química, y «Práctica Profesional» / «Práctica Pedagógica Investigativa VI» de cualquier programa),
 * en cuántos subgrupos por docente (Docente 1..5) se reparte cada grupo, y si esos subgrupos los
 * dicta el mismo docente o docentes distintos. Las asignaturas vienen del formato de necesidades,
 * agrupadas por ACUERDO ACADÉMICO (plan anterior y plan de transición). Lo que se guarda lo toma en
 * tiempo real el aplicativo de Asignación Docente (pestaña «Asignación docente» → vista «Asignación
 * 2027-I»).
 */
export default function OfertaPrograma() {
  const { perfil, usuarioFirebase } = useAuth();
  const [filas, setFilas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState("");
  const [borrador, setBorrador] = useState({}); // { [id]: { grupos, estudiantes:[], subgrupos:[] } } solo lo que difiere de lo guardado
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
          for (const f of lista) {
            if (!(f.id in b)) continue;
            const n = numDeTexto(b[f.id].grupos);
            const guardado = { grupos: aTexto(f.grupos), estudiantes: ajustar(f.estudiantes, n, null), subgrupos: ajustar(f.subgrupos, n, null) };
            if (JSON.stringify(guardado) !== JSON.stringify(b[f.id])) sig[f.id] = b[f.id];
          }
          return Object.keys(sig).length === Object.keys(b).length ? b : sig;
        });
      },
      (e) => {
        setCargando(false);
        setErrorCarga(e?.message || "No se pudo cargar la oferta.");
      }
    );
  }, [perfil?.programaId]);

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
      const v = efectivoDe(f, borrador).grupos;
      if (v !== "") definidas++;
      if (v !== "" && v !== "0") { ofertadas++; grupos += Number(v); }
    }
    return { definidas, ofertadas, grupos, total: filas.length };
  }, [filas, borrador]);

  /** Guarda en `borrador` el nuevo estado efectivo de una fila; si vuelve a coincidir con lo guardado, lo quita. */
  const actualizarFila = (f, nuevo) => {
    setMensaje(null);
    const n = numDeTexto(nuevo.grupos);
    const normalizado = { grupos: nuevo.grupos, estudiantes: ajustar(nuevo.estudiantes, n, null), subgrupos: ajustar(nuevo.subgrupos, n, null) };
    const guardado = { grupos: aTexto(f.grupos), estudiantes: ajustar(f.estudiantes, n, null), subgrupos: ajustar(f.subgrupos, n, null) };
    setBorrador((b) => {
      const sig = { ...b };
      if (JSON.stringify(normalizado) === JSON.stringify(guardado)) delete sig[f.id];
      else sig[f.id] = normalizado;
      return sig;
    });
  };

  const cambiarGrupos = (f, texto) => {
    const actual = efectivoDe(f, borrador);
    const n = numDeTexto(texto);
    actualizarFila(f, { grupos: texto, estudiantes: ajustar(actual.estudiantes, n, null), subgrupos: ajustar(actual.subgrupos, n, null) });
  };

  const cambiarEstudiantes = (f, idx, textoValor) => {
    const actual = efectivoDe(f, borrador);
    const estudiantes = actual.estudiantes.slice();
    const nuevo = textoValor === "" ? null : Number(textoValor);
    estudiantes[idx] = nuevo;
    const subgrupos = actual.subgrupos.slice();
    const cfg = subgrupos[idx];
    // Si el grupo es compacto, todos los docentes dictan al mismo total: lo mantenemos sincronizado.
    if (cfg && cfg.compacto) {
      subgrupos[idx] = { ...cfg, lista: cfg.lista.map((sg) => ({ ...sg, estudiantes: nuevo })) };
    }
    actualizarFila(f, { ...actual, estudiantes, subgrupos });
  };

  const cambiarNumSubgrupos = (f, idx, n) => {
    const actual = efectivoDe(f, borrador);
    const subgrupos = actual.subgrupos.slice();
    const previo = subgrupos[idx];
    const mismoDocente = previo?.mismoDocente || false;
    const compacto = previo?.compacto || false;
    subgrupos[idx] = n ? { mismoDocente, compacto, lista: listaDocentes(actual.estudiantes[idx], n, mismoDocente, compacto) } : null;
    actualizarFila(f, { ...actual, subgrupos });
  };

  const cambiarReparto = (f, idx, mismo) => {
    const actual = efectivoDe(f, borrador);
    const subgrupos = actual.subgrupos.slice();
    const cfg = subgrupos[idx];
    if (!cfg) return;
    subgrupos[idx] = { ...cfg, mismoDocente: mismo, lista: cfg.lista.map((sg, i) => ({ ...sg, nombre: nombreDocente(i, mismo) })) };
    actualizarFila(f, { ...actual, subgrupos });
  };

  /** Alterna entre repartir los estudiantes entre los docentes o dejar el grupo compacto (todos con el mismo total). */
  const cambiarCompacto = (f, idx, compacto) => {
    const actual = efectivoDe(f, borrador);
    const subgrupos = actual.subgrupos.slice();
    const cfg = subgrupos[idx];
    if (!cfg) return;
    const n = cfg.lista.length;
    subgrupos[idx] = { ...cfg, compacto, lista: listaDocentes(actual.estudiantes[idx], n, cfg.mismoDocente, compacto) };
    actualizarFila(f, { ...actual, subgrupos });
  };

  const cambiarSubgrupoEstudiantes = (f, idxGrupo, idxSub, textoValor) => {
    const actual = efectivoDe(f, borrador);
    const subgrupos = actual.subgrupos.slice();
    const cfg = subgrupos[idxGrupo];
    if (!cfg || cfg.compacto) return; // compacto: los totales no se editan individualmente
    const lista = cfg.lista.slice();
    lista[idxSub] = { ...lista[idxSub], estudiantes: textoValor === "" ? null : Number(textoValor) };
    subgrupos[idxGrupo] = { ...cfg, lista };
    actualizarFila(f, { ...actual, subgrupos });
  };

  const nombrePrograma = perfil?.nombrePrograma || perfil?.programaId || "programa";
  const slugPrograma = nombrePrograma.replace(/[^a-z0-9]/gi, "_").toLowerCase();

  const descargarPdf = () => {
    exportarPdfOfertaPrograma(nombrePrograma, filas, `Oferta_2027-I_${slugPrograma}.pdf`);
  };
  const descargarExcel = () => {
    exportarExcelOfertaPrograma(nombrePrograma, filas, `Oferta_2027-I_${slugPrograma}.xlsx`).catch(console.error);
  };

  const guardar = async () => {
    setGuardando(true);
    setMensaje(null);
    try {
      const cambios = {};
      for (const [id, entry] of Object.entries(borrador)) {
        cambios[id] = { grupos: aValor(entry.grupos), estudiantes: entry.estudiantes, subgrupos: entry.subgrupos };
      }
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
          marca <b>SIN OFERTAR</b>, y para cada grupo cuántos estudiantes tendrá (de 0 a {MAX_ESTUDIANTES}).
          {" "}En Saberes Específicos y Disciplinares de Química, y en «Práctica Profesional» / «Práctica
          Pedagógica Investigativa VI» de cualquier programa, también puedes repartir cada grupo entre
          varios docentes (Docente 1 a Docente {MAX_SUBGRUPOS}), indicar si será el mismo docente o
          docentes distintos, y si los estudiantes se reparten entre ellos o el grupo se mantiene
          compacto (todos dictan al mismo total de estudiantes). Al final de la página pulsa{" "}
          <b>Guardar</b>; puedes volver a modificar y guardar cuantas veces lo necesites: el aplicativo de
          Asignación Docente se actualiza al instante. Las asignaturas «Sin ofertar» o «Sin definir» no
          aparecen allí.
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
          const definidasSeccion = s.filas.filter((f) => efectivoDe(f, borrador).grupos !== "").length;
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
                <table className="w-full min-w-[820px] text-left text-sm">
                  <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-600 dark:bg-slate-700 dark:text-slate-200">
                    <tr>
                      <th className="px-5 py-3">Asignatura</th>
                      <th className="px-3 py-3 text-center">Créditos</th>
                      <th className="px-3 py-3">Componente</th>
                      <th className="px-5 py-3">Grupos y estudiantes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.filas.map((f) => {
                      const efectivo = efectivoDe(f, borrador);
                      const v = efectivo.grupos;
                      const n = numDeTexto(v);
                      const sucio = f.id in borrador;
                      const conSubgrupos = admiteSubgrupos(f);
                      return (
                        <tr
                          key={f.id}
                          className={`border-t border-slate-200 dark:border-slate-700 ${claseFila(v)}`}
                        >
                          <td className="px-5 py-2.5 align-top font-semibold text-slate-900 dark:text-slate-100">
                            {f.asignatura}
                            {sucio && (
                              <span className="ml-2 text-xs font-semibold text-orange-600 dark:text-orange-400">
                                ● sin guardar
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-center align-top">{f.creditos}</td>
                          <td className="px-3 py-2.5 align-top">{f.componente}</td>
                          <td className="px-5 py-2.5 align-top">
                            <select
                              aria-label={`Número de grupos de ${f.asignatura}`}
                              value={v}
                              onChange={(e) => cambiarGrupos(f, e.target.value)}
                              className={CAMPO}
                            >
                              {OPCIONES.map((o) => (
                                <option key={o.valor} value={o.valor}>
                                  {o.etiqueta}
                                </option>
                              ))}
                            </select>

                            {n >= 1 && (
                              <div className="mt-2 space-y-3 rounded-lg border border-slate-200 bg-slate-50/60 p-3 dark:border-slate-700 dark:bg-slate-800/40">
                                {Array.from({ length: n }, (_, i) => {
                                  const estGrupo = efectivo.estudiantes[i];
                                  const subGrupo = efectivo.subgrupos[i];
                                  const lista = subGrupo?.lista || [];
                                  const sumaSub = lista.reduce((s, x) => s + (x.estudiantes || 0), 0);
                                  return (
                                    <div key={i} className="space-y-2">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <span className="w-16 shrink-0 text-sm font-semibold text-slate-600 dark:text-slate-300">
                                          Grupo {i + 1}
                                        </span>
                                        <select
                                          aria-label={`Estudiantes del grupo ${i + 1} de ${f.asignatura}`}
                                          value={estGrupo == null ? "" : String(estGrupo)}
                                          onChange={(e) => cambiarEstudiantes(f, i, e.target.value)}
                                          className={CAMPO_SM}
                                        >
                                          <option value="">— Sin definir —</option>
                                          {Array.from({ length: MAX_ESTUDIANTES + 1 }, (_, k) => (
                                            <option key={k} value={k}>
                                              {k} estudiante{k === 1 ? "" : "s"}
                                            </option>
                                          ))}
                                        </select>

                                        {conSubgrupos && (
                                          <select
                                            aria-label={`Docentes del grupo ${i + 1} de ${f.asignatura}`}
                                            title="Repartir este grupo entre varios docentes"
                                            value={String(lista.length || 0)}
                                            onChange={(e) => cambiarNumSubgrupos(f, i, Number(e.target.value))}
                                            className={CAMPO_SM}
                                          >
                                            {OPCIONES_SUBGRUPOS.map((o) => (
                                              <option key={o.valor} value={o.valor}>
                                                {o.etiqueta}
                                              </option>
                                            ))}
                                          </select>
                                        )}

                                        {conSubgrupos && lista.length > 0 && (
                                          <select
                                            aria-label={`¿Mismo docente en el grupo ${i + 1} de ${f.asignatura}?`}
                                            title="¿El mismo docente dicta todos los subgrupos, o docentes distintos?"
                                            value={subGrupo.mismoDocente ? "mismo" : "distintos"}
                                            onChange={(e) => cambiarReparto(f, i, e.target.value === "mismo")}
                                            className={CAMPO_SM}
                                          >
                                            {OPCIONES_REPARTO.map((o) => (
                                              <option key={o.valor} value={o.valor}>
                                                {o.etiqueta}
                                              </option>
                                            ))}
                                          </select>
                                        )}

                                        {conSubgrupos && lista.length > 0 && (
                                          <select
                                            aria-label={`¿Se reparten los estudiantes o el grupo ${i + 1} de ${f.asignatura} es compacto?`}
                                            title="¿Los estudiantes se reparten entre los docentes, o el grupo se mantiene compacto (todos con el mismo total)?"
                                            value={subGrupo.compacto ? "compacto" : "repartido"}
                                            onChange={(e) => cambiarCompacto(f, i, e.target.value === "compacto")}
                                            className={CAMPO_SM}
                                          >
                                            {OPCIONES_COMPACTO.map((o) => (
                                              <option key={o.valor} value={o.valor}>
                                                {o.etiqueta}
                                              </option>
                                            ))}
                                          </select>
                                        )}
                                      </div>

                                      {conSubgrupos && lista.length > 0 && (
                                        <div className="ml-[72px] flex flex-wrap items-center gap-2">
                                          {lista.map((sg, si) => (
                                            <label
                                              key={si}
                                              className="flex items-center gap-1.5 rounded-lg border border-institucional-navy/20 bg-white px-2.5 py-1.5 text-sm dark:border-institucional-gold/30 dark:bg-slate-900"
                                            >
                                              <span className="font-semibold text-institucional-navy dark:text-institucional-gold">
                                                {sg.nombre}
                                              </span>
                                              <select
                                                aria-label={`Estudiantes de ${sg.nombre}, grupo ${i + 1} de ${f.asignatura}`}
                                                value={sg.estudiantes == null ? "" : String(sg.estudiantes)}
                                                onChange={(e) => cambiarSubgrupoEstudiantes(f, i, si, e.target.value)}
                                                disabled={subGrupo.compacto}
                                                className={CAMPO_DOCENTE + (subGrupo.compacto ? " opacity-60" : "")}
                                              >
                                                <option value="">—</option>
                                                {Array.from({ length: MAX_ESTUDIANTES + 1 }, (_, k) => (
                                                  <option key={k} value={k}>
                                                    {k}
                                                  </option>
                                                ))}
                                              </select>
                                            </label>
                                          ))}
                                          {subGrupo.compacto ? (
                                            <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                                              Grupo compacto: todos con los mismos {estGrupo == null ? "?" : estGrupo} estudiantes
                                            </span>
                                          ) : (
                                            <span
                                              className={
                                                "text-sm font-semibold " +
                                                (estGrupo == null || sumaSub === estGrupo
                                                  ? "text-emerald-600 dark:text-emerald-400"
                                                  : "text-amber-600 dark:text-amber-400")
                                              }
                                              title="Suma de estudiantes de los subgrupos frente al total del grupo"
                                            >
                                              {sumaSub}/{estGrupo == null ? "?" : estGrupo}
                                            </span>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
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
                  Sin cambios pendientes. Modifica el número de grupos, estudiantes o subgrupos de cualquier
                  asignatura y pulsa Guardar.
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
