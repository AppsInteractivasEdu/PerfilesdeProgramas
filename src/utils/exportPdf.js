import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { listarComponentes, partirCompetencia } from "./constantes.js";

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

/**
 * Consolidado completo de UN programa, para el Director de Departamento:
 * cada asignatura con el texto actual (ya editado si aplica) de todos sus
 * componentes, incluido el criterio integral de idoneidad. No depende de si
 * hubo o no solicitudes de modificación — un componente sin ninguna
 * revisión se muestra tal cual está.
 */
export function exportarPdfPerfilPrograma(nombrePrograma, asignaturas, nombreArchivo) {
  const documento = new jsPDF({ unit: "pt" });
  const margenX = 40;
  const anchoUtil = documento.internal.pageSize.getWidth() - margenX * 2;
  const altoPagina = documento.internal.pageSize.getHeight();
  let y = 0;

  function asegurarEspacio(alto) {
    if (y + alto > altoPagina - 40) {
      documento.addPage();
      y = 50;
    }
  }

  function escribir(texto, { fontSize = 9, bold = false, color = [51, 65, 85], espacioDespues = 10 } = {}) {
    documento.setFont(undefined, bold ? "bold" : "normal");
    documento.setFontSize(fontSize);
    documento.setTextColor(...color);
    const lineas = documento.splitTextToSize(texto || "—", anchoUtil);
    const alto = lineas.length * (fontSize + 3);
    asegurarEspacio(alto);
    documento.text(lineas, margenX, y);
    y += alto + espacioDespues;
  }

  encabezado(documento, "Consolidado completo de perfiles docentes", `Programa: ${nombrePrograma}`);
  y = 100;

  for (const a of asignaturas) {
    asegurarEspacio(26);
    escribir(`Asignatura: ${a.nombre}`, { fontSize: 13, bold: true, color: [15, 27, 76], espacioDespues: 6 });

    for (const { clave, etiqueta, tipo } of listarComponentes(a.componentes)) {
      const valor = a.componentes?.[clave]?.valor || "";
      const [nombreComp, descripcion] = tipo === "competencia" ? partirCompetencia(valor) : [etiqueta, valor];
      escribir(tipo === "competencia" ? nombreComp : etiqueta, { fontSize: 10, bold: true, color: [30, 41, 59], espacioDespues: 2 });
      escribir(tipo === "competencia" ? descripcion : valor, { fontSize: 9, espacioDespues: 10 });
    }
    y += 10;
  }

  documento.save(nombreArchivo);
}

