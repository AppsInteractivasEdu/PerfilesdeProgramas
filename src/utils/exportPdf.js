import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { listarComponentes, partirCompetencia } from "./constantes.js";

// ─── Helpers oferta ────────────────────────────────────────────────────────────

function textoGruposOferta(grupos) {
  if (grupos == null) return "Por definir";
  if (grupos === 0) return "SIN OFERTAR";
  return grupos === 1 ? "1 grupo" : `${grupos} grupos`;
}

function colorFila(grupos) {
  if (grupos == null) return [255, 251, 235]; // amber-50
  if (grupos === 0) return [241, 245, 249]; // slate-100
  return [240, 253, 244]; // emerald-50
}

/**
 * Genera las filas de la tabla de oferta, agrupando por plan/acuerdo.
 * Retorna { secciones: [{acuerdo, plan, filas}] }
 */
function agruparOferta(filas) {
  const mapa = new Map();
  for (const f of filas) {
    const k = `${f.plan}|${f.acuerdo}`;
    if (!mapa.has(k)) mapa.set(k, { plan: f.plan, acuerdo: f.acuerdo, filas: [] });
    mapa.get(k).filas.push(f);
  }
  return [...mapa.values()];
}

/**
 * Descarga un PDF con la oferta de UN programa (tabla con plan/acuerdo como sub-cabecera).
 * filas: las filas de ofertas2027I del programa.
 */
export function exportarPdfOfertaPrograma(nombrePrograma, filas, nombreArchivo) {
  const doc = new jsPDF({ unit: "pt", orientation: "landscape" });
  encabezado(doc, `Oferta de grupos 2027-I · ${nombrePrograma}`, `Generado: ${new Date().toLocaleString("es-CO")}`);

  const secciones = agruparOferta(filas);
  let startY = 95;

  for (const s of secciones) {
    // sub-cabecera de acuerdo
    doc.setFontSize(9);
    doc.setFont(undefined, "bold");
    doc.setTextColor(255, 255, 255);
    doc.setFillColor(15, 27, 76);
    const pageW = doc.internal.pageSize.getWidth();
    doc.rect(40, startY, pageW - 80, 18, "F");
    doc.text(`${s.plan.toUpperCase()} · ${s.acuerdo}`, 46, startY + 12.5);
    startY += 20;

    autoTable(doc, {
      startY,
      head: [["Asignatura", "Créditos", "Componente", "Grupos 2027-I"]],
      body: s.filas.map((f) => [f.asignatura, f.creditos, f.componente, textoGruposOferta(f.grupos)]),
      styles: { fontSize: 8, cellPadding: 4, valign: "middle" },
      headStyles: { fillColor: [30, 41, 59], textColor: 255, fontSize: 8 },
      columnStyles: {
        0: { cellWidth: "auto" },
        1: { cellWidth: 55, halign: "center" },
        2: { cellWidth: 160 },
        3: { cellWidth: 90, halign: "center" },
      },
      bodyStyles: { textColor: [30, 41, 59] },
      didParseCell: (data) => {
        if (data.section === "body") {
          const grupos = s.filas[data.row.index]?.grupos;
          const [r, g, b] = colorFila(grupos);
          data.cell.styles.fillColor = [r, g, b];
          if (grupos === 0) data.cell.styles.textColor = [100, 116, 139];
        }
      },
    });
    startY = doc.lastAutoTable.finalY + 14;
    if (startY > doc.internal.pageSize.getHeight() - 60) { doc.addPage(); startY = 50; }
  }

  doc.save(nombreArchivo);
}

/**
 * Descarga un PDF con la oferta de TODOS los programas.
 * programas: [{ nombre, filas: [...] }]
 */
export function exportarPdfOfertaCompleta(programas, nombreArchivo) {
  const doc = new jsPDF({ unit: "pt", orientation: "landscape" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  // Portada / resumen
  encabezado(doc, "Oferta de grupos 2027-I · todos los programas", `Generado: ${new Date().toLocaleString("es-CO")}`);

  // Tabla resumen en portada
  const resumenBody = programas.map((p) => {
    const total = p.filas.length;
    const definidas = p.filas.filter((f) => f.grupos != null).length;
    const grupos = p.filas.reduce((s, f) => s + (f.grupos > 0 ? f.grupos : 0), 0);
    return [p.nombre, total, definidas, grupos, total - definidas,
      total ? `${Math.round((definidas / total) * 100)}%` : "0%"];
  });
  autoTable(doc, {
    startY: 95,
    head: [["Programa", "Total", "Definidas", "Grupos", "Por definir", "Avance"]],
    body: resumenBody,
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [15, 27, 76], textColor: 255 },
    columnStyles: { 0: { cellWidth: "auto" }, 1: { cellWidth: 55, halign: "center" }, 2: { cellWidth: 65, halign: "center" }, 3: { cellWidth: 55, halign: "center" }, 4: { cellWidth: 65, halign: "center" }, 5: { cellWidth: 55, halign: "center" } },
  });

  // Una sección por programa
  for (const p of programas) {
    doc.addPage();
    let y = 50;
    doc.setFontSize(13);
    doc.setFont(undefined, "bold");
    doc.setTextColor(15, 27, 76);
    doc.text(p.nombre, 40, y);
    y += 20;

    for (const s of agruparOferta(p.filas)) {
      doc.setFontSize(9);
      doc.setFont(undefined, "bold");
      doc.setTextColor(255);
      doc.setFillColor(15, 27, 76);
      doc.rect(40, y, pageW - 80, 18, "F");
      doc.text(`${s.plan.toUpperCase()} · ${s.acuerdo}`, 46, y + 12.5);
      y += 20;

      autoTable(doc, {
        startY: y,
        head: [["Asignatura", "Créditos", "Componente", "Grupos 2027-I"]],
        body: s.filas.map((f) => [f.asignatura, f.creditos, f.componente, textoGruposOferta(f.grupos)]),
        styles: { fontSize: 7.5, cellPadding: 3.5, valign: "middle" },
        headStyles: { fillColor: [30, 41, 59], textColor: 255 },
        columnStyles: { 0: { cellWidth: "auto" }, 1: { cellWidth: 50, halign: "center" }, 2: { cellWidth: 155 }, 3: { cellWidth: 85, halign: "center" } },
        didParseCell: (data) => {
          if (data.section === "body") {
            const grupos = s.filas[data.row.index]?.grupos;
            const [r, g, b] = colorFila(grupos);
            data.cell.styles.fillColor = [r, g, b];
            if (grupos === 0) data.cell.styles.textColor = [100, 116, 139];
          }
        },
      });
      y = doc.lastAutoTable.finalY + 12;
      if (y > pageH - 60) { doc.addPage(); y = 50; }
    }
  }

  doc.save(nombreArchivo);
}

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

