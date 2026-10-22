export const ESTADO_DIRECTOR = {
  PENDIENTE: "pendiente",
  APROBADO: "aprobado",
  MODIFICAR: "modificar",
};

export const ESTADO_ADMIN = {
  PENDIENTE: "pendiente",
  APROBADO: "aprobado",
  RECHAZADO: "rechazado",
};

export const ROL_ADMIN_NOMBRE = "Director de Departamento";

const FIJOS = [
  { clave: "pregrado", etiqueta: "Formación de pregrado" },
  { clave: "posgradual", etiqueta: "Formación posgradual" },
  { clave: "experiencia", etiqueta: "Experiencia docente y profesional" },
];

export const CLAVE_IDONEIDAD = "idoneidad";
const ETIQUETA_IDONEIDAD = "Criterio integral de idoneidad";

const esCompetencia = (clave) => /^comp\d+$/.test(clave);

/** Las competencias se guardan como "Nombre\nDescripción": el nombre es la primera línea. */
export function partirCompetencia(valor = "") {
  const i = valor.indexOf("\n");
  if (i === -1) return [valor.trim(), ""];
  return [valor.slice(0, i).trim(), valor.slice(i + 1).trim()];
}

/**
 * Componentes de una asignatura en el orden en que se muestran:
 * pregrado, posgradual, experiencia, competencias (comp1..N) e idoneidad.
 * El campo antiguo "competencias" (solo nombres) ya no se muestra.
 */
export function listarComponentes(componentes = {}) {
  const lista = FIJOS.map((f) => ({ ...f, tipo: "fijo" }));
  Object.keys(componentes)
    .filter(esCompetencia)
    .sort((a, b) => parseInt(a.slice(4), 10) - parseInt(b.slice(4), 10))
    .forEach((clave) => {
      const [nombre] = partirCompetencia(componentes[clave]?.valor);
      lista.push({ clave, etiqueta: nombre || `Competencia ${clave.slice(4)}`, tipo: "competencia" });
    });
  if (componentes[CLAVE_IDONEIDAD]) {
    lista.push({ clave: CLAVE_IDONEIDAD, etiqueta: ETIQUETA_IDONEIDAD, tipo: "idoneidad" });
  }
  return lista;
}
