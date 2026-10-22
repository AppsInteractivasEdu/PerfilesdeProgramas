/**
 * Lectura de data/tabla_resultado.xlsx guiada por los encabezados de la fila 1:
 *   A programa | B asignatura | C pregrado | D posgradual | E experiencia |
 *   "Competencia 1..N" | "Criterio integral de idoneidad"
 * Devuelve, por fila, un objeto { clave: texto } con las claves
 * pregrado, posgradual, experiencia, comp1..compN, idoneidad.
 */
const XLSX = require("xlsx");

function normalizarTexto(texto) {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function celda(hoja, fila, col) {
  const valor = hoja[XLSX.utils.encode_cell({ r: fila, c: col })]?.v;
  return typeof valor === "string" ? valor.trim() : valor ?? "";
}

function mapearColumnas(hoja, rango) {
  const cols = { programa: 0, asignatura: 1, pregrado: 2, posgradual: 3, experiencia: 4, competencias: [], idoneidad: null };
  for (let c = 5; c <= rango.e.c; c++) {
    const titulo = String(celda(hoja, rango.s.r, c));
    const m = titulo.match(/^Competencia\s+(\d+)$/i);
    if (m) cols.competencias.push({ clave: `comp${m[1]}`, col: c });
    else if (/idoneidad/i.test(titulo)) cols.idoneidad = c;
  }
  return cols;
}

function leerAsignaturas(libro) {
  const filas = [];
  for (const nombreHoja of libro.SheetNames) {
    const hoja = libro.Sheets[nombreHoja];
    const rango = XLSX.utils.decode_range(hoja["!ref"]);
    const cols = mapearColumnas(hoja, rango);
    for (let fila = rango.s.r + 1; fila <= rango.e.r; fila++) {
      const nombrePrograma = celda(hoja, fila, cols.programa);
      const nombreAsignatura = celda(hoja, fila, cols.asignatura);
      if (!nombrePrograma || !nombreAsignatura) continue;
      const componentes = {
        pregrado: celda(hoja, fila, cols.pregrado),
        posgradual: celda(hoja, fila, cols.posgradual),
        experiencia: celda(hoja, fila, cols.experiencia),
      };
      for (const { clave, col } of cols.competencias) {
        const v = celda(hoja, fila, col);
        if (v) componentes[clave] = v;
      }
      if (cols.idoneidad !== null) componentes.idoneidad = celda(hoja, fila, cols.idoneidad);
      filas.push({ nombreHoja, fila, nombrePrograma, nombreAsignatura, componentes });
    }
  }
  return filas;
}

function componenteNuevo(valor) {
  return {
    valor: valor || "",
    estadoDirector: "pendiente",
    comentarioDirector: "",
    fechaDirector: null,
    estadoAdmin: "pendiente",
    comentarioAdmin: "",
    fechaAdmin: null,
  };
}

module.exports = { leerAsignaturas, componenteNuevo, normalizarTexto };
