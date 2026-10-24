/**
 * Distribución de asignaturas por departamento, construida a partir de
 * "distribucion_departamentos_licenciaturas_asignaturas.xlsx" (entregado por
 * el usuario). Se deja como datos explícitos (en vez de releer el Excel en
 * cada script) porque varios nombres de asignatura en esa hoja no coinciden
 * letra por letra con los nombres reales en data/tabla_resultado.xlsx; cada
 * fila de abajo ya usa el nombre EXACTO tal como aparece en Firestore.
 *
 * Nota: la hoja original incluía una fila más,
 *   "Departamento de Química" > "Licenciatura en Química" >
 *   "Didáctica de la Química I (Plan de Transición)"
 * que se omitió a propósito: esa asignatura no existe (solo existe
 * "Didáctica de la Química II (Plan de Transición)"), así que probablemente
 * sea un error de digitación en la hoja de distribución. Si en realidad
 * también debía asignarse "Didáctica de la Química II", avísalo para
 * agregarla.
 */

const DEPARTAMENTOS = [
  { departamentoId: "ciencias-biologicas", nombre: "Departamento de Ciencias Biológicas" },
  { departamentoId: "matematica-estadistica", nombre: "Departamento de Matemática y Estadística" },
  { departamentoId: "quimica", nombre: "Departamento de Química" },
  { departamentoId: "fisica", nombre: "Departamento de Física" },
];

// [departamentoId, programaId, nombreAsignatura] — nombreAsignatura tal como
// aparece en data/tabla_resultado.xlsx (y por tanto en Firestore).
const ASIGNACIONES = [
  ["ciencias-biologicas", "etnoeducacion", "Didácticas de las Ciencias"],
  ["ciencias-biologicas", "etnoeducacion", "Didáctica de las Ciencias Naturales (Plan de Transición)"],
  ["matematica-estadistica", "etnoeducacion", "Didáctica de las Matemáticas en Perspectiva Intercultural (Plan de Transición)"],

  ["matematica-estadistica", "matematicas", "Resolución de Problemas Matemáticos"],
  ["matematica-estadistica", "matematicas", "Pensamiento Matemático"],
  ["matematica-estadistica", "matematicas", "Historia de las Matemáticas"],
  ["matematica-estadistica", "matematicas", "Educación Matemática III"],
  ["matematica-estadistica", "matematicas", "Educación Matemática II"],
  ["matematica-estadistica", "matematicas", "Educación Matemática I"],
  ["matematica-estadistica", "matematicas", "Didáctica de la Aritmética y del Álgebra (Plan de Transición)"],
  ["matematica-estadistica", "matematicas", "Didáctica de la Geometría (Plan de Transición)"],
  ["matematica-estadistica", "matematicas", "Didáctica de la Estadística y Probabilidad (Plan de Transición)"],

  ["quimica", "quimica", "Didáctica de la Química"],
  ["quimica", "quimica", "Mediaciones Tecnológicas en la Química"],
  ["quimica", "quimica", "Didáctica de la Química II (Plan de Transición)"],
  ["quimica", "quimica", "Creación de Prototipos Tecnológicos Químicos (Plan de Transición)"],

  ["ciencias-biologicas", "ciencias-naturales", "Didáctica de la Biología"],
  ["ciencias-biologicas", "ciencias-naturales", "Didáctica de la Educación Ambiental"],
  ["quimica", "ciencias-naturales", "Didáctica de la Química"],
  ["fisica", "ciencias-naturales", "Didáctica de la Física"],

  ["matematica-estadistica", "educacion-campesina-rural", "Didáctica de la Matemática (Plan de Transición)"],
  ["ciencias-biologicas", "educacion-campesina-rural", "Didáctica de las Ciencias Naturales (Plan de Transición)"],

  ["ciencias-biologicas", "educacion-infantil", "Didácticas de las Ciencias"],
  ["matematica-estadistica", "educacion-infantil", "Didáctica de las Matemáticas"],
];

const { normalizarTexto } = require("./lib_excel.cjs");

/** Mapa docId ("programaId__asignatura-normalizada") -> {departamentoId, nombreDepartamento}. */
function construirMapaAsignacion() {
  const porId = new Map(DEPARTAMENTOS.map((d) => [d.departamentoId, d.nombre]));
  const mapa = new Map();
  for (const [departamentoId, programaId, nombreAsignatura] of ASIGNACIONES) {
    const docId = `${programaId}__${normalizarTexto(nombreAsignatura)}`;
    mapa.set(docId, { departamentoId, nombreDepartamento: porId.get(departamentoId) });
  }
  return mapa;
}

module.exports = { DEPARTAMENTOS, ASIGNACIONES, construirMapaAsignacion };
