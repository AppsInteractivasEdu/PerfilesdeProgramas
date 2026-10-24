import { useState } from "react";
import { partirCompetencia } from "../utils/constantes.js";

const CAMPO =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-institucional-navy focus:ring-2 focus:ring-institucional-navy/30 dark:border-slate-600 dark:focus:border-institucional-gold dark:focus:ring-institucional-gold/30";

/**
 * Recuadro duplicado del componente, solo para el Director de Departamento,
 * que solo se muestra cuando el filtro "Ver componente" está puesto en un
 * componente concreto (nunca junto a la vista de "Todos los componentes").
 * A diferencia de ComponenteBlock (de solo lectura + Aprobar/Rechazar), este
 * es el único lugar donde se edita el texto del componente.
 */
export default function ComponenteEditorAdmin({ etiqueta, tipo = "fijo", componente, tituloContexto = "", onEditarTexto }) {
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState("");
  const [guardando, setGuardando] = useState(false);

  const [nombreComp, descripcionComp] =
    tipo === "competencia" ? partirCompetencia(componente?.valor) : [etiqueta, componente?.valor];
  const titulo = tipo === "competencia" ? nombreComp : etiqueta;
  const cuerpo = tipo === "competencia" ? descripcionComp : componente?.valor;

  const abrirEdicion = () => {
    setTexto(componente?.valor || "");
    setEditando(true);
  };

  const guardar = async () => {
    setGuardando(true);
    await onEditarTexto(texto.trim());
    setGuardando(false);
    setEditando(false);
  };

  const idCampo = `editor-${tituloContexto}-${titulo}`.replace(/\s+/g, "-");

  return (
    <div className="flex h-full flex-col rounded-xl border-2 border-dashed border-institucional-navy/50 bg-white p-4 dark:border-institucional-gold/50 dark:bg-slate-800">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h4 className="font-semibold text-slate-800 dark:text-slate-100">{titulo}</h4>
        <span className="field-label shrink-0 text-institucional-navy dark:text-institucional-gold">
          Texto editable
        </span>
      </div>

      {editando ? (
        <div className="mt-3 space-y-2">
          <label className="field-label" htmlFor={`valor-${idCampo}`}>
            Texto del componente
          </label>
          <textarea
            id={`valor-${idCampo}`}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={Math.min(24, Math.max(6, Math.ceil(texto.length / 45) + texto.split("\n").length))}
            className={CAMPO}
          />
          <div className="flex gap-2">
            <button type="button" className="btn-primary" disabled={guardando} onClick={guardar}>
              {guardando ? "Guardando…" : "Guardar texto"}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setEditando(false)}>
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            {cuerpo || "—"}
          </p>
          <div className="mt-auto pt-3">
            <button type="button" className="btn-secondary" onClick={abrirEdicion}>
              ✎ Editar texto
            </button>
          </div>
        </>
      )}
    </div>
  );
}
