import { useState } from "react";

const PREGUNTAS = [
  {
    pregunta: "¿Qué es este aplicativo?",
    respuesta:
      "Es la herramienta donde el Departamento de Pedagogía y Didáctica define y mantiene el perfil docente que exige cada asignatura de los componentes Pedagógico, Didáctica de las Disciplinas y Práctica Pedagógica Investigativa (PPI): la formación de pregrado y posgrado, la experiencia y las competencias que debe acreditar quien la dicte.",
  },
  {
    pregunta: "¿Para qué le sirve al Director de programa?",
    respuesta:
      "Para revisar el perfil que ya está redactado en cada asignatura de su programa y decidir si está de acuerdo con él, o si cree que algo debería ajustarse, antes de que se use para proponer qué docente dicta cada materia en el aplicativo de Asignación Docente.",
  },
  {
    pregunta: "¿Qué significa «De acuerdo» y «Proponer Ajustes»?",
    respuesta:
      "«De acuerdo» confirma que el componente (pregrado, posgrado, experiencia o una competencia) está bien como está. «Proponer Ajustes» envía, con un comentario explicando qué cambiar, una sugerencia al Director de Departamento, quien decide si la aplica.",
  },
  {
    pregunta: "¿Qué pasa después de que envío una sugerencia de ajuste?",
    respuesta:
      "Queda «en revisión» hasta que el Director de Departamento la apruebe (y el texto del componente se actualice) o la rechace con un comentario explicando el motivo. En ambos casos lo verá reflejado la próxima vez que entre a esa asignatura.",
  },
  {
    pregunta: "¿Qué es la pestaña «Oferta de grupos 2027-I»?",
    respuesta:
      "Allí se define, asignatura por asignatura de su programa, cuántos grupos se van a ofrecer en 2027-I, cuántos estudiantes por grupo y, cuando aplica, si el grupo se reparte entre varios docentes (subgrupos). Esta información es la que usa el aplicativo de Asignación Docente para proponer la carga de cada profesor.",
  },
  {
    pregunta: "¿Puedo descargar un reporte de mis sugerencias?",
    respuesta:
      "Sí. En la pestaña «Revisión de perfiles docentes» el botón «Descargar reporte (PDF)» genera un documento solo con las asignaturas donde propuso un ajuste, junto con el comentario registrado.",
  },
  {
    pregunta: "¿A quién contacto si algo no cuadra o tengo dudas?",
    respuesta:
      "Al Director de Departamento de Pedagogía y Didáctica, quien administra el aplicativo y resuelve las sugerencias de ajuste.",
  },
];

function Item({ pregunta, respuesta }) {
  const [abierta, setAbierta] = useState(false);
  return (
    <div className="card overflow-hidden transition-shadow duration-300 hover:shadow-md">
      <button
        type="button"
        onClick={() => setAbierta((v) => !v)}
        aria-expanded={abierta}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors duration-200 hover:bg-slate-50 dark:hover:bg-slate-800/60"
      >
        <span className="font-semibold text-slate-800 dark:text-slate-100">{pregunta}</span>
        <span
          aria-hidden="true"
          className={`shrink-0 text-slate-400 transition-transform duration-300 ease-out ${abierta ? "rotate-180" : ""}`}
        >
          ▼
        </span>
      </button>
      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${abierta ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
      >
        <div className="overflow-hidden">
          <div className="border-t border-slate-100 px-5 py-4 text-sm leading-relaxed text-slate-600 dark:border-slate-700/60 dark:text-slate-300">
            {respuesta}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Preguntas frecuentes: qué es y para qué sirve el aplicativo, en lenguaje simple. */
export default function PreguntasFrecuentes() {
  return (
    <div className="space-y-4">
      <div className="card p-5">
        <h2 className="font-semibold text-slate-800 dark:text-slate-100">Preguntas frecuentes</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Qué es y para qué sirve el aplicativo de Perfiles Docentes.
        </p>
      </div>
      <div className="space-y-3">
        {PREGUNTAS.map((p) => (
          <Item key={p.pregunta} {...p} />
        ))}
      </div>
    </div>
  );
}
