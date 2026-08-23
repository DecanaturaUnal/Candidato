/**
 * Contenido editable de la seccion "Construir Futuro".
 *
 * Los dos parrafos estan transcritos literalmente del mockup aprobado: no se deben
 * reescribir ni "mejorar". El contenido de los tres acordeones todavia no lo entrega
 * la campana, por eso va marcado como TODO.
 */

/** Parrafo de la columna izquierda, bajo la grilla de fotos. Transcripcion literal. */
export const PARRAFO_IZQUIERDO = `Construir Futuro significa fortalecer una Facultad capaz de reconocer sus capacidades, escuchar a su comunidad, dialogar con el entorno y actuar con responsabilidad frente a los desafíos contemporáneos. Para ello, propongo establecer, fortalecer y dinamizar canales de interacción permanente con los sectores social, empresarial, académico, estatal y comunitario, con el propósito de:
a) conocer necesidades, oportunidades y percepciones que contribuyan a orientar el quehacer de la Facultad; b) formular y ejecutar proyectos de generación de nuevo conocimiento, creación, desarrollo tecnológico e innovación que ofrezcan respuestas oportunas a los retos sociales, ambientales y productivos; c) apropiar nuevas formas de trabajo académico y administrativo mediante modelos, métodos y tecnologías emergentes; d) fortalecer la formación integral de estudiantes, profesores, egresados y personal administrativo, para contribuir de manera efectiva a la construcción de región y país.`;

/** Parrafo de la columna derecha, bajo las tres etiquetas. Transcripcion literal. */
export const PARRAFO_DERECHO = `La Universidad Nacional de Colombia por su carácter público y por sus funciones misionales, tiene el compromiso de ser protagonista en los diálogos que surjan entre los diferentes actores de la sociedad a nivel local y global. En este contexto, es fundamental consolidar un proyecto académico que reconozca las distintas visiones de Universidad y que fortalezca su presencia en los diversos escenarios de construcción de región y país.`;

export type BloquePrograma = {
  id: string;
  titulo: string;
  /** Parrafos del acordeon. TODO: reemplazar por el texto real del programa. */
  cuerpo: string[];
};

export const BLOQUES_PROGRAMA: BloquePrograma[] = [
  {
    id: "principios",
    titulo: "Principios",
    cuerpo: [
      "TODO: texto de los principios del programa. Pendiente de entrega por la campaña.",
    ],
  },
  {
    id: "objetivos-estrategicos",
    titulo: "Objetivos Estratégicos",
    cuerpo: [
      "TODO: texto de los objetivos estratégicos. Pendiente de entrega por la campaña.",
    ],
  },
  {
    id: "lineas-estrategicas",
    titulo: "Líneas estratégicas",
    cuerpo: [
      "TODO: texto de las líneas estratégicas. Pendiente de entrega por la campaña.",
    ],
  },
];
