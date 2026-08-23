"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LIMITES, erroresPorCampo, esquemaComentario } from "@/lib/validacion";
import { Captcha } from "./Captcha";

/**
 * Formulario completo de mensajes, en ventana modal.
 *
 * Vive en una modal y no dentro del pie por una razon concreta: el cuadro celeste
 * del diseno aprobado tiene un solo campo, y meter ahi nombre, correo, mensaje y
 * dos autorizaciones obligaria a cambiarle el alto y romper la composicion. Asi el
 * pie se ve exactamente como lo aprobo la publicista y el formulario cabe entero.
 *
 * Se monta con un portal en <body> para quedar fuera del lienzo, que tiene
 * `overflow: hidden` y una escala propia: dentro, la modal se recortaria y su
 * texto se encogeria con la pieza.
 */

type Estado = "escribiendo" | "enviando" | "enviado" | "error";

export function FormularioModal({
  borrador,
  onCerrar,
}: {
  borrador: string;
  onCerrar: () => void;
}) {
  const [estado, setEstado] = useState<Estado>("escribiendo");
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [captcha, setCaptcha] = useState<string | null>(null);

  const [nombre, setNombre] = useState("");
  const [esAnonimo, setEsAnonimo] = useState(false);
  const [email, setEmail] = useState("");
  const [mensaje, setMensaje] = useState(borrador);
  const [autorizaPublicacion, setAutorizaPublicacion] = useState(true);
  const [autorizaDatos, setAutorizaDatos] = useState(false);
  const [sitioWeb, setSitioWeb] = useState(""); // campo trampa

  /** Momento en que se abrio el formulario. Sirve para descartar envios de robots,
      que rellenan y disparan en menos de un segundo. Se toma al montar y no
      durante el render, que debe ser puro. */
  const abiertoEn = useRef(0);
  const dialogo = useRef<HTMLDivElement>(null);
  const primerCampo = useRef<HTMLInputElement>(null);
  const idTitulo = useId();

  // Cerrar con Escape y devolver el foco al abrir
  useEffect(() => {
    abiertoEn.current = Date.now();

    const alPulsar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") onCerrar();
    };
    document.addEventListener("keydown", alPulsar);
    const previo = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    primerCampo.current?.focus();
    return () => {
      document.removeEventListener("keydown", alPulsar);
      document.body.style.overflow = previo;
    };
  }, [onCerrar]);

  const recibirCaptcha = useCallback(
    (comprobante: string | null) => setCaptcha(comprobante),
    [],
  );

  const enviar = async (evento: React.FormEvent) => {
    evento.preventDefault();
    setErrorGeneral(null);

    // Validacion en el cliente: es cortesia, la que decide es la del servidor.
    const datos = {
      nombre,
      esAnonimo,
      email,
      mensaje,
      autorizaPublicacion,
      autorizaDatos,
    };
    const revision = esquemaComentario.safeParse(datos);
    if (!revision.success) {
      setErrores(erroresPorCampo(revision.error));
      return;
    }
    setErrores({});

    if (!captcha) {
      setErrorGeneral(
        "Espere un momento a que termine la verificación anti-robots.",
      );
      return;
    }

    setEstado("enviando");
    try {
      const respuesta = await fetch("/api/comentarios", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...revision.data,
          sitioWeb,
          abiertoEn: abiertoEn.current,
          captcha,
        }),
      });
      const cuerpo = await respuesta.json();

      if (!respuesta.ok || !cuerpo.ok) {
        setEstado("error");
        setErrores(cuerpo.campos ?? {});
        setErrorGeneral(cuerpo.error ?? "No pudimos enviar el mensaje.");
        return;
      }
      setEstado("enviado");
    } catch {
      setEstado("error");
      setErrorGeneral(
        "No pudimos conectar. Revise su conexión e intente de nuevo.",
      );
    }
  };

  const restantes = LIMITES.mensaje.max - mensaje.length;

  const contenido =
    estado === "enviado" ? (
      <div className="formulario__exito" role="status">
        <h2 className="formulario__titulo" id={idTitulo}>
          ¡Gracias por escribir!
        </h2>
        <p>
          Su mensaje quedó registrado y lo revisará el equipo de campaña antes de
          publicarse. <strong>No aparece en el muro de inmediato.</strong>
        </p>
        <p className="formulario__nota">
          Si autorizó su publicación y el equipo lo aprueba, aparecerá en el muro
          con su nombre {esAnonimo ? "como “Anónimo”" : "tal como lo escribió"}.
          Su correo no se publica nunca.
        </p>
        <button type="button" className="boton boton--principal" onClick={onCerrar}>
          Cerrar
        </button>
      </div>
    ) : (
      <form className="formulario" onSubmit={enviar} noValidate>
        <h2 className="formulario__titulo" id={idTitulo}>
          Conversemos
        </h2>
        <p className="formulario__entradilla">
          Proponga un tema, haga una pregunta o comparta una idea. Todos los
          mensajes los revisa el equipo antes de publicarse.
        </p>

        {errorGeneral && (
          <p className="formulario__error-general" role="alert">
            {errorGeneral}
          </p>
        )}

        <div className="campo">
          <label htmlFor="f-nombre">Nombre</label>
          <input
            ref={primerCampo}
            id="f-nombre"
            name="nombre"
            type="text"
            maxLength={LIMITES.nombre.max}
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            aria-invalid={Boolean(errores.nombre)}
            aria-describedby={errores.nombre ? "e-nombre" : undefined}
            autoComplete="name"
            required
          />
          {errores.nombre && (
            <p className="campo__error" id="e-nombre">
              {errores.nombre}
            </p>
          )}
          <label className="campo__casilla">
            <input
              type="checkbox"
              checked={esAnonimo}
              onChange={(e) => setEsAnonimo(e.target.checked)}
            />
            <span>Publicar como anónimo</span>
          </label>
        </div>

        <div className="campo">
          <label htmlFor="f-email">Correo electrónico</label>
          <input
            id="f-email"
            name="email"
            type="email"
            inputMode="email"
            maxLength={LIMITES.email.max}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={Boolean(errores.email)}
            aria-describedby="ayuda-email"
            autoComplete="email"
            required
          />
          <p className="campo__ayuda" id="ayuda-email">
            Su correo <strong>nunca se muestra en el sitio</strong>. Solo lo ve el
            equipo de campaña, por si necesita responderle.
          </p>
          {errores.email && <p className="campo__error">{errores.email}</p>}
        </div>

        <div className="campo">
          <label htmlFor="f-mensaje">Mensaje</label>
          <textarea
            id="f-mensaje"
            name="mensaje"
            rows={6}
            maxLength={LIMITES.mensaje.max}
            value={mensaje}
            onChange={(e) => setMensaje(e.target.value)}
            aria-invalid={Boolean(errores.mensaje)}
            aria-describedby="contador-mensaje"
            required
          />
          <p
            className={`campo__contador${restantes < 40 ? " campo__contador--poco" : ""}`}
            id="contador-mensaje"
            aria-live="polite"
          >
            {mensaje.length} de {LIMITES.mensaje.max} caracteres
            {mensaje.length < LIMITES.mensaje.min &&
              ` · mínimo ${LIMITES.mensaje.min}`}
          </p>
          {errores.mensaje && <p className="campo__error">{errores.mensaje}</p>}
        </div>

        <label className="campo__casilla">
          <input
            type="checkbox"
            checked={autorizaPublicacion}
            onChange={(e) => setAutorizaPublicacion(e.target.checked)}
          />
          <span>Autorizo que mi mensaje sea publicado en este sitio.</span>
        </label>

        <label className="campo__casilla">
          <input
            type="checkbox"
            checked={autorizaDatos}
            onChange={(e) => setAutorizaDatos(e.target.checked)}
            aria-invalid={Boolean(errores.autorizaDatos)}
            required
          />
          <span>
            Autorizo el tratamiento de mis datos personales conforme a la{" "}
            <a href="/privacidad" target="_blank" rel="noopener noreferrer">
              Política de Privacidad
            </a>
            . <span className="campo__obligatorio">(obligatorio)</span>
          </span>
        </label>
        {errores.autorizaDatos && (
          <p className="campo__error">{errores.autorizaDatos}</p>
        )}

        {/* Campo trampa: oculto para las personas, visible para los robots que
            rellenan todo lo que encuentran. Si llega con contenido, se descarta. */}
        <div className="trampa" aria-hidden>
          <label htmlFor="f-sitio-web">No rellene este campo</label>
          <input
            id="f-sitio-web"
            name="sitioWeb"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={sitioWeb}
            onChange={(e) => setSitioWeb(e.target.value)}
          />
        </div>

        <Captcha onComprobante={recibirCaptcha} />

        <div className="formulario__acciones">
          <button type="button" className="boton" onClick={onCerrar}>
            Cancelar
          </button>
          <button
            type="submit"
            className="boton boton--principal"
            disabled={estado === "enviando"}
          >
            {estado === "enviando" ? "Enviando…" : "Enviar mensaje"}
          </button>
        </div>
        <p className="formulario__nota" aria-live="polite">
          {estado === "enviando"
            ? "Enviando su mensaje…"
            : "Su mensaje pasa por revisión antes de publicarse."}
        </p>
      </form>
    );

  return createPortal(
    <div
      className="modal"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCerrar();
      }}
    >
      <div
        className="modal__caja"
        ref={dialogo}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
      >
        <button
          type="button"
          className="modal__cerrar"
          onClick={onCerrar}
          aria-label="Cerrar"
        >
          ×
        </button>
        {contenido}
      </div>
    </div>,
    document.body,
  );
}
