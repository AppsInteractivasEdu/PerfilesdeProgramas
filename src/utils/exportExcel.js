import * as XLSX from "xlsx";
import { listarComponentes, partirCompetencia } from "./constantes.js";

// ─── Helpers oferta ────────────────────────────────────────────────────────────

function textoGrupos(grupos) {
  if (grupos == null) return "Por definir";
  if (grupos === 0) return "SIN OFERTAR";
  return grupos === 1 ? "1 grupo" : `${grupos} grupos`;
}

/**
 * Convierte una lista plana de filas de oferta en un array de objetos para XLSX.
 * filas: [{ acuerdo, plan, asignatura, creditos, componente, grupos }]
 */
function filasOfertaAObjetos(nombrePrograma, filas) {
  return filas.map((f) => ({
    Programa: nombrePrograma,
    "Plan / Acuerdo": `${f.plan} · ${f.acuerdo}`,
    Asignatura: f.asignatura,
    "Créditos": f.creditos,
    Componente: f.componente,
    "Grupos 2027-I": textoGrupos(f.grupos),
  }));
}

/**
 * Descarga un Excel con la oferta de UN programa (una sola hoja).
 * filas: las filas de ofertas2027I de ese programa (grupos ya guardados).
 */
export function exportarExcelOfertaPrograma(nombrePrograma, filas, nombreArchivo) {
  const datos = filasOfertaAObjetos(nombrePrograma, filas);
  const hoja = XLSX.utils.json_to_sheet(datos);
  hoja["!cols"] = [{ wch: 36 }, { wch: 44 }, { wch: 44 }, { wch: 9 }, { wch: 32 }, { wch: 16 }];
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, "Oferta 2027-I");
  descargarLibro(libro, nombreArchivo);
}

/**
 * Descarga un Excel con la oferta de TODOS los programas: una hoja por programa
 * más una hoja resumen con totales.
 * programas: [{ nombre, filas: [...filas de ofertas2027I] }]
 */
export function exportarExcelOfertaCompleta(programas, nombreArchivo) {
  const libro = XLSX.utils.book_new();

  // Una hoja por programa
  for (const p of programas) {
    const datos = filasOfertaAObjetos(p.nombre, p.filas);
    const hoja = XLSX.utils.json_to_sheet(datos);
    hoja["!cols"] = [{ wch: 36 }, { wch: 44 }, { wch: 44 }, { wch: 9 }, { wch: 32 }, { wch: 16 }];
    // Nombre de hoja: hasta 31 caracteres, sin / \ ? * [ ]
    const nombreHoja = p.nombre.replace("Licenciatura en ", "Lic. ").replace(/[/\\?*[\]]/g, "").slice(0, 31);
    XLSX.utils.book_append_sheet(libro, hoja, nombreHoja);
  }

  // Hoja resumen
  const resumen = programas.map((p) => {
    const total = p.filas.length;
    const definidas = p.filas.filter((f) => f.grupos != null).length;
    const conOferta = p.filas.filter((f) => f.grupos != null && f.grupos > 0).length;
    const grupos = p.filas.reduce((s, f) => s + (f.grupos > 0 ? f.grupos : 0), 0);
    const sinOfertar = p.filas.filter((f) => f.grupos === 0).length;
    return {
      Programa: p.nombre,
      "Total asignaturas": total,
      "Definidas": definidas,
      "Con oferta": conOferta,
      "Grupos totales": grupos,
      "Sin ofertar": sinOfertar,
      "Por definir": total - definidas,
      "Avance (%)": total ? Math.round((definidas / total) * 100) + "%" : "0%",
    };
  });
  const hojaResumen = XLSX.utils.json_to_sheet(resumen);
  hojaResumen["!cols"] = [{ wch: 44 }, { wch: 18 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(libro, hojaResumen, "Resumen");

  descargarLibro(libro, nombreArchivo);
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

