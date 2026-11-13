import * as XLSX from "xlsx";
import ExcelJS from "exceljs";
import { listarComponentes, partirCompetencia } from "./constantes.js";

// ─── Helpers oferta (exceljs) ──────────────────────────────────────────────────

const C_NAVY    = "FF0F1B4C"; // institucional-navy
const C_WHITE   = "FFFFFFFF";
const C_AMBER   = "FFFFFBEB"; // amber-50  → por definir
const C_SLATE   = "FFF1F5F9"; // slate-100 → sin ofertar
const C_EMERALD = "FFF0FDF4"; // emerald-50 → con grupos
const C_TEXT    = "FF1E293B"; // slate-800
const C_MUTED   = "FF64748B"; // slate-500 (sin ofertar)

function bgOferta(grupos) {
  if (grupos == null) return C_AMBER;
  if (grupos === 0) return C_SLATE;
  return C_EMERALD;
}

function textoGruposXlsx(grupos) {
  if (grupos == null) return "Por definir";
  if (grupos === 0) return "SIN OFERTAR";
  return grupos === 1 ? "1 grupo" : `${grupos} grupos`;
}

function estilizarEncabezado(row) {
  row.height = 30;
  row.eachCell((cell) => {
    cell.fill   = { type: "pattern", pattern: "solid", fgColor: { argb: C_NAVY } };
    cell.font   = { bold: true, color: { argb: C_WHITE }, size: 11, name: "Calibri" };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = { bottom: { style: "thin", color: { argb: "FF334155" } } };
  });
}

function estilizarFila(row, grupos) {
  const bg   = bgOferta(grupos);
  const text = grupos === 0 ? C_MUTED : C_TEXT;
  row.height = 18;
  row.eachCell({ includeEmpty: true }, (cell) => {
    cell.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
    cell.font      = { color: { argb: text }, size: 10, name: "Calibri" };
    cell.alignment = { vertical: "middle", wrapText: true };
  });
}

function colsOferta(sheet) {
  sheet.columns = [
    { key: "programa",   width: 36 },
    { key: "plan",       width: 46 },
    { key: "asignatura", width: 46 },
    { key: "creditos",   width: 10 },
    { key: "componente", width: 32 },
    { key: "grupos",     width: 16 },
  ];
}

async function bajarWorkbook(wb, nombre) {
  const buf  = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = nombre;
  a.click();
  URL.revokeObjectURL(url);
}

function agregarFilasOferta(sheet, nombrePrograma, filas) {
  for (const f of filas) {
    const row = sheet.addRow({
      programa:   nombrePrograma,
      plan:       `${f.plan} · ${f.acuerdo}`,
      asignatura: f.asignatura,
      creditos:   f.creditos,
      componente: f.componente,
      grupos:     textoGruposXlsx(f.grupos),
    });
    estilizarFila(row, f.grupos);
    // centrar créditos y grupos
    row.getCell("creditos").alignment = { horizontal: "center", vertical: "middle" };
    row.getCell("grupos").alignment   = { horizontal: "center", vertical: "middle" };
  }
}

/**
 * Descarga un Excel con la oferta de UN programa (una sola hoja).
 */
export async function exportarExcelOfertaPrograma(nombrePrograma, filas, nombreArchivo) {
  const wb    = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet("Oferta 2027-I");
  colsOferta(sheet);
  const enc = sheet.addRow(["Programa", "Plan / Acuerdo", "Asignatura", "Créditos", "Componente", "Grupos 2027-I"]);
  estilizarEncabezado(enc);
  enc.getCell(4).alignment = { horizontal: "center", vertical: "middle" };
  enc.getCell(6).alignment = { horizontal: "center", vertical: "middle" };
  agregarFilasOferta(sheet, nombrePrograma, filas);
  await bajarWorkbook(wb, nombreArchivo);
}

/**
 * Descarga un Excel con la oferta de TODOS los programas: una hoja por programa
 * más una hoja resumen con totales.
 */
export async function exportarExcelOfertaCompleta(programas, nombreArchivo) {
  const wb = new ExcelJS.Workbook();

  for (const p of programas) {
    const nombre = p.nombre.replace("Licenciatura en ", "Lic. ").replace(/[/\\?*[\]]/g, "").slice(0, 31);
    const sheet  = wb.addWorksheet(nombre);
    colsOferta(sheet);
    const enc = sheet.addRow(["Programa", "Plan / Acuerdo", "Asignatura", "Créditos", "Componente", "Grupos 2027-I"]);
    estilizarEncabezado(enc);
    enc.getCell(4).alignment = { horizontal: "center", vertical: "middle" };
    enc.getCell(6).alignment = { horizontal: "center", vertical: "middle" };
    agregarFilasOferta(sheet, p.nombre, p.filas);
  }

  // Hoja resumen
  const resumen = wb.addWorksheet("Resumen");
  resumen.columns = [
    { key: "programa",  width: 46 },
    { key: "total",     width: 18 },
    { key: "definidas", width: 13 },
    { key: "oferta",    width: 13 },
    { key: "grupos",    width: 15 },
    { key: "sinOfer",   width: 13 },
    { key: "pendientes",width: 13 },
    { key: "avance",    width: 13 },
  ];
  const encRes = resumen.addRow(["Programa", "Total asignaturas", "Definidas", "Con oferta", "Grupos totales", "Sin ofertar", "Por definir", "Avance (%)"]);
  estilizarEncabezado(encRes);
  for (const p of programas) {
    const total     = p.filas.length;
    const definidas = p.filas.filter((f) => f.grupos != null).length;
    const conOferta = p.filas.filter((f) => f.grupos != null && f.grupos > 0).length;
    const grupos    = p.filas.reduce((s, f) => s + (f.grupos > 0 ? f.grupos : 0), 0);
    const sinOfer   = p.filas.filter((f) => f.grupos === 0).length;
    const pct       = total ? Math.round((definidas / total) * 100) : 0;
    const row = resumen.addRow({
      programa: p.nombre, total, definidas, oferta: conOferta,
      grupos, sinOfer, pendientes: total - definidas, avance: `${pct}%`,
    });
    const bg = pct === 100 ? C_EMERALD : pct > 0 ? C_AMBER : C_SLATE;
    row.height = 18;
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
      cell.font      = { color: { argb: C_TEXT }, size: 10, name: "Calibri" };
      cell.alignment = { vertical: "middle" };
    });
    row.getCell(1).alignment = { vertical: "middle", wrapText: true };
  }

  await bajarWorkbook(wb, nombreArchivo);
}

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

