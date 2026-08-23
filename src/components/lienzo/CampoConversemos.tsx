"use client";

import { useState } from "react";
import { FormularioModal } from "@/components/formulario/FormularioModal";

/**
 * El campo del cuadro "Conversemos" del pie.
 *
 * Se ve exactamente como en el mockup: una sola linea. Al enfocarlo abre el
 * formulario completo en una modal, arrastrando lo que ya se hubiera escrito.
 * Asi la composicion del pie no cambia de alto en ningun momento.
 */
export function CampoConversemos() {
  const [abierto, setAbierto] = useState(false);
  const [borrador, setBorrador] = useState("");

  return (
    <>
      <input
        className="pie__campo"
        type="text"
        value={borrador}
        onChange={(e) => setBorrador(e.target.value)}
        onFocus={() => setAbierto(true)}
        onClick={() => setAbierto(true)}
        aria-haspopup="dialog"
        aria-label="Propone un tema de interés"
        placeholder=""
      />
      {abierto && (
        <FormularioModal
          borrador={borrador}
          onCerrar={() => {
            setAbierto(false);
            setBorrador("");
          }}
        />
      )}
    </>
  );
}
