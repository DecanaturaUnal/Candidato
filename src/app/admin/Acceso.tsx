"use client";

import { useState } from "react";

/**
 * Puerta de entrada al panel: se pide un enlace magico al correo.
 *
 * No hay contrasenas que robar ni que rotar. El servidor responde siempre lo
 * mismo, pertenezca o no el correo al equipo, para que este formulario no sirva
 * para averiguar quien modera.
 */
export function Acceso({ aviso }: { aviso?: string }) {
  const [email, setEmail] = useState("");
  const [estado, setEstado] = useState<"escribiendo" | "enviando" | "enviado">(
    "escribiendo",
  );
  const [mensaje, setMensaje] = useState<string | null>(null);

  const pedirEnlace = async (evento: React.FormEvent) => {
    evento.preventDefault();
    setEstado("enviando");
    setMensaje(null);

    try {
      const respuesta = await fetch("/api/admin/acceso", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const cuerpo = await respuesta.json();
      setMensaje(cuerpo.mensaje ?? "No se pudo procesar la solicitud.");
      setEstado(respuesta.ok ? "enviado" : "escribiendo");
    } catch {
      setMensaje("No pudimos conectar. Intente de nuevo.");
      setEstado("escribiendo");
    }
  };

  return (
    <div className="acceso">
      <form className="acceso__caja" onSubmit={pedirEnlace}>
        <h1 className="acceso__titulo">Moderación</h1>

        {aviso === "enlace" && (
          <p className="formulario__error-general" role="alert">
            El enlace no era válido o ya se usó. Solicite uno nuevo.
          </p>
        )}

        <div className="campo">
          <label htmlFor="a-email">Correo del equipo</label>
          <input
            id="a-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            disabled={estado === "enviando"}
          />
        </div>

        <button
          type="submit"
          className="boton boton--principal"
          disabled={estado === "enviando"}
        >
          {estado === "enviando" ? "Enviando…" : "Enviar enlace de acceso"}
        </button>

        {mensaje && (
          <p className="acceso__mensaje" role="status">
            {mensaje}
          </p>
        )}

        <p className="acceso__nota">
          Se enviará un enlace de un solo uso. No hay contraseña que recordar.
        </p>
      </form>
    </div>
  );
}
