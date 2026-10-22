import * as XLSX from "xlsx";

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

/** Consolidado del administrador: todas las solicitudes revisadas, con su resolución. */
export function exportarExcelAdmin(filas, nombreArchivo) {
  const hoja = XLSX.utils.json_to_sheet(
    filas.map((f) => ({
      Programa: f.programa,
      Asignatura: f.asignatura,
      Componente: f.componente,
      "Comentario del director": f.comentarioDirector,
      Estado: f.estadoAdmin,
      "Comentario del Director de Departamento": f.comentarioAdmin || "",
    }))
  );
  hoja["!cols"] = [
    { wch: 28 },
    { wch: 40 },
    { wch: 28 },
    { wch: 50 },
    { wch: 14 },
    { wch: 50 },
  ];
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, "Consolidado");
  descargarLibro(libro, nombreArchivo);
}

