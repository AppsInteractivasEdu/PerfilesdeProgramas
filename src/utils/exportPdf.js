import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

function encabezado(documento, titulo, subtitulo) {
  documento.setFontSize(14);
  documento.setTextColor(15, 27, 76); // institucional-navy
  documento.text(titulo, 40, 45);
  documento.setFontSize(10);
  documento.setTextColor(100);
  documento.text(subtitulo, 40, 62);
  documento.text(`Generado: ${new Date().toLocaleString("es-CO")}`, 40, 76);
}

/** Reporte de un director: solo asignaturas con al menos un componente en "modificar". */
export function exportarPdfDirector(nombrePrograma, filas, nombreArchivo) {
  const documento = new jsPDF({ unit: "pt" });
  encabezado(
    documento,
    "Sugerencias de modificación de perfiles docentes",
    `Programa: ${nombrePrograma}`
  );

  autoTable(documento, {
    startY: 95,
    head: [["Asignatura", "Componente", "Comentario del director"]],
    body: filas.map((f) => [f.asignatura, f.componente, f.comentario]),
    styles: { fontSize: 9, cellPadding: 6, valign: "top" },
    headStyles: { fillColor: [15, 27, 76], textColor: 255 },
    columnStyles: {
      0: { cellWidth: 140 },
      1: { cellWidth: 110 },
      2: { cellWidth: "auto" },
    },
  });

  documento.save(nombreArchivo);
}

/** Consolidado del administrador: todas las solicitudes revisadas, con su resolución. */
export function exportarPdfAdmin(filas, nombreArchivo) {
  const documento = new jsPDF({ unit: "pt", orientation: "landscape" });
  encabezado(
    documento,
    "Consolidado de modificaciones a perfiles docentes",
    "Todos los programas"
  );

  autoTable(documento, {
    startY: 95,
    head: [
      [
        "Programa",
        "Asignatura",
        "Componente",
        "Origen",
        "Comentario",
        "Estado",
        "Comentario del Director de Departamento",
      ],
    ],
    body: filas.map((f) => [
      f.programa,
      f.asignatura,
      f.componente,
      f.origen || "Director de programa",
      f.comentarioDirector,
      f.estadoAdmin,
      f.comentarioAdmin || "—",
    ]),
    styles: { fontSize: 8, cellPadding: 5, valign: "top" },
    headStyles: { fillColor: [15, 27, 76], textColor: 255 },
    columnStyles: {
      0: { cellWidth: 85 },
      1: { cellWidth: 115 },
      2: { cellWidth: 80 },
      3: { cellWidth: 65 },
      4: { cellWidth: "auto" },
      5: { cellWidth: 50 },
      6: { cellWidth: "auto" },
    },
  });

  documento.save(nombreArchivo);
}

