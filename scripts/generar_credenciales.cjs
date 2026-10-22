// Genera scripts/credenciales.json con el esquema de correos/contraseñas
// pedido por el usuario: director.<programa>@unimagdalena.app con contraseña
// "<usuario-antes-de-la-arroba>2026"; admin: adminpedagogia@unimagdalena.app.
const fs = require("fs");
const path = require("path");

const PROGRAMAS = [
  ["Licenciatura en Etnoeducación", "etnoeducacion"],
  ["Licenciatura en Matemáticas", "matematicas"],
  ["Licenciatura en Química", "quimica"],
  ["Licenciatura en Ciencias Naturales y Educación Ambiental", "ciencias-naturales"],
  ["Licenciatura en Artes", "artes"],
  ["Licenciatura en Educación Campesina y Rural", "educacion-campesina-rural"],
  ["Licenciatura en Educación Infantil", "educacion-infantil"],
  ["Licenciatura en Lenguas Extranjeras con Énfasis en Inglés", "lenguas-extranjeras"],
  ["Licenciatura en Tecnología", "tecnologia"],
  ["Licenciatura en Literatura y Lengua Castellana", "literatura-lengua-castellana"],
];
const DOMINIO = "unimagdalena.app";

const credenciales = PROGRAMAS.map(([nombrePrograma, programaId]) => {
  const usuario = `director.${programaId}`;
  return {
    rol: "director",
    programaId,
    nombrePrograma,
    email: `${usuario}@${DOMINIO}`,
    password: `${usuario}2026`,
  };
});

credenciales.push({
  rol: "admin",
  programaId: null,
  nombrePrograma: null,
  email: `adminpedagogia@${DOMINIO}`,
  password: `adminpedagogia2026`,
});

fs.writeFileSync(
  path.join(__dirname, "credenciales.json"),
  JSON.stringify(credenciales, null, 2),
  "utf-8"
);
console.log(`${credenciales.length} credenciales generadas -> scripts/credenciales.json`);
