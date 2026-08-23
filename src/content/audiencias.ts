/**
 * Contenido de las tres secciones a las que apunta la barra de navegacion.
 *
 * El mockup aprobado NO incluye estas secciones: solo la barra con las tres
 * etiquetas. Para no inventar diseno dentro de la pieza, viven en la zona de
 * extension que va debajo del pie, junto al muro de mensajes.
 *
 * Los textos todavia no los entrega la campana: van marcados como TODO.
 */

export type Audiencia = {
  /** Debe coincidir con el `id` de NAVEGACION.enlaces en src/config/maqueta.ts */
  id: string;
  titulo: string;
  /** Frase corta de entrada. TODO: reemplazar por el texto real. */
  entradilla: string;
  /** Puntos del programa para esa audiencia. TODO: reemplazar. */
  puntos: string[];
};

export const AUDIENCIAS: Audiencia[] = [
  {
    id: "docentes",
    titulo: "Docentes",
    entradilla:
      "TODO: mensaje de la campaña dirigido al profesorado. Pendiente de entrega.",
    puntos: [
      "TODO: primer compromiso con los docentes.",
      "TODO: segundo compromiso con los docentes.",
      "TODO: tercer compromiso con los docentes.",
    ],
  },
  {
    id: "estudiantes",
    titulo: "Estudiantes",
    entradilla:
      "TODO: mensaje de la campaña dirigido al estudiantado. Pendiente de entrega.",
    puntos: [
      "TODO: primer compromiso con los estudiantes.",
      "TODO: segundo compromiso con los estudiantes.",
      "TODO: tercer compromiso con los estudiantes.",
    ],
  },
  {
    id: "egresados",
    titulo: "Egresados",
    entradilla:
      "TODO: mensaje de la campaña dirigido a los egresados. Pendiente de entrega.",
    puntos: [
      "TODO: primer compromiso con los egresados.",
      "TODO: segundo compromiso con los egresados.",
      "TODO: tercer compromiso con los egresados.",
    ],
  },
];
