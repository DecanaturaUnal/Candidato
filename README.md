# Campaña Gustavo Osorio — Decanatura

Sitio de campaña de **Gustavo Osorio**, candidato a Decano de la Facultad de
Ingeniería y Arquitectura de la Universidad Nacional de Colombia.

Es una pieza gráfica de una sola vista —reproducción fiel del diseño aprobado— más
un muro de mensajes de la comunidad con moderación previa y un panel de
administración oculto.

---

## Índice

1. [Requisitos](#1-requisitos)
2. [Instalación desde cero](#2-instalación-desde-cero)
3. [Variables de entorno](#3-variables-de-entorno)
4. [Supabase: crear el proyecto y aplicar el esquema](#4-supabase-crear-el-proyecto-y-aplicar-el-esquema)
5. [Cloudflare Turnstile](#5-cloudflare-turnstile)
6. [Agregar y quitar moderadores](#6-agregar-y-quitar-moderadores)
7. [Cómo funciona la moderación](#7-cómo-funciona-la-moderación)
8. [Desarrollo local](#8-desarrollo-local)
9. [Verificación automatizada](#9-verificación-automatizada)
10. [Utilidades de operación (Python)](#10-utilidades-de-operación-python)
11. [Reemplazar los recursos pendientes](#11-reemplazar-los-recursos-pendientes)
12. [Subir a GitHub](#12-subir-a-github)
13. [Desplegar en Vercel](#13-desplegar-en-vercel)
14. [Seguridad](#14-seguridad)
15. [Estructura del proyecto](#15-estructura-del-proyecto)
16. [Pendientes por completar](#16-pendientes-por-completar)

---

## 1. Requisitos

| Herramienta | Versión | Para qué |
|---|---|---|
| Node.js | 20 o superior (probado en 24.19) | Ejecutar el sitio |
| Python | 3.12 | Utilidades de operación |
| Git | cualquiera reciente | Control de versiones y despliegue |

Cuentas necesarias (todas tienen plan gratuito suficiente para esta campaña):
**Supabase**, **Cloudflare** (para Turnstile), **GitHub** y **Vercel**.

En Windows, si no tiene Node ni Python:

```bash
winget install OpenJS.NodeJS.LTS
winget install Python.Python.3.12
```

Cierre y vuelva a abrir la terminal para que se actualice el `PATH`.

---

## 2. Instalación desde cero

```bash
git clone <url-del-repositorio> Decanatura
cd Decanatura
npm install
```

Cree el entorno virtual de Python para las utilidades de operación:

```bash
python -m venv scripts\venv
```

Actívelo (Windows, PowerShell):

```bash
scripts\venv\Scripts\activate
```

> Si PowerShell bloquea el script de activación, ejecute una vez:
> `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`

Instale las dependencias de Python:

```bash
pip install -r scripts\python\requirements.txt
```

Para salir del entorno virtual: `deactivate`.

---

## 3. Variables de entorno

Copie la plantilla y rellénela:

```bash
copy .env.example .env.local
```

`.env.local` está en `.gitignore` y **nunca debe subirse al repositorio**.

| Variable | Dónde se usa | Secreta |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Navegador y servidor | No |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Navegador y servidor | No (la protege la RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | **Solo servidor** | **Sí** |
| `DATABASE_URL` | Solo para aplicar migraciones | **Sí** |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Navegador | No |
| `TURNSTILE_SECRET_KEY` | **Solo servidor** | **Sí** |
| `IP_HASH_SALT` | **Solo servidor** | **Sí** |
| `NEXT_PUBLIC_SITE_URL` | Enlace de acceso al panel | No |

Solo lo que lleva el prefijo `NEXT_PUBLIC_` llega al navegador. Si una clave
secreta acabara con ese prefijo, quedaría publicada en el código del cliente.

Para generar la sal del hash de IP:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

> Si cambia `IP_HASH_SALT`, los hashes ya guardados dejan de poder compararse con
> los nuevos. Genérela una vez y consérvela.

---

## 4. Supabase: crear el proyecto y aplicar el esquema

### 4.1 Crear el proyecto

1. Entre a [supabase.com](https://supabase.com) y cree un proyecto nuevo.
2. Elija la región más cercana (para Colombia, `us-east-1`).
3. Guarde la contraseña de la base de datos: la necesitará para aplicar las
   migraciones por línea de comandos.
4. En **Project Settings → API** copie a `.env.local`:
   - *Project URL* → `NEXT_PUBLIC_SUPABASE_URL`
   - *anon public* → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - *service_role* → `SUPABASE_SERVICE_ROLE_KEY`

### 4.2 Aplicar las migraciones

Las migraciones están en `supabase/migrations/` y **deben aplicarse en orden**:

| Archivo | Qué hace |
|---|---|
| `…_esquema.sql` | Tablas `comentarios`, `likes`, `admins` |
| `…_triggers.sql` | Estado inicial forzado, contador de likes, sello de moderación |
| `…_vista_publica.sql` | Vista `comentarios_publicos` |
| `…_rls.sql` | Row Level Security y permisos |
| `…_limite_de_tasa.sql` | Cupo de peticiones por IP |

**Opción A — con un comando (recomendada).**

Ponga `DATABASE_URL` en `.env.local` (Project Settings → Database → *Connection
string* → URI, reemplazando `[YOUR-PASSWORD]` por su contraseña) y ejecute:

```bash
npm run esquema
```

Aplica lo que falte, en orden, cada archivo en su propia transacción, y lleva un
registro en la tabla `migraciones_aplicadas`: volver a ejecutarlo es inofensivo.

```bash
npm run esquema -- --estado    # ver qué hay aplicado, sin cambiar nada
npm run esquema -- --seed      # aplicar además los datos de ejemplo
```

**Opción B — desde el panel de Supabase.**
Vaya a **SQL Editor**, abra cada archivo **en orden**, pegue su contenido y ejecute.

### 4.3 Datos de ejemplo (opcional)

`supabase/seed.sql` crea siete mensajes en distintos estados para ver el muro y la
bandeja funcionando. Se aplica con `npm run esquema -- --seed`, y no hace nada si
ya hay comentarios, para no duplicarlos.

> Antes de correrlo, cambie los correos de ejemplo de la tabla `admins` por los
> reales del equipo.

### 4.4 Comprobar que quedó bien

```bash
npm run verificar:base
```

Levanta un Postgres en memoria, aplica las migraciones y el seed, y después
**intenta romperlas** desde el rol anónimo. Debe reportar `33/33`.

---

## 5. Cloudflare Turnstile

Turnstile es el captcha invisible que protege el formulario. Sin él configurado,
**el servidor rechaza todos los envíos**: no es opcional.

1. Entre a [dash.cloudflare.com](https://dash.cloudflare.com) → **Turnstile**.
2. Cree un widget. En *Domains* agregue su dominio y también `localhost` para
   poder probar en desarrollo.
3. Copie a `.env.local`:
   - *Site Key* → `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
   - *Secret Key* → `TURNSTILE_SECRET_KEY`

---

## 6. Agregar y quitar moderadores

Estar autenticado no da acceso: hay que figurar en la tabla `admins` con
`activo = true`. Desde el **SQL Editor** de Supabase:

```sql
-- Agregar
insert into public.admins (email, nombre, activo)
values ('persona@unal.edu.co', 'Nombre Apellido', true);

-- Quitar el acceso sin borrar el registro (conserva el rastro de moderación)
update public.admins set activo = false where email = 'persona@unal.edu.co';

-- Ver quién tiene acceso
select email, nombre, activo from public.admins order by nombre;
```

El correo debe ir **en minúsculas**: hay una restricción que lo exige.

---

## 7. Cómo funciona la moderación

```
Persona escribe  →  estado 'pendiente'  →  el equipo revisa  →  'aprobado'
                                                             →  'rechazado'
```

Tres reglas que conviene tener claras:

1. **Nada se publica solo.** Todo mensaje entra en `pendiente`. Lo fuerza un
   trigger de la base, así que no depende de que la aplicación se porte bien.
2. **Autorizar publicación es un permiso, no una orden de publicar.** Para salir
   al muro hacen falta las dos cosas: `estado = 'aprobado'` **y**
   `autoriza_publicacion = true`.
3. **El correo del autor no sale nunca.** La vista pública no lo incluye y el rol
   anónimo no puede leer la tabla. Solo se ve en el panel.

El panel está en **`/admin`**. No hay ningún enlace hacia él desde el sitio
público: hay que escribir la dirección. El acceso es por enlace de un solo uso al
correo, sin contraseñas.

---

## 8. Desarrollo local

```bash
npm run dev
```

Abre en <http://localhost:3000>.

| Comando | Para qué |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Compilación de producción |
| `npm start` | Servir la compilación |
| `npm run lint` | Revisión de estilo |
| `npm run assets` | Regenerar los PNG de marca a partir de los originales |
| `npm run encuadres` | Recalcular el recorte de las fotos contra el mockup |

---

## 9. Verificación automatizada

| Comando | Qué comprueba |
|---|---|
| `npm run verificar:base` | Esquema, triggers, RLS y cupos. Intenta romperlos desde el rol anónimo |
| `npm run verificar:seguridad` | Cabeceras, CSP sin violaciones, y que ningún secreto llegue al navegador |
| `npm run verificar:formulario` | Modal, validación, contador, campo trampa |
| `npm run verificar:interaccion` | Acordeones y anclas de navegación |
| `npm run verificar:responsive` | Móvil, tableta y escritorio: sin scroll horizontal, sin re-acomodo |
| `npm run verificar:maqueta` | Compara la página renderizada contra el mockup, píxel a píxel |
| `npm run verificar:flujo` | El recorrido completo de un mensaje **contra la base real** |

`verificar:base` no necesita nada: levanta un Postgres en memoria. Las demás
requieren el servidor corriendo, y **`verificar:seguridad` exige la compilación de
producción**, porque en desarrollo la CSP es más permisiva:

```bash
npm run build
npm start
```

Y en otra terminal:

```bash
npm run verificar:seguridad
npm run verificar:formulario
npm run verificar:interaccion
npm run verificar:responsive
npm run verificar:maqueta
```

### Sobre `verificar:flujo`

Recorre el camino completo de un mensaje contra la base **real**: enviar → queda
pendiente → no sale al muro → aprobar → sale → me gusta → el contador sube → no se
puede duplicar → responder → se ve la respuesta. Después intenta, con la llave
anónima de verdad, leer correos y comentarios pendientes: debe ser imposible.

Para que el script pueda enviar el formulario necesita las **claves de prueba** de
Turnstile, que siempre aprueban. Póngalas temporalmente en `.env.local`:

```
NEXT_PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA
TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA
```

Con las claves reales el script no puede pasar el captcha — que es exactamente lo
que se busca: **no hay forma de enviar sin resolverlo**. Recuerde volver a poner
las claves reales antes de desplegar.

Los datos que crea se borran al terminar.

Todos los scripts aceptan una URL como argumento, por si el servidor está en otro
puerto: `node scripts/probar-seguridad.mjs http://localhost:3100`

### Sobre `verificar:maqueta`

Genera dos archivos en `scripts/salida/`:

- `lado-a-lado.png` — el mockup y la página, uno junto al otro
- `diferencia.png` — mapa de diferencias: **negro = coincide, rojo = se desvía**

E imprime el porcentaje de píxeles distintos, en total y **excluyendo las
fotografías** (esa segunda cifra es la que mide la maquetación; en las fotos la
diferencia viene de la recompresión del mockup, no del código).

---

## 10. Utilidades de operación (Python)

Con el entorno virtual activado (`scripts\venv\Scripts\activate`):

| Script | Qué hace |
|---|---|
| `python scripts\python\exportar_excel.py` | Exporta todos los comentarios a `.xlsx` con formato |
| `python scripts\python\reporte.py` | Resumen: pendientes, rapidez de moderación, participación, mensajes por día |
| `python scripts\python\respaldo.py` | Copia completa de comentarios, likes y moderadores en JSON |
| `python scripts\python\probar_utilidades.py` | Prueba las utilidades con datos simulados, sin conexión |

Los archivos se guardan en `scripts/salida/`, que está en `.gitignore`.

> **Los archivos generados contienen correos electrónicos.** Son datos personales:
> guárdelos en un lugar controlado y no los comparta.

---

## 11. Reemplazar los recursos pendientes

### Fotografías

Reemplace el archivo en `public/fotos/` conservando el nombre y ejecute:

```bash
npm run encuadres
```

El script busca en cada foto la región que mejor coincide con el mockup e imprime
los valores para pegar en `src/config/sitio.ts`. El recuadro y su posición en la
maqueta no se mueven.

### Textos pendientes

| Qué falta | Archivo |
|---|---|
| Contenido de Principios / Objetivos / Líneas estratégicas | `src/content/programa.ts` |
| Mensajes a docentes, estudiantes y egresados | `src/content/audiencias.ts` |
| URLs de Instagram, Facebook y LinkedIn | `src/config/sitio.ts` → `REDES` |
| Responsable del tratamiento de datos y correo de contacto | `src/config/sitio.ts` → `RESPONSABLE` |

Todos están marcados con `TODO`. Para listarlos en Windows:

```bash
findstr /S /N /C:"TODO" src\*.ts src\*.tsx
```

### Los PNG de marca

Los originales viven en `assets/marca/`. Los que consume el sitio, en
`public/marca/`, los genera:

```bash
npm run assets
```

Ese script existe porque **los archivos originales no son recortes limpios**:
traen horneadas la franja turquesa de la cabecera y el bloque verde limón. Con
ellos tal cual era imposible reproducir la superposición del diseño —el turquesa
opaco tapaba las palabras «OSORIO» y «Facultad de Ingeniería y Arquitectura»—. El
script los limpia y de paso invalida la caché de imágenes de Next, que si no
seguiría sirviendo los antiguos.

Si la publicista entrega versiones nuevas, reemplácelas en `assets/marca/` y
vuelva a ejecutarlo.

---

## 12. Subir a GitHub

```bash
git init
git add .
git commit -m "Sitio de campaña"
git branch -M main
git remote add origin https://github.com/USUARIO/REPOSITORIO.git
git push -u origin main
```

Antes de subir, confirme que las claves no viajan:

```bash
git check-ignore -q .env.local && echo "OK: .env.local no se sube"
```

Si `.env.local` llegara a subirse alguna vez, **rote todas las claves** en
Supabase y Cloudflare: quedan en el historial de git aunque después se borren.

---

## 13. Desplegar en Vercel

1. Entre a [vercel.com](https://vercel.com) → **Add New → Project** e importe el
   repositorio de GitHub.
2. Vercel detecta Next.js solo; no hay que tocar la configuración de compilación.
3. En **Settings → Environment Variables** agregue **todas** las variables de
   `.env.local`, marcándolas para *Production*, *Preview* y *Development*.
4. Ponga `NEXT_PUBLIC_SITE_URL` con el dominio definitivo (no el de vista previa).
5. Despliegue.

Después del primer despliegue:

- **Supabase → Authentication → URL Configuration**: agregue
  `https://su-dominio.co/auth/callback` a *Redirect URLs*. Sin esto, el enlace de
  acceso al panel no funciona.
- **Cloudflare Turnstile**: agregue el dominio definitivo al widget.

---

## 14. Seguridad

### Lo que está implementado

| Medida | Dónde |
|---|---|
| **Captcha Turnstile** validado en el servidor antes de guardar | `src/lib/seguridad.ts`, `src/app/api/comentarios/route.ts` |
| **Campo trampa** oculto y **tiempo mínimo** de diligenciamiento | `src/components/formulario/FormularioModal.tsx` |
| **Límite por IP**: 3 mensajes / 10 min, 40 likes / 10 min, 5 accesos / 15 min | `supabase/migrations/…_limite_de_tasa.sql` |
| **IP hasheada** con SHA-256 + sal secreta, nunca en claro | `src/lib/seguridad.ts` |
| **Texto plano siempre**: no se usa `dangerouslySetInnerHTML` en ninguna parte | Muro y panel |
| **Validación con Zod** en cliente y servidor, con el mismo esquema | `src/lib/validacion.ts` |
| **RLS activa** en todas las tablas | `supabase/migrations/…_rls.sql` |
| **CSP con nonce** por petición, sin `unsafe-inline` en scripts | `src/proxy.ts` |
| `X-Frame-Options`, `nosniff`, `Referrer-Policy`, HSTS, `Permissions-Policy` | `next.config.ts` |
| **Panel oculto**: sin enlaces, `noindex`, `no-store`, fuera de `robots.txt` | `src/proxy.ts`, `src/app/robots.ts` |

### Tres decisiones que conviene entender

**El rol anónimo no puede insertar comentarios.** Si pudiera, bastaría con
escribir directo contra la API de Supabase para esquivar el captcha, el campo
trampa y el límite por IP. El único camino es el manejador del servidor.

**No se usa `FORCE ROW LEVEL SECURITY`.** Suena a más seguridad, pero el trigger
que lleva el contador de «me gusta» es `SECURITY DEFINER` y actualiza
`comentarios` como propietario: con `FORCE`, ese `UPDATE` quedaría sujeto a las
políticas y el contador dejaría de subir en silencio.

**La portada se renderiza en cada petición.** El nonce de la CSP cambia cada vez y
solo funciona si el HTML se genera en el momento. La alternativa era permitir
`unsafe-inline` en los scripts, con lo que la CSP dejaría de proteger contra XSS.
Sigue siendo HTML completo servido por el servidor, así que los buscadores lo
indexan igual.

### WAF y protección contra denegación de servicio

Lo que ya trae Vercel sin configurar nada: mitigación automática de ataques
volumétricos en la red y certificados TLS gestionados.

**Configuración recomendada en Vercel** (Settings → Firewall):

- Active **Attack Challenge Mode** si detecta una oleada de tráfico anómalo.
- Cree reglas de *rate limiting* para `/api/comentarios` y `/api/admin/acceso`.
  El cupo de la base ya limita por IP, pero una regla en el borde corta el tráfico
  **antes** de que llegue a consumir función y base de datos.
- Bloquee países desde los que no espere tráfico legítimo, si aplica.
- Active **Deployment Protection** en los despliegues de vista previa, para que
  las versiones en pruebas no queden públicas.

**Cloudflare por delante del dominio** (recomendado para una campaña, por el
riesgo de ataques dirigidos):

1. Apunte los DNS del dominio a Cloudflare y active el proxy (nube naranja).
2. Modo SSL/TLS: **Full (strict)**.
3. Active el **Managed Ruleset** del WAF y el **Bot Fight Mode**.
4. Cree una *Rate Limiting Rule*: máximo 10 peticiones por minuto y por IP hacia
   `/api/*`.
5. Deje `Always Use HTTPS` y `Automatic HTTPS Rewrites` activados.

Con Cloudflare por delante, la IP real llega en la cabecera `cf-connecting-ip`,
que la aplicación ya sabe leer.

### Si algo sale mal

- **Sospecha de filtración de claves:** rote la `service_role` en Supabase
  (Settings → API → *Reset*) y la *Secret Key* de Turnstile. Actualice Vercel y
  vuelva a desplegar.
- **Oleada de mensajes basura:** desde el panel, filtre por pendientes y rechace
  en bloque. Si persiste, active *Attack Challenge Mode* en Vercel.
- **Un moderador pierde el acceso a su correo:** desactívelo con
  `update public.admins set activo = false where email = '…';`

---

## 15. Estructura del proyecto

```
Decanatura/
├── assets/                      Originales entregados por la publicista
│   ├── marca/                   PNG de marca sin procesar
│   ├── fotos/                   Fotografías del campus
│   └── referencia/image.jpeg    Mockup aprobado (la referencia de todo)
├── public/
│   ├── marca/                   PNG ya limpios (los genera npm run assets)
│   └── fotos/
├── scripts/
│   ├── *.mjs                    Verificación: captura, comparación, pruebas
│   ├── medir-maqueta.ps1        Medición de la maqueta sobre una imagen
│   ├── python/                  Utilidades de operación
│   ├── venv/                    Entorno virtual (no se versiona)
│   └── salida/                  Archivos generados (no se versiona)
├── src/
│   ├── app/
│   │   ├── page.tsx             Portada
│   │   ├── admin/               Panel de moderación
│   │   ├── api/                 Manejadores de ruta
│   │   ├── privacidad/          Política de datos (Ley 1581)
│   │   ├── lienzo.css           Maqueta fiel al mockup
│   │   ├── extension.css        Bloques bajo la pieza
│   │   ├── formulario.css       Modal y muro
│   │   └── panel.css            Panel de moderación
│   ├── components/
│   │   ├── lienzo/              Piezas del diseño aprobado
│   │   ├── extension/           Audiencias y muro
│   │   └── formulario/          Modal y captcha
│   ├── config/
│   │   ├── maqueta.ts           Geometría medida del mockup
│   │   └── sitio.ts             Paleta, redes, responsable, fotos
│   ├── content/                 Textos editables
│   ├── lib/                     Supabase, validación, seguridad
│   └── proxy.ts                 CSP y sesión del panel
└── supabase/
    ├── migrations/              Esquema versionado
    └── seed.sql                 Datos de ejemplo
```

### Cómo está construida la maqueta

El mockup aprobado mide **896 × 1600 px**. Toda medida interna se expresa en
`--u`, definida en `lienzo.css` como `calc(100cqw / 896)`: es decir, **1 u = 1 px
del mockup**. Cambiar el ancho del lienzo reescala la pieza entera como una unidad,
sin re-acomodar nada.

Se usan unidades de contenedor (`cqw`) y no `transform: scale()` porque el
navegador maqueta y rasteriza el texto ya en su tamaño final: no hay capa
compositada intermedia y no se pierde nitidez. Además el caso móvil sale gratis.

El factor de «vista alejada» es la variable CSS `--canvas-scale` (por defecto
`0.85`), en `src/app/lienzo.css`.

---

## 16. Pendientes por completar

Antes de publicar el sitio:

- [ ] Textos de **Principios**, **Objetivos Estratégicos** y **Líneas
      estratégicas** → `src/content/programa.ts`
- [ ] Mensajes a **docentes, estudiantes y egresados** → `src/content/audiencias.ts`
- [ ] **URLs de redes sociales** → `src/config/sitio.ts`
- [ ] **Responsable del tratamiento de datos y correo de contacto** →
      `src/config/sitio.ts` (obligatorio por la Ley 1581 de 2012)
- [ ] **Correos reales de los moderadores** en la tabla `admins`
- [ ] Crear el proyecto de **Supabase** y aplicar migraciones
- [ ] Crear el widget de **Turnstile**
- [ ] Confirmar con la publicista las **tipografías**: las originales no vienen con
      los archivos. Se eligieron *Fira Sans Extra Condensed* para titulares y
      *Fira Sans* para texto, midiendo el mockup — reproducen sus proporciones con
      menos del 1 % de desvío y los mismos saltos de línea, pero no está confirmado
      que sean las mismas.
- [ ] Borrar `public/_referencia/`, que solo sirve para comparar durante el
      desarrollo.
