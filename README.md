# Perfiles Docentes · Departamento de Pedagogía

Aplicativo web para revisar (aprobar o sugerir cambios) los perfiles
docentes de las asignaturas de los 10 programas, desde varios roles —
director de programa, departamento, decano — y para que el Director de
Departamento de Pedagogía valide esas sugerencias y descargue consolidados
en PDF y Excel.

- **Frontend:** React + Vite + Tailwind CSS (con modo nocturno)
- **Backend:** Firebase (Authentication + Firestore), plan gratuito Spark
- **Hosting:** GitHub Pages
- **Datos de origen:** `data/tabla_resultado.xlsx` (perfiles docentes de los 10 programas)

## 0. Qué necesitas tener instalado

- [Node.js](https://nodejs.org) 20 o superior (incluye `npm`)
- Una cuenta de Google para crear el proyecto de Firebase

## 1. Instalar dependencias

```bash
npm install
```

## 2. Crear el proyecto de Firebase

1. Entra a [console.firebase.google.com](https://console.firebase.google.com) y crea un proyecto nuevo (gratis, plan Spark).
2. **Authentication** → pestaña "Sign-in method" → habilita **Correo electrónico/contraseña**.
3. **Firestore Database** → "Crear base de datos" → modo producción → elige la región más cercana (p. ej. `us-central` o `southamerica-east1`).
4. **Configuración del proyecto** (ícono de engranaje) → pestaña "General" → sección "Tus apps" → añade una app **Web** (ícono `</>`). Copia el objeto `firebaseConfig` que te muestra.
5. Crea el archivo `.env.local` en la raíz del proyecto (copia `.env.example`) y pega esos valores:

   ```bash
   cp .env.example .env.local
   ```

   Completa las 6 variables con lo que copiaste en el paso 4. **Estos valores no son secretos** — Firebase los expone en el navegador por diseño; la seguridad real la dan las reglas de Firestore (`firestore.rules`).

6. **Configuración del proyecto** → pestaña "Cuentas de servicio" → "Generar nueva clave privada". Se descarga un `.json`: renómbralo a `serviceAccountKey.json` y colócalo en la raíz del proyecto. **Este sí es secreto** — el `.gitignore` ya lo excluye de git, no lo subas a ningún lado.

## 3. Publicar las reglas de seguridad de Firestore

En Firebase Console → Firestore Database → pestaña "Reglas", pega el contenido de [`firestore.rules`](./firestore.rules) y publica. (También puedes hacerlo con la CLI de Firebase si la instalas: `firebase deploy --only firestore:rules`.)

> **Si ya tenías el proyecto funcionando y este archivo cambió** (por
> ejemplo, al agregar los roles de departamento y decano), tienes que
> volver a publicar las reglas en Firebase Console — si no, las cuentas
> nuevas reciben "Missing or insufficient permissions" al intentar leer las
> asignaturas, aunque el usuario y la contraseña sean correctos.

## 4. Cargar los datos iniciales (usuarios + asignaturas)

```bash
npm run seed
```

Esto, usando `scripts/credenciales.json` (ya generado, con los 10 usuarios de directores + 1 de administrador) y `data/tabla_resultado.xlsx`:

- crea los 11 usuarios en Firebase Authentication,
- crea el catálogo de 10 programas en Firestore,
- carga las ~240 asignaturas con sus 4 componentes cada una.

Es seguro volver a ejecutarlo: si una asignatura ya existe, solo actualiza su
nombre/orden y **nunca borra** aprobaciones o sugerencias ya guardadas por un
director o el administrador.

## 5. Probar en local

```bash
npm run dev
```

Abre la URL que te indique (normalmente `http://localhost:5173`) e inicia
sesión con cualquiera de los usuarios de `scripts/credenciales.json`.

## 6. Publicar en GitHub Pages

El repositorio ya incluye un flujo de GitHub Actions
(`.github/workflows/deploy.yml`) que compila y publica automáticamente cada
vez que subes cambios a la rama `main`.

1. En tu repositorio de GitHub: **Settings → Pages → Build and deployment →
   Source** → elige **GitHub Actions**.
2. **Settings → Secrets and variables → Actions → New repository secret** y
   crea estos 6 secretos con los mismos valores de tu `.env.local`:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
3. Sube el proyecto a tu repositorio:

   ```bash
   git init
   git add .
   git commit -m "Aplicativo de perfiles docentes"
   git branch -M main
   git remote add origin <URL-de-tu-repositorio>
   git push -u origin main
   ```

4. En la pestaña **Actions** de GitHub verás el flujo "Publicar en GitHub
   Pages" ejecutándose; cuando termine, la URL pública aparece en
   **Settings → Pages**.

> El `serviceAccountKey.json` y `scripts/credenciales.json` **nunca se suben**
> (están en `.gitignore`): el primero por ser una credencial de
> administrador de Firebase, el segundo por contener las contraseñas de los
> 11 usuarios.

## Las credenciales de acceso

Te las entregué aparte, en un archivo que **no está en este repositorio**
(`scripts/credenciales.json`, y una copia que te envié directamente). Repártelas
de forma segura a cada director de programa y al administrador — idealmente
pidiéndoles que cambien la contraseña la primera vez que entren (Firebase
Authentication permite esto desde la consola o añadiendo esa función más
adelante si la necesitas).

## Cómo funciona

Cada asignatura tiene varios componentes (Formación de pregrado, Formación
posgradual, Experiencia docente y profesional, Competencias, Criterio de
idoneidad). Desde la versión con **departamentos** y **decano**, cada
componente puede recibir una revisión **independiente** de hasta tres
fuentes (todas llegan igual al Director de Departamento para su
aprobación):

- **Director de programa:** ve solo las asignaturas de su propio programa.
  Aprueba cada componente o lo manda a **Modificar** (abre un cuadro de
  texto obligatorio). Puede descargar un PDF con las asignaturas que tengan
  algún componente marcado para modificar.
- **Departamento** (p. ej. Matemática y Estadística, Química, Física,
  Ciencias Biológicas): ve solo las asignaturas que tiene asignadas, que
  pueden pertenecer a varios programas (ver
  `scripts/datos_departamentos.cjs`). Revisa igual que un director: Aprobar
  o Modificar, de forma independiente a la revisión del director de ese
  programa.
- **Decano de la Facultad de Educación:** ve y revisa **todas** las
  asignaturas de los 10 programas, con filtro por programa y buscador. Su
  revisión también es independiente de la del director y del departamento.
- **Director de Departamento (administrador):** en cada asignatura, un
  selector **"Ver componente"** le permite ubicarse en uno concreto (p. ej.
  Formación de pregrado) y ver ahí mismo la revisión de cada fuente
  aplicable (Director de programa / Departamento si existe / Decano), con
  botones para **Aprobar modificación** o **Rechazar** cada una por
  separado, y un botón para **editar el texto** del componente. Descarga el
  consolidado completo (todos los programas, con la columna "Origen" que
  dice de qué revisor vino cada sugerencia) en PDF y en Excel.
- **Modo nocturno:** botón en la barra superior, se recuerda entre sesiones.

### Quién revisa qué asignatura

La asignación de asignaturas a departamentos vive en
[`scripts/datos_departamentos.cjs`](./scripts/datos_departamentos.cjs)
(generada a partir de una hoja de Excel que entregó el Departamento). Para
cambiarla, edita ese archivo y vuelve a correr `npm run seed` (no borra
revisiones ya hechas).

## Estructura del proyecto

```
├── data/
│   ├── tabla_resultado.xlsx          # datos de origen (perfiles docentes)
│   └── distribucion_departamentos.xlsx  # de dónde sale datos_departamentos.cjs
├── scripts/
│   ├── credenciales.json             # (no en git) usuarios y contraseñas generados
│   ├── datos_departamentos.cjs       # qué asignaturas quedan en cada departamento
│   ├── generar_credenciales.cjs      # genera credenciales.json
│   ├── seed.cjs                       # carga inicial / migración a Firebase
│   └── sincronizar_textos.cjs        # actualiza solo los textos desde el Excel
├── src/
│   ├── context/                       # autenticación y tema (modo nocturno)
│   ├── pages/                         # Login, DirectorDashboard, DepartamentoDashboard,
│   │                                    DecanoDashboard, AdminDashboard
│   ├── components/                     # piezas de UI reutilizables
│   ├── services/                       # lectura/escritura en Firestore
│   └── utils/                          # exportar PDF/Excel, constantes
└── firestore.rules                     # reglas de seguridad
```

## Nota sobre las reglas de seguridad

`firestore.rules` es una base razonable para 11 usuarios conocidos (cada
director solo puede tocar los campos de revisión de su propio programa; el
resto de datos son de solo lectura o de solo administrador). No se sometió a
una auditoría de seguridad independiente — antes de considerarla definitiva,
pruébala en el "Rules Playground" de Firebase Console con distintos
usuarios y escenarios.
