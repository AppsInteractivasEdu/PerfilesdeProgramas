/** Convierte un Timestamp de Firestore (o fecha) en un texto relativo en español. */
export function formatearUltimaConexion(valor) {
  if (!valor) return "Nunca ha iniciado sesión";
  const fecha = typeof valor?.toDate === "function" ? valor.toDate() : new Date(valor);
  if (Number.isNaN(fecha.getTime())) return "Nunca ha iniciado sesión";

  const diffMs = Date.now() - fecha.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "Hace un momento";
  if (diffMin < 60) return `Hace ${diffMin} min`;

  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `Hace ${diffH} h`;

  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return "Ayer";
  if (diffD < 30) return `Hace ${diffD} días`;

  return fecha.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
}
