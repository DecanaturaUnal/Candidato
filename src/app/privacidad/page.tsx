import type { Metadata } from "next";
import Link from "next/link";
import { RESPONSABLE } from "@/config/sitio";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Política de privacidad · Gustavo Osorio",
  description:
    "Política de tratamiento de datos personales del sitio de campaña, conforme a la Ley 1581 de 2012.",
};

/**
 * Politica de tratamiento de datos personales (Ley 1581 de 2012).
 *
 * Los datos del responsable y el correo de contacto salen de `src/config/sitio.ts`
 * y estan marcados como TODO: hay que completarlos antes de publicar el sitio.
 */
export default function Privacidad() {
  const faltaCompletar =
    RESPONSABLE.nombre.startsWith("TODO") ||
    RESPONSABLE.correo.startsWith("TODO");

  return (
    <main className="escenario">
      <article className="documento">
        <Link href="/" className="documento__volver">
          ← Volver a la portada
        </Link>

        <h1>Política de tratamiento de datos personales</h1>

        {faltaCompletar && (
          <p className="pendiente">
            Faltan los datos del responsable y el correo de contacto
          </p>
        )}

        <p>
          Esta política describe cómo se recogen, usan y protegen los datos
          personales que las personas envían a través de este sitio, en
          cumplimiento de la <strong>Ley 1581 de 2012</strong> y sus decretos
          reglamentarios.
        </p>

        <h2>1. Responsable del tratamiento</h2>
        <ul>
          <li>
            <strong>Responsable:</strong> {RESPONSABLE.nombre}
          </li>
          <li>
            <strong>Correo de contacto:</strong> {RESPONSABLE.correo}
          </li>
          <li>
            <strong>Dirección:</strong> {RESPONSABLE.direccion}
          </li>
        </ul>

        <h2>2. Datos que se recogen</h2>
        <p>Cuando alguien envía un mensaje mediante el formulario del sitio:</p>
        <ul>
          <li>
            <strong>Nombre.</strong> Se publica junto al mensaje, salvo que se
            marque la opción de publicar como anónimo, en cuyo caso se reemplaza
            por la palabra «Anónimo».
          </li>
          <li>
            <strong>Correo electrónico.</strong>{" "}
            <strong>No se publica nunca.</strong> Solo lo consulta el equipo de
            campaña, y únicamente para responder o aclarar el mensaje recibido.
          </li>
          <li>
            <strong>Mensaje.</strong> El texto que la persona escribe.
          </li>
          <li>
            <strong>Datos técnicos.</strong> Fecha y hora del envío, navegador
            utilizado y una <em>huella</em> de la dirección IP. Esa huella es un
            valor cifrado de un solo sentido (SHA-256 con una sal secreta): la
            dirección IP <strong>no se almacena en claro</strong> y no puede
            reconstruirse a partir de la huella. Sirve solo para evitar envíos
            masivos automatizados.
          </li>
        </ul>

        <h2>3. Finalidad</h2>
        <ul>
          <li>Recibir preguntas, propuestas y opiniones de la comunidad.</li>
          <li>
            Publicar los mensajes en el muro del sitio, siempre que la persona lo
            haya autorizado <em>y</em> el equipo los haya aprobado. La
            autorización es un permiso, no una publicación automática.
          </li>
          <li>Responder mensajes cuando sea pertinente.</li>
          <li>Proteger el sitio frente a envíos automatizados y abuso.</li>
        </ul>

        <h2>4. Autorización</h2>
        <p>
          El envío del formulario requiere marcar de forma expresa la casilla de
          autorización de tratamiento de datos. Sin esa autorización el mensaje no
          se puede recibir ni almacenar.
        </p>
        <p>
          La casilla de autorización de publicación es independiente y opcional:
          si no se marca, el mensaje llega al equipo pero nunca aparece en el muro.
        </p>

        <h2>5. Derechos del titular</h2>
        <p>Toda persona cuyos datos figuren aquí tiene derecho a:</p>
        <ul>
          <li>
            <strong>Conocer</strong> qué datos suyos se están tratando y con qué
            finalidad.
          </li>
          <li>
            <strong>Actualizar y rectificar</strong> los datos que estén
            incompletos o sean inexactos.
          </li>
          <li>
            <strong>Suprimir</strong> sus datos y retirar la autorización
            concedida, salvo que exista un deber legal de conservarlos.
          </li>
          <li>
            <strong>Presentar quejas</strong> ante la Superintendencia de
            Industria y Comercio.
          </li>
        </ul>
        <p>
          Para ejercer cualquiera de estos derechos basta con escribir a{" "}
          <strong>{RESPONSABLE.correo}</strong> indicando la solicitud. La
          respuesta se dará dentro de los plazos que fija la ley.
        </p>

        <h2>6. Conservación y seguridad</h2>
        <p>
          Los mensajes se conservan mientras dure la campaña y el tiempo adicional
          necesario para atender solicitudes de los titulares. Los datos se
          guardan en una base de datos con control de acceso por filas: el público
          solo puede leer los mensajes aprobados y publicados, y en ningún caso los
          correos electrónicos.
        </p>

        <h2>7. Cambios en esta política</h2>
        <p>
          Cualquier modificación se publicará en esta misma página. Se recomienda
          consultarla periódicamente.
        </p>
      </article>
    </main>
  );
}
