const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "docs", "manual-profesores-montar-curso.pdf");
const HERO = path.join(ROOT, "src", "assets", "mooc-hero-institucional.png");

const colors = {
  blue: "#005ea8",
  blueDark: "#00477f",
  blueSoft: "#e8f2fb",
  text: "#17212b",
  muted: "#5c6b78",
  line: "#d8e0e7",
  green: "#167a4a",
  amber: "#a86300",
  red: "#b42318",
  white: "#ffffff",
};

const doc = new PDFDocument({
  size: "A4",
  margin: 48,
  bufferPages: true,
  info: {
    Title: "Manual para profesores: cómo montar un curso MOOC",
    Author: "RedUniv",
    Subject: "Guía práctica para crear cursos en la plataforma",
    Keywords: "MOOC, profesores, CMS, cursos, evaluación, certificación",
  },
});

fs.mkdirSync(path.dirname(OUT), { recursive: true });
doc.pipe(fs.createWriteStream(OUT));

const page = {
  width: doc.page.width,
  height: doc.page.height,
  left: doc.page.margins.left,
  right: doc.page.width - doc.page.margins.right,
  top: doc.page.margins.top,
  bottom: doc.page.height - doc.page.margins.bottom,
};

function pageWidth() {
  return page.right - page.left;
}

function es(value) {
  let out = String(value);
  const replacements = [
    ["Indice", "Índice"],
    ["indice", "índice"],
    ["academico", "académico"],
    ["academica", "académica"],
    ["catalogo", "catálogo"],
    ["evaluacion", "evaluación"],
    ["evaluaciones", "evaluaciones"],
    ["certificacion", "certificación"],
    ["autenticacion", "autenticación"],
    ["publicacion", "publicación"],
    ["configuracion", "configuración"],
    ["organizacion", "organización"],
    ["correccion", "corrección"],
    ["accion", "acción"],
    ["descripcion", "descripción"],
    ["publico", "público"],
    ["duracion", "duración"],
    ["dedicacion", "dedicación"],
    ["titulo", "título"],
    ["pagina", "página"],
    ["contraseña", "contraseña"],
    ["contrasena", "contraseña"],
    ["modulo", "módulo"],
    ["modulos", "módulos"],
    ["sesion", "sesión"],
    ["sesiones", "sesiones"],
    ["edicion", "edición"],
    ["ediciones", "ediciones"],
    ["practica", "práctica"],
    ["practicas", "prácticas"],
    ["bibliografia", "bibliografía"],
    ["opcion", "opción"],
    ["minimo", "mínimo"],
    ["minima", "mínima"],
    ["maxima", "máxima"],
    ["basico", "básico"],
    ["basica", "básica"],
    ["intermedia", "intermedia"],
    ["automatico", "automático"],
    ["automatica", "automática"],
    ["automaticamente", "automáticamente"],
    ["autonomo", "autónomo"],
    ["autonoma", "autónoma"],
    ["tecnico", "técnico"],
    ["politicas", "políticas"],
    ["recomendacion", "recomendación"],
    ["Revision", "Revisión"],
    ["revision", "revisión"],
    ["ultimo", "último"],
    ["ultimos", "últimos"],
    ["numero", "número"],
    ["unico", "único"],
    ["utiles", "útiles"],
    ["rapido", "rápido"],
    ["tambien", "también"],
    ["facil", "fácil"],
    ["mas", "más"],
    ["linea", "línea"],
    ["Guia", "Guía"],
    ["guia", "guía"],
  ];
  for (const [from, to] of replacements) {
    out = out.replace(new RegExp(`\\b${from}\\b`, "g"), to);
  }
  return out;
}

function ensure(height) {
  if (doc.y + height > page.bottom) {
    doc.addPage();
  }
}

function text(txt, options = {}) {
  const rendered = es(txt);
  const size = options.size || 10.5;
  const color = options.color || colors.text;
  const width = options.width || pageWidth();
  const align = options.align || "left";
  const lineGap = options.lineGap ?? 2.5;
  const font = options.bold ? "Helvetica-Bold" : "Helvetica";
  doc.font(font).fontSize(size).fillColor(color).text(rendered, {
    width,
    align,
    lineGap,
    continued: options.continued || false,
  });
}

function title(txt) {
  ensure(70);
  doc.x = page.left;
  doc.moveDown(0.4);
  doc.font("Helvetica-Bold").fontSize(20).fillColor(colors.blueDark).text(es(txt), page.left, doc.y, {
    width: pageWidth(),
    lineGap: 2,
  });
  doc.moveDown(0.35);
  doc.strokeColor(colors.blue).lineWidth(2).moveTo(page.left, doc.y).lineTo(page.right, doc.y).stroke();
  doc.moveDown(0.7);
}

function subtitle(txt) {
  ensure(44);
  doc.x = page.left;
  doc.moveDown(0.3);
  doc.font("Helvetica-Bold").fontSize(14).fillColor(colors.blueDark).text(es(txt), page.left, doc.y, {
    width: pageWidth(),
    lineGap: 2,
  });
  doc.moveDown(0.25);
}

function smallHeading(txt) {
  ensure(30);
  doc.x = page.left;
  doc.font("Helvetica-Bold").fontSize(11.5).fillColor(colors.text).text(es(txt), page.left, doc.y, {
    width: pageWidth(),
  });
  doc.moveDown(0.15);
}

function paragraph(txt) {
  ensure(42);
  doc.x = page.left;
  text(txt, { size: 10.5, color: colors.text });
  doc.moveDown(0.5);
}

function muted(txt) {
  ensure(36);
  doc.x = page.left;
  text(txt, { size: 9.5, color: colors.muted });
  doc.moveDown(0.45);
}

function bullet(items, options = {}) {
  const indent = options.indent || 13;
  const bulletGap = options.bulletGap || 8;
  const size = options.size || 10.2;
  for (const item of items) {
    ensure(28);
    const y = doc.y + 4;
    doc.circle(page.left + 3, y, 2).fill(options.color || colors.blue);
    doc.x = page.left + indent;
    doc.y -= 2;
    text(item, {
      size,
      color: options.textColor || colors.text,
      width: pageWidth() - indent,
    });
    doc.moveDown(0.22);
    doc.x = page.left;
    doc.y += bulletGap - 8;
  }
  doc.moveDown(0.15);
}

function numbered(items) {
  let i = 1;
  for (const item of items) {
    ensure(34);
    const label = `${i}.`;
    doc.font("Helvetica-Bold").fontSize(10.5).fillColor(colors.blue).text(label, page.left, doc.y, { width: 24 });
    doc.x = page.left + 28;
    doc.y -= 14;
    text(item, { size: 10.3, width: pageWidth() - 28 });
    doc.x = page.left;
    doc.moveDown(0.34);
    i += 1;
  }
}

function callout(kind, heading, body) {
  const palette = {
    tip: { bg: colors.blueSoft, border: colors.blue, label: "Consejo" },
    warn: { bg: "#fff4df", border: colors.amber, label: "Atención" },
    ok: { bg: "#e8f6ef", border: colors.green, label: "Listo cuando" },
    danger: { bg: "#fdeceb", border: colors.red, label: "Evitar" },
  }[kind || "tip"];
  const h = Math.max(70, doc.heightOfString(body, { width: pageWidth() - 34 }) + 44);
  ensure(h + 8);
  const y = doc.y;
  doc.roundedRect(page.left, y, pageWidth(), h, 6).fillAndStroke(palette.bg, palette.border);
  doc.font("Helvetica-Bold").fontSize(10).fillColor(palette.border).text(es(`${palette.label}: ${heading}`), page.left + 16, y + 12, {
    width: pageWidth() - 32,
  });
  doc.font("Helvetica").fontSize(9.8).fillColor(colors.text).text(es(body), page.left + 16, y + 31, {
    width: pageWidth() - 32,
    lineGap: 2,
  });
  doc.y = y + h + 20;
  doc.x = page.left;
}

function table(headers, rows, widths) {
  const x = page.left;
  const rowPad = 7;
  const headerH = 28;
  ensure(headerH + 40);
  let y = doc.y;

  doc.rect(x, y, pageWidth(), headerH).fill(colors.blue);
  let cx = x;
  headers.forEach((h, idx) => {
    doc.font("Helvetica-Bold").fontSize(9.2).fillColor(colors.white).text(es(h), cx + rowPad, y + 8, {
      width: widths[idx] - rowPad * 2,
    });
    cx += widths[idx];
  });
  y += headerH;

  rows.forEach((row) => {
    const heights = row.map((cell, idx) => doc.heightOfString(String(cell), {
      width: widths[idx] - rowPad * 2,
      lineGap: 1.8,
    }) + rowPad * 2);
    const rh = Math.max(34, ...heights);
    if (y + rh > page.bottom) {
      doc.addPage();
      y = page.top;
    }
    doc.rect(x, y, pageWidth(), rh).fill("#fbfdff").stroke(colors.line);
    cx = x;
    row.forEach((cell, idx) => {
      doc.strokeColor(colors.line).lineWidth(0.5).moveTo(cx, y).lineTo(cx, y + rh).stroke();
      doc.font(idx === 0 ? "Helvetica-Bold" : "Helvetica")
        .fontSize(9.2)
        .fillColor(idx === 0 ? colors.blueDark : colors.text)
        .text(es(cell), cx + rowPad, y + rowPad, {
          width: widths[idx] - rowPad * 2,
          lineGap: 1.8,
        });
      cx += widths[idx];
    });
    doc.strokeColor(colors.line).moveTo(x + pageWidth(), y).lineTo(x + pageWidth(), y + rh).stroke();
    y += rh;
  });
  doc.y = y + 14;
}

function checklist(items) {
  for (const item of items) {
    ensure(24);
    doc.rect(page.left, doc.y + 1, 10, 10).stroke(colors.blue);
    doc.x = page.left + 18;
    doc.y -= 2;
    text(item, { size: 10.1, width: pageWidth() - 18 });
    doc.x = page.left;
    doc.moveDown(0.28);
  }
}

function divider() {
  ensure(14);
  doc.moveDown(0.3);
  doc.strokeColor(colors.line).lineWidth(1).moveTo(page.left, doc.y).lineTo(page.right, doc.y).stroke();
  doc.moveDown(0.7);
}

function cover() {
  doc.rect(0, 0, page.width, page.height).fill("#f4f7fa");
  doc.rect(0, 0, page.width, 120).fill(colors.blue);
  doc.fillColor(colors.white).font("Helvetica-Bold").fontSize(13).text(es("REDUNIV - Plataforma de cursos en linea"), page.left, 42, {
    width: pageWidth(),
  });
  doc.font("Helvetica").fontSize(10).text(es("Manual operativo para profesores"), page.left, 64);

  if (fs.existsSync(HERO)) {
    doc.image(HERO, page.left, 150, { width: pageWidth(), height: 190 });
  }

  doc.fillColor(colors.blueDark).font("Helvetica-Bold").fontSize(30).text("Cómo montar un curso en la plataforma", page.left, 380, {
    width: pageWidth(),
    lineGap: 4,
  });
  doc.fillColor(colors.text).font("Helvetica").fontSize(14).text(es("Guía práctica para diseñar, organizar y publicar cursos en la plataforma."), page.left, 470, {
    width: pageWidth(),
    lineGap: 4,
  });
  doc.fillColor(colors.muted).fontSize(10.5).text(es("Uso recomendado: leer primero, preparar el curso offline y luego registrarlo en el CMS académico."), page.left, 540, {
    width: pageWidth(),
    lineGap: 3,
  });
  doc.addPage();
}

function toc() {
  title("Indice rapido");
  numbered([
    "Que vamos a montar y que debe traer preparado el profesor.",
    "Entrar al sistema y abrir el CMS academico.",
    "Crear el curso desde cero como borrador.",
    "Completar la ficha MOOC correctamente.",
    "Crear ediciones del curso.",
    "Crear modulos.",
    "Crear sesiones o lecciones.",
    "Agregar videos externos o videos subidos.",
    "Agregar bibliografia, materiales complementarios y objetos de aprendizaje.",
    "Crear banco de preguntas y evaluacion final.",
    "Publicar el curso y revisar como lo ve el estudiante.",
    "Checklist final y errores frecuentes.",
  ]);
  callout("tip", "Idea principal", "Primero se guarda el curso como borrador. Despues se completan ediciones, modulos, sesiones, videos, recursos y evaluacion. Solo al final se publica.");
}

function intro() {
  title("1. Antes de empezar: que es montar un curso");
  paragraph("Montar un curso no es solamente subir videos. En esta plataforma, un curso tipo MOOC debe quedar organizado para que el estudiante pueda aprender de forma autonoma, avanzar por sesiones, revisar materiales, realizar una evaluacion automatica y, si corresponde, obtener un certificado.");
  paragraph("El profesor no necesita tocar la base de datos ni pedir cambios tecnicos para crear el curso. Todo se hace desde el CMS academico, usando formularios.");
  subtitle("Conceptos basicos");
  table(
    ["Concepto", "Que significa", "Ejemplo"],
    [
      ["Curso", "La experiencia completa que vera el estudiante.", "Diseno y produccion de cursos MOOC"],
      ["Ficha MOOC", "La informacion academica y publica del curso.", "Objetivos, publico, requisitos, duracion, nivel"],
      ["Edicion", "Una convocatoria o version del curso.", "Edicion febrero 2027, Edicion intensiva"],
      ["Modulo", "Bloque grande de contenido.", "Modulo 1: fundamentos"],
      ["Sesion", "Leccion breve dentro de un modulo.", "1.1 Que es un MOOC"],
      ["Video", "Recurso audiovisual principal de la sesion.", "YouTube, Vimeo, enlace externo o archivo subido"],
      ["Material", "Bibliografia o recurso adicional.", "PDF, lectura, presentacion, repositorio"],
      ["Practica", "Actividad no necesariamente calificada.", "Reflexione, complete una plantilla, analice un caso"],
      ["Evaluacion", "Prueba automatica del curso.", "Seleccion multiple, verdadero/falso, respuesta corta"],
      ["Certificado", "Documento emitido cuando el estudiante cumple los requisitos.", "PDF con verificacion publica"],
    ],
    [95, 245, pageWidth() - 340]
  );
  callout("warn", "Regla simple", "Si el estudiante no puede entender que debe hacer sin llamar al profesor, el curso todavia no esta listo como MOOC.");
}

function preparation() {
  title("2. Lo que el profesor debe preparar antes de entrar al CMS");
  paragraph("Aunque el sistema permite escribir directamente en los formularios, lo mas ordenado es preparar primero el curso en un documento offline. Esto evita errores, textos incompletos y sesiones desordenadas.");
  subtitle("Material minimo recomendado");
  checklist([
    "Titulo del curso.",
    "Descripcion breve: de que trata y que problema ayuda a resolver.",
    "Objetivos de aprendizaje: que podra hacer el estudiante al finalizar.",
    "Publico objetivo: para quien es el curso.",
    "Requisitos: que debe saber o tener antes de empezar.",
    "Competencias que desarrollara.",
    "Duracion estimada total en horas.",
    "Dedicacion semanal recomendada.",
    "Nivel: basico, intermedio o avanzado.",
    "Lista de modulos.",
    "Lista de sesiones por modulo.",
    "Video o enlace principal de cada sesion.",
    "Bibliografia y materiales complementarios.",
    "Actividades de practica.",
    "Preguntas de evaluacion con respuestas correctas y retroalimentacion.",
  ]);
  callout("tip", "Plantilla disponible", "Use la plantilla offline existente en docs/plantilla-diseno-mooc-profesores.html para preparar el curso antes de montarlo.");

  subtitle("Estructura recomendada para un primer MOOC");
  table(
    ["Elemento", "Cantidad sugerida", "Comentario"],
    [
      ["Modulos", "3 a 5", "Cada modulo debe tener un objetivo claro."],
      ["Sesiones por modulo", "2 a 4", "Mejor sesiones breves que clases largas."],
      ["Duracion de video", "5 a 15 minutos", "Si el tema es largo, dividirlo en varios videos."],
      ["Materiales", "1 a 3 por modulo", "Separar bibliografia de video principal."],
      ["Preguntas", "8 a 20 para iniciar", "Usar banco de preguntas para poder aleatorizar."],
      ["Intentos", "2 o 3", "Suficiente para aprender sin convertirlo en prueba infinita."],
    ],
    [130, 130, pageWidth() - 260]
  );
}

function accessCms() {
  title("3. Entrar al sistema y abrir el CMS academico");
  paragraph("El CMS academico es la zona donde se crean y administran cursos, modulos, sesiones, videos, materiales, evaluaciones y banco de preguntas.");
  subtitle("Pasos para entrar");
  numbered([
    "Abra el navegador y entre a la direccion de la plataforma. En produccion sera https://cursos.reduniv.edu.cu.",
    "Pulse Iniciar sesion o vaya a /es/login.",
    "Escriba su usuario y contrasena.",
    "Cuando entre, vaya al Panel o Dashboard.",
    "Busque la opcion CMS Academico.",
    "Si no aparece el CMS, su usuario probablemente no tiene rol de instructor o administrador. Debe solicitar el permiso.",
  ]);
  callout("warn", "No comparta su usuario", "Cada profesor debe trabajar con su propia cuenta. Eso permite saber quien creo o modifico cada curso.");
}

function createCourse() {
  title("4. Crear el curso como borrador");
  paragraph("El primer guardado del curso debe hacerse como borrador. No intente publicarlo de inmediato. La plataforma exige contenido minimo para publicar: una edicion publicada, al menos una sesion publicada con video y datos comerciales validos si el curso es pago.");
  subtitle("Pasos");
  numbered([
    "Entre al CMS Academico.",
    "Pulse Nuevo curso o Crear curso.",
    "Complete los datos basicos: titulo, descripcion y slug.",
    "Deje el estado como Borrador mientras todavia esta trabajando.",
    "Seleccione visibilidad publica si el curso aparecera en catalogo al publicarse.",
    "Defina si el curso es gratuito o pago.",
    "Pulse Guardar curso.",
  ]);
  subtitle("Como escribir el slug");
  paragraph("El slug es el identificador corto que va en la URL. Debe escribirse en minusculas, sin espacios, sin acentos y separado por guiones.");
  table(
    ["Titulo", "Slug correcto", "Slug incorrecto"],
    [
      ["Diseno y produccion de cursos MOOC", "diseno-produccion-cursos-mooc", "Diseño Producción MOOC"],
      ["Introduccion a la inteligencia artificial", "introduccion-inteligencia-artificial", "intro IA 2026"],
      ["Gestion de proyectos educativos", "gestion-proyectos-educativos", "gestión_de_proyectos"],
    ],
    [190, 185, pageWidth() - 375]
  );
  callout("danger", "Error frecuente", "No pulse Publicar curso si aun no ha creado sesiones con video. Si lo hace, el sistema mostrara un error indicando que falta contenido publicable.");
}

function fichaMooc() {
  title("5. Completar la ficha MOOC");
  paragraph("La ficha MOOC es lo que ayuda al estudiante a decidir si el curso le sirve. Tambien ayuda a los expertos y responsables academicos a evaluar la calidad del curso antes de publicarlo.");
  subtitle("Campos principales y como llenarlos");
  table(
    ["Campo", "Que escribir", "Ejemplo sencillo"],
    [
      ["Titulo", "Nombre claro y directo del curso.", "Diseno y produccion de cursos MOOC"],
      ["Descripcion", "Resumen de que aprendera el estudiante y para que le sirve.", "Curso practico para disenar, organizar y publicar MOOCs."],
      ["Objetivos", "Resultados observables. Use verbos como identificar, disenar, aplicar, evaluar.", "Disenar la ficha academica de un curso MOOC."],
      ["Publico objetivo", "Personas a quienes va dirigido.", "Profesores universitarios y equipos docentes."],
      ["Requisitos", "Conocimientos o condiciones previas.", "Manejo basico de computadora e Internet."],
      ["Competencias", "Capacidades que desarrollara.", "Planificacion didactica, evaluacion automatica, curaduria de recursos."],
      ["Duracion", "Horas totales estimadas.", "20 horas"],
      ["Dedicacion semanal", "Tiempo recomendado por semana.", "4 horas por semana"],
      ["Nivel", "Basico, intermedio o avanzado.", "Basico"],
      ["Certificado", "Indique si el curso emitira certificado.", "Si, al completar progreso y aprobar evaluacion."],
    ],
    [105, 245, pageWidth() - 350]
  );
  callout("tip", "Objetivos bien escritos", "Evite objetivos vagos como 'conocer sobre el tema'. Use acciones verificables: 'identificar', 'comparar', 'disenar', 'resolver', 'aplicar', 'evaluar'.");
}

function editions() {
  title("6. Crear la edicion del curso");
  paragraph("Una edicion representa una convocatoria, cohorte o version del curso. Incluso si el curso es autodirigido, conviene tener al menos una edicion publicada para que la matricula funcione correctamente.");
  subtitle("Pasos");
  numbered([
    "Seleccione el curso en el CMS.",
    "Abra la pestana Ediciones.",
    "Pulse Nueva edicion.",
    "Escriba un nombre claro: Edicion inicial, Convocatoria enero 2027, Cohorte profesores.",
    "Si aplica, defina fecha de inicio y fecha de fin.",
    "Si hay limite de cupos, escriba la capacidad.",
    "Marque la edicion como publicada.",
    "Si sera la edicion principal, marquela como edicion por defecto.",
    "Guarde.",
  ]);
  callout("ok", "Edicion lista", "Debe existir al menos una edicion publicada antes de publicar el curso.");
}

function modules() {
  title("7. Crear modulos");
  paragraph("Los modulos organizan el curso en bloques. Un buen modulo agrupa contenidos relacionados y tiene un objetivo propio.");
  subtitle("Pasos");
  numbered([
    "Seleccione el curso.",
    "Abra la pestana Modulos.",
    "Pulse Nuevo modulo.",
    "Escriba el titulo del modulo.",
    "Agregue una descripcion breve u objetivo del modulo.",
    "Defina el orden: 1, 2, 3...",
    "Seleccione estado Publicado si ya esta listo.",
    "Guarde el modulo.",
    "Repita el proceso para cada modulo del curso.",
  ]);
  subtitle("Ejemplo de modulos");
  table(
    ["Orden", "Modulo", "Objetivo"],
    [
      ["1", "Fundamentos del modelo MOOC", "Comprender que diferencia un MOOC de un LMS tradicional."],
      ["2", "Diseno de la ficha academica", "Construir objetivos, publico, requisitos y criterios de aprobacion."],
      ["3", "Produccion de contenidos", "Organizar videos, recursos y actividades de practica."],
      ["4", "Evaluacion y certificacion", "Crear banco de preguntas y definir requisitos de certificado."],
    ],
    [55, 210, pageWidth() - 265]
  );
}

function sessions() {
  title("8. Crear sesiones o lecciones");
  paragraph("La sesion es la unidad que el estudiante completa. Una sesion debe ser breve, clara y tener un recurso principal, normalmente un video.");
  subtitle("Campos de una sesion");
  table(
    ["Campo", "Como llenarlo"],
    [
      ["Modulo", "Seleccione el modulo al que pertenece. Si aun no sabe, puede dejarla sin modulo, pero no es lo ideal."],
      ["Titulo", "Use numeracion sencilla: 1.1 Que es un MOOC, 1.2 Buenas practicas."],
      ["Descripcion", "Explique que se aprende en esa sesion."],
      ["Tipo", "Normalmente grabada. Use en vivo solo si habra encuentro sincronico."],
      ["Orden", "Orden dentro del modulo. Si hay tres sesiones: 1, 2, 3."],
      ["Vista previa", "Marque solo si quiere que se vea antes de matricularse."],
      ["Estado", "Publicado si ya esta lista. Borrador si falta contenido."],
    ],
    [120, pageWidth() - 120]
  );
  subtitle("Pasos");
  numbered([
    "Abra la pestana Sesiones y videos.",
    "Pulse Nueva sesion.",
    "Seleccione el modulo.",
    "Escriba titulo y descripcion.",
    "Indique orden.",
    "Agregue video o enlace principal.",
    "Agregue materiales complementarios si existen.",
    "Escriba la practica o actividad sugerida.",
    "Marque estado Publicado cuando este completa.",
    "Guarde la sesion.",
  ]);
  callout("tip", "Duracion recomendada", "Un video de 8 a 12 minutos suele ser mas facil de completar que una conferencia de una hora. Si la clase dura 60 minutos, divida en 5 o 6 sesiones.");
}

function videos() {
  title("9. Agregar videos");
  paragraph("La plataforma acepta videos externos y videos subidos. La recomendacion institucional es usar videos externos cuando sea posible, por ejemplo YouTube, Vimeo u otra plataforma autorizada. La subida local se reserva para casos en que el video no pueda estar en un servicio externo.");
  subtitle("Opcion A: video externo");
  numbered([
    "Copie la URL del video desde YouTube, Vimeo u otra plataforma.",
    "En la sesion, seleccione la plataforma correspondiente.",
    "Pegue la URL en el campo de video.",
    "Guarde la sesion.",
    "Revise la vista del curso para comprobar que el video se ve o que el enlace abre correctamente.",
  ]);
  subtitle("Opcion B: subir video");
  numbered([
    "En la sesion, pulse Subir video.",
    "Seleccione el archivo desde su computadora.",
    "Espere a que termine la subida. No cierre la pagina durante la subida.",
    "El sistema colocara la URL generada en el campo de video.",
    "Guarde la sesion.",
  ]);
  callout("warn", "Videos pesados", "Antes de subir un video local, confirme que esta comprimido y que realmente necesita estar en la plataforma. Videos muy grandes consumen almacenamiento y tardan mas en cargar.");
  table(
    ["Caso", "Recomendacion"],
    [
      ["Video ya publicado en YouTube/Vimeo", "Use enlace externo."],
      ["Video institucional que no puede estar publico", "Suba el archivo o use repositorio institucional autorizado."],
      ["Clase larga grabada", "Divida en videos cortos antes de montar el curso."],
      ["Video sin audio claro", "No lo publique hasta corregirlo o agregar material alternativo."],
    ],
    [190, pageWidth() - 190]
  );
}

function resources() {
  title("10. Agregar bibliografia y materiales complementarios");
  paragraph("Los materiales complementarios no son parte del video. Deben aparecer como recursos separados para que el estudiante pueda descargarlos o consultarlos. Pueden ser enlaces externos, objetos de aprendizaje en repositorios o archivos subidos.");
  subtitle("Tipos de material");
  table(
    ["Tipo", "Ejemplos", "Como registrarlo"],
    [
      ["PDF", "Lectura, guia, articulo, plantilla", "Subir archivo o pegar URL si esta en repositorio."],
      ["Presentacion", "Diapositivas de la clase", "Subir archivo o enlazar repositorio."],
      ["Enlace externo", "Articulo web, video adicional, biblioteca digital", "Agregar titulo y URL."],
      ["Objeto de aprendizaje", "Recurso en repositorio institucional", "Agregar titulo, URL y origen Repositorio."],
      ["Dataset o archivo", "Datos para ejercicio", "Subir archivo o enlazar ubicacion autorizada."],
    ],
    [110, 190, pageWidth() - 300]
  );
  subtitle("Pasos para agregar un enlace");
  numbered([
    "Dentro de la sesion, busque la seccion de materiales o recursos.",
    "Escriba un titulo entendible. No escriba solo 'link'.",
    "Pegue la URL.",
    "Seleccione tipo u origen si el formulario lo permite.",
    "Agregue el recurso.",
    "Guarde la sesion.",
  ]);
  subtitle("Pasos para subir un archivo");
  numbered([
    "Pulse Subir material.",
    "Seleccione el archivo.",
    "Espere a que termine la subida.",
    "Revise que el recurso aparezca en la lista.",
    "Guarde la sesion.",
  ]);
  callout("danger", "Error frecuente", "No pegue bibliografia dentro del campo de video. El video va en su campo. La bibliografia va en materiales complementarios.");
}

function practices() {
  title("11. Agregar practica o actividad de aprendizaje");
  paragraph("La practica ayuda al estudiante a aplicar lo aprendido. No todo tiene que ser calificado. En un MOOC, muchas actividades sirven para reforzar el aprendizaje de forma autonoma.");
  subtitle("Ejemplos de practicas utiles");
  bullet([
    "Complete una tabla comparando dos conceptos.",
    "Revise un caso y responda tres preguntas.",
    "Descargue una plantilla y complete la primera version.",
    "Busque un ejemplo real y clasifiquelo usando los criterios vistos.",
    "Escriba una reflexion breve sobre como aplicaria el tema en su contexto.",
  ]);
  callout("tip", "Buena practica", "Redacte la actividad como una instruccion concreta. El estudiante debe saber exactamente que hacer y cuanto tiempo aproximado dedicar.");
}

function questionBank() {
  title("12. Crear banco de preguntas");
  paragraph("El banco de preguntas permite reutilizar preguntas y armar evaluaciones con seleccion aleatoria. Esto es importante para cursos masivos, porque reduce copias identicas y facilita nuevas ediciones del curso.");
  subtitle("Tipos de preguntas disponibles");
  table(
    ["Tipo", "Uso recomendado", "Ejemplo"],
    [
      ["Seleccion multiple", "Cuando hay varias opciones y una respuesta correcta.", "Cual es una caracteristica de un MOOC?"],
      ["Verdadero/Falso", "Para comprobar afirmaciones concretas.", "Un MOOC debe depender de tutorias individuales obligatorias."],
      ["Respuesta corta", "Para terminos o respuestas breves.", "Que sigla se usa para Massive Open Online Course?"],
    ],
    [125, 210, pageWidth() - 335]
  );
  subtitle("Campos de cada pregunta");
  bullet([
    "Pregunta: texto claro y sin ambiguedades.",
    "Opciones: solo para seleccion multiple. Deben ser plausibles.",
    "Respuesta correcta: exactamente como el sistema debe corregir.",
    "Puntos: valor de la pregunta.",
    "Retroalimentacion: explicacion que vera el estudiante despues de responder.",
    "Etiquetas: palabras para filtrar, como video, evaluacion, modulo1.",
    "Dificultad: basica, intermedia o avanzada.",
    "Tema: asunto especifico.",
    "Modulo: modulo al que pertenece la pregunta.",
  ]);
  callout("warn", "Respuesta corta", "En preguntas de respuesta corta, evite respuestas largas o con muchas variantes. Si hay muchas formas correctas, mejor use seleccion multiple.");
}

function evaluation() {
  title("13. Crear la evaluacion final");
  paragraph("La evaluacion final es la prueba que permite comprobar si el estudiante alcanzo los objetivos del curso. En la plataforma se corrige automaticamente.");
  subtitle("Pasos");
  numbered([
    "Seleccione el curso.",
    "Abra la pestana Evaluacion.",
    "Escriba titulo y descripcion.",
    "Defina la nota minima para aprobar. Ejemplo: 70 u 80.",
    "Defina cantidad maxima de intentos.",
    "Active retroalimentacion si desea que el estudiante vea explicaciones.",
    "Active aleatorizacion de preguntas y opciones si el curso tendra muchos estudiantes.",
    "Agregue preguntas manualmente o seleccione desde el banco.",
    "Revise que cada pregunta tenga respuesta correcta.",
    "Guarde la evaluacion.",
  ]);
  subtitle("Como seleccionar preguntas desde el banco");
  numbered([
    "Abra Banco o Evaluacion, segun la pantalla disponible.",
    "Filtre por etiqueta, dificultad, tema o modulo si desea una seleccion especifica.",
    "Indique cuantas preguntas quiere usar.",
    "Aplique la seleccion.",
    "Revise el resultado antes de guardar.",
  ]);
  callout("ok", "Evaluacion lista", "Debe tener titulo, nota minima, intentos definidos y preguntas con respuestas correctas. Si falta la respuesta correcta, la correccion automatica no funcionara bien.");
}

function publish() {
  title("14. Publicar el curso");
  paragraph("Publicar significa que el curso queda visible y utilizable segun su configuracion. Antes de publicar, revise que el curso no sea solo una ficha vacia.");
  subtitle("Condiciones minimas para publicar");
  checklist([
    "El curso tiene titulo y descripcion.",
    "La ficha MOOC esta completa.",
    "Existe al menos una edicion publicada.",
    "Existe al menos un modulo o una estructura clara de sesiones.",
    "Existe al menos una sesion publicada.",
    "Al menos una sesion publicada tiene video o recurso principal.",
    "Si el curso es pago, tiene precio y moneda validos.",
    "La evaluacion esta configurada si el curso emitira certificado.",
  ]);
  subtitle("Pasos para publicar");
  numbered([
    "Seleccione el curso en el CMS.",
    "Revise el checklist anterior.",
    "Pulse Publicar curso.",
    "Si aparece un error, lea que falta. Normalmente falta una sesion publicada con video o una edicion publicada.",
    "Corrija lo indicado.",
    "Vuelva a publicar.",
  ]);
  callout("tip", "Revision final", "Despues de publicar, abra el catalogo como si fuera un estudiante. Entre al curso y revise que titulo, descripcion, modulos, sesiones, videos y materiales se vean correctamente.");
}

function studentReview() {
  title("15. Revisar el curso como estudiante");
  paragraph("El profesor debe revisar el curso publicado desde la mirada del estudiante. Esto ayuda a detectar textos confusos, recursos mal ubicados y videos que no cargan.");
  subtitle("Ruta de revision");
  numbered([
    "Abra el catalogo publico.",
    "Busque el curso.",
    "Entre a la ficha.",
    "Revise objetivos, publico, requisitos, duracion y certificado.",
    "Matricule un usuario de prueba si esta disponible.",
    "Abra cada modulo.",
    "Revise cada sesion.",
    "Compruebe que los videos abran.",
    "Abra los materiales complementarios.",
    "Marque sesiones como completadas.",
    "Cuando llegue al 100%, pruebe la evaluacion.",
    "Si aprueba, pruebe la emision del certificado.",
  ]);
  callout("warn", "No revise solo como profesor", "El CMS puede verse correcto, pero el estudiante puede encontrar enlaces rotos, instrucciones poco claras o sesiones fuera de orden.");
}

function commonErrors() {
  title("16. Errores frecuentes y como resolverlos");
  table(
    ["Problema", "Causa probable", "Solucion"],
    [
      ["No puedo publicar el curso", "Falta edicion publicada o sesion publicada con video.", "Cree una edicion publicada y al menos una sesion publicada con video."],
      ["El video no se ve", "URL incorrecta o plataforma mal seleccionada.", "Revise la URL, pruebe abrirla en otra pestana y seleccione la plataforma correcta."],
      ["El material no abre", "Archivo no subido, enlace roto o URL privada.", "Suba de nuevo el archivo o use un enlace publico/autorizado."],
      ["Las sesiones salen desordenadas", "Orden repetido o mal escrito.", "Revise el numero de orden de cada sesion dentro del modulo."],
      ["La evaluacion corrige mal", "Respuesta correcta mal escrita o pregunta ambigua.", "Revise la respuesta correcta y la redaccion."],
      ["El estudiante no puede certificarse", "No completo 100%, no aprobo evaluacion o el curso no tiene certificado habilitado.", "Revise progreso, evaluacion y configuracion de certificado."],
      ["No veo el CMS", "Usuario sin rol de instructor o administrador.", "Solicite asignacion de rol."],
      ["Subida de archivo falla", "Archivo demasiado grande, red inestable o sesion vencida.", "Reduzca tamano, intente de nuevo y verifique que sigue logueado."],
    ],
    [130, 185, pageWidth() - 315]
  );
}

function finalChecklist() {
  title("17. Checklist final antes de entregar el curso");
  checklist([
    "El titulo del curso es claro.",
    "La descripcion explica que aprendera el estudiante.",
    "Los objetivos usan verbos observables.",
    "El publico objetivo esta definido.",
    "Los requisitos son realistas.",
    "Las competencias estan escritas.",
    "La duracion total y dedicacion semanal estan completas.",
    "El curso tiene al menos una edicion publicada.",
    "El curso tiene modulos ordenados.",
    "Cada modulo tiene objetivo o descripcion.",
    "Cada sesion tiene titulo, descripcion y orden.",
    "Las sesiones publicadas tienen video o recurso principal.",
    "La bibliografia esta como material complementario, no mezclada con el video.",
    "Los enlaces externos abren correctamente.",
    "Los archivos subidos abren correctamente.",
    "Las practicas tienen instrucciones claras.",
    "El banco de preguntas tiene respuestas correctas.",
    "La evaluacion tiene nota minima e intentos.",
    "La evaluacion fue probada con un usuario de prueba.",
    "El certificado esta habilitado solo si corresponde.",
    "El curso fue revisado desde la vista de estudiante.",
  ]);
  callout("ok", "Curso listo para revision", "Si puede marcar todos los puntos anteriores, el curso esta listo para que el equipo academico o de QA lo revise.");
}

function glossary() {
  title("18. Glosario rapido");
  table(
    ["Palabra", "Explicacion sencilla"],
    [
      ["CMS", "Zona de la plataforma donde se crean y editan cursos."],
      ["MOOC", "Curso en linea, masivo, abierto o de acceso amplio, pensado para aprendizaje autonomo."],
      ["Slug", "Nombre corto de la URL del curso."],
      ["Edicion", "Convocatoria o version del curso."],
      ["Modulo", "Bloque academico del curso."],
      ["Sesion", "Leccion breve dentro de un modulo."],
      ["Preview", "Sesion visible como muestra antes de matricularse."],
      ["Banco de preguntas", "Lista reutilizable de preguntas para evaluaciones."],
      ["Feedback", "Retroalimentacion que explica por que una respuesta es correcta o incorrecta."],
      ["Certificado verificable", "Certificado con identificador y pagina publica para comprobar su validez."],
    ],
    [130, pageWidth() - 130]
  );
}

cover();
toc();
intro();
preparation();
accessCms();
createCourse();
fichaMooc();
editions();
modules();
sessions();
videos();
resources();
practices();
questionBank();
evaluation();
publish();
studentReview();
commonErrors();
finalChecklist();
glossary();

const range = doc.bufferedPageRange();
for (let i = range.start; i < range.start + range.count; i += 1) {
  doc.switchToPage(i);
  if (i === 0) continue;
  doc.fillColor(colors.muted).font("Helvetica").fontSize(8.5)
    .text(es("Manual para profesores - Plataforma de cursos en linea"), page.left, page.height - 30, {
      width: pageWidth() / 2,
      align: "left",
    });
  doc.fillColor(colors.muted).font("Helvetica").fontSize(8.5)
    .text(es(`Pagina ${i + 1} de ${range.count}`), page.left, page.height - 30, {
      width: pageWidth(),
      align: "right",
    });
}

doc.end();
console.log(OUT);
