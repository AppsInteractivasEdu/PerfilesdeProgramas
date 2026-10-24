import * as XLSX from "xlsx";
import { listarComponentes, partirCompetencia } from "./constantes.js";

function descargarLibro(libro, nombreArchivo) {
  XLSX.writeFile(libro, nombreArchivo);
}

/** Reporte de un director: solo asignaturas con al menos un componente en "modificar". */
export function exportarExcelDirector(nombrePrograma, filas, nombreArchivo) {
  const hoja = XLSX.utils.json_to_sheet(
    filas.map((f) => ({
      Programa: nombrePrograma,
      Asignatura: f.asignatura,
      Componente: f.componente,
      "Comentario del director": f.comentario,
    }))
  );
  hoja["!cols"] = [{ wch: 28 }, { wch: 40 }, { wch: 28 }, { wch: 60 }];
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, "Sugerencias");
  descargarLibro(libro, nombreArchivo);
}

/**
 * Consolidado completo de UN programa, para el Director de Departamento:
 * una fila por cada componente de cada asignatura, con su texto actual
 * (incluido el criterio integral de idoneidad), sin importar si tuvo o no
 * solicitudes de modificación.
 */
export function exportarExcelPerfilPrograma(nombrePrograma, asignaturas, nombreArchivo) {
  const filas = [];
  for (const a of asignaturas) {
    for (const { clave, etiqueta, tipo } of listarComponentes(a.componentes)) {
      const valor = a.componentes?.[clave]?.valor || "";
      const [nombreComp, descripcion] = tipo === "competencia" ? partirCompetencia(valor) : [etiqueta, valor];
      filas.push({
        Programa: nombrePrograma,
        Asignatura: a.nombre,
        Componente: tipo === "competencia" ? nombreComp : etiqueta,
        Contenido: tipo === "competencia" ? descripcion : valor,
      });
    }
  }
  const hoja = XLSX.utils.json_to_sheet(filas);
  hoja["!cols"] = [{ wch: 28 }, { wch: 40 }, { wch: 32 }, { wch: 90 }];
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, "Perfil completo");
  descargarLibro(libro, nombreArchivo);
}

