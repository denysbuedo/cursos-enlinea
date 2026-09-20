const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const docsDir = path.join(root, "docs");
const tmpRoot = path.join(root, ".tmp-docx");

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function paragraph(text = "", style = "Normal") {
  const lines = String(text).split("\n");
  const runs = lines.map((line, index) => {
    const br = index > 0 ? "<w:br/>" : "";
    return `<w:r>${br}<w:t xml:space="preserve">${escapeXml(line)}</w:t></w:r>`;
  }).join("");
  return `<w:p><w:pPr><w:pStyle w:val="${style}"/></w:pPr>${runs}</w:p>`;
}

function pageBreak() {
  return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
}

function table(rows) {
  const grid = rows[0].map(() => '<w:gridCol w:w="3000"/>').join("");
  const body = rows.map((row) => {
    const cells = row.map((cell) => (
      `<w:tc><w:tcPr><w:tcW w:w="3000" w:type="dxa"/></w:tcPr>${paragraph(cell)}</w:tc>`
    )).join("");
    return `<w:tr>${cells}</w:tr>`;
  }).join("");
  return `<w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/><w:tblW w:w="0" w:type="auto"/><w:tblLook w:val="04A0"/></w:tblPr><w:tblGrid>${grid}</w:tblGrid>${body}</w:tbl>`;
}

function bullet(text) {
  return paragraph(`• ${text}`, "Bullet");
}

function note(text) {
  return paragraph(text, "Note");
}

function stylesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/><w:pPr><w:spacing w:after="150" w:line="276" w:lineRule="auto"/></w:pPr><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="22"/><w:color w:val="17212B"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr><w:spacing w:after="180"/></w:pPr><w:rPr><w:b/><w:sz w:val="36"/><w:color w:val="003F78"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Subtitle"><w:name w:val="Subtitle"/><w:basedOn w:val="Normal"/><w:qFormat/><w:rPr><w:sz w:val="24"/><w:color w:val="52667A"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="360" w:after="180"/></w:pPr><w:rPr><w:b/><w:sz w:val="30"/><w:color w:val="003F78"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="260" w:after="120"/></w:pPr><w:rPr><w:b/><w:sz w:val="25"/><w:color w:val="005AA9"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Bullet"><w:name w:val="Bullet"/><w:basedOn w:val="Normal"/><w:pPr><w:ind w:left="360" w:hanging="180"/><w:spacing w:after="80"/></w:pPr></w:style>
  <w:style w:type="paragraph" w:styleId="Note"><w:name w:val="Note"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:before="160" w:after="220"/><w:ind w:left="240" w:right="240"/></w:pPr><w:rPr><w:i/><w:color w:val="52667A"/></w:rPr></w:style>
  <w:style w:type="table" w:styleId="TableGrid"><w:name w:val="Table Grid"/><w:tblPr><w:tblBorders><w:top w:val="single" w:sz="4" w:color="D8E1EA"/><w:left w:val="single" w:sz="4" w:color="D8E1EA"/><w:bottom w:val="single" w:sz="4" w:color="D8E1EA"/><w:right w:val="single" w:sz="4" w:color="D8E1EA"/><w:insideH w:val="single" w:sz="4" w:color="D8E1EA"/><w:insideV w:val="single" w:sz="4" w:color="D8E1EA"/></w:tblBorders></w:tblPr></w:style>
</w:styles>`;
}

function contentTypesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`;
}

function rootRelsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`;
}

function documentRelsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;
}

function coreXml(title) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>${escapeXml(title)}</dc:title>
  <dc:creator>Plataforma de cursos en línea</dc:creator>
  <cp:lastModifiedBy>Plataforma de cursos en línea</cp:lastModifiedBy>
</cp:coreProperties>`;
}

function appXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>Codex</Application></Properties>`;
}

function buildDocXml(blocks) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${blocks.join("\n")}
    <w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr>
  </w:body>
</w:document>`;
}

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let k = 0; k < 8; k += 1) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(date = new Date()) {
  const year = Math.max(1980, date.getFullYear());
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const day = (year - 1980) << 9 | ((date.getMonth() + 1) << 5) | date.getDate();
  return { time, day };
}

function collectFiles(baseDir, relative = "") {
  const entries = fs.readdirSync(path.join(baseDir, relative), { withFileTypes: true });
  return entries.flatMap((entry) => {
    const next = path.join(relative, entry.name);
    if (entry.isDirectory()) return collectFiles(baseDir, next);
    return [next.replace(/\\/g, "/")];
  });
}

function createZip(sourceDir, outFile) {
  const preferred = [
    "[Content_Types].xml",
    "_rels/.rels",
    "word/document.xml",
    "word/styles.xml",
    "word/_rels/document.xml.rels",
    "docProps/app.xml",
    "docProps/core.xml"
  ];
  const allFiles = collectFiles(sourceDir);
  const files = [
    ...preferred.filter((name) => allFiles.includes(name)),
    ...allFiles.filter((name) => !preferred.includes(name)).sort()
  ];
  const locals = [];
  const central = [];
  let offset = 0;
  const { time, day } = dosDateTime();

  for (const name of files) {
    const data = fs.readFileSync(path.join(sourceDir, ...name.split("/")));
    const nameBuffer = Buffer.from(name, "utf8");
    const crc = crc32(data);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(day, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuffer.length, 26);
    local.writeUInt16LE(0, 28);
    locals.push(local, nameBuffer, data);

    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(0x02014b50, 0);
    cd.writeUInt16LE(20, 4);
    cd.writeUInt16LE(20, 6);
    cd.writeUInt16LE(0x0800, 8);
    cd.writeUInt16LE(0, 10);
    cd.writeUInt16LE(time, 12);
    cd.writeUInt16LE(day, 14);
    cd.writeUInt32LE(crc, 16);
    cd.writeUInt32LE(data.length, 20);
    cd.writeUInt32LE(data.length, 24);
    cd.writeUInt16LE(nameBuffer.length, 28);
    cd.writeUInt16LE(0, 30);
    cd.writeUInt16LE(0, 32);
    cd.writeUInt16LE(0, 34);
    cd.writeUInt16LE(0, 36);
    cd.writeUInt32LE(0, 38);
    cd.writeUInt32LE(offset, 42);
    central.push(cd, nameBuffer);
    offset += local.length + nameBuffer.length + data.length;
  }

  const centralSize = central.reduce((sum, part) => sum + part.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);
  fs.writeFileSync(outFile, Buffer.concat([...locals, ...central, end]));
}

function writeDocx(filename, title, blocks) {
  const workDir = path.join(tmpRoot, path.basename(filename, ".docx"));
  fs.rmSync(workDir, { recursive: true, force: true });
  fs.mkdirSync(path.join(workDir, "_rels"), { recursive: true });
  fs.mkdirSync(path.join(workDir, "word", "_rels"), { recursive: true });
  fs.mkdirSync(path.join(workDir, "docProps"), { recursive: true });
  fs.writeFileSync(path.join(workDir, "[Content_Types].xml"), contentTypesXml(), "utf8");
  fs.writeFileSync(path.join(workDir, "_rels", ".rels"), rootRelsXml(), "utf8");
  fs.writeFileSync(path.join(workDir, "word", "document.xml"), buildDocXml(blocks), "utf8");
  fs.writeFileSync(path.join(workDir, "word", "styles.xml"), stylesXml(), "utf8");
  fs.writeFileSync(path.join(workDir, "word", "_rels", "document.xml.rels"), documentRelsXml(), "utf8");
  fs.writeFileSync(path.join(workDir, "docProps", "core.xml"), coreXml(title), "utf8");
  fs.writeFileSync(path.join(workDir, "docProps", "app.xml"), appXml(), "utf8");

  const out = path.join(docsDir, filename);
  fs.rmSync(out, { force: true });
  createZip(workDir, out);
}

function manualBlocks() {
  const b = [];
  b.push(paragraph("Manual de usuario para profesores: cómo montar un curso", "Title"));
  b.push(paragraph("Guía práctica para diseñar, organizar y publicar cursos en la plataforma.", "Subtitle"));
  b.push(note("Este documento está pensado para acompañar el trabajo de diseño y carga de cursos. Puede editarse libremente antes de circularlo al equipo docente."));
  b.push(pageBreak());
  b.push(paragraph("1. Objetivo del manual", "Heading1"));
  b.push(paragraph("Este manual explica, paso a paso, cómo preparar y registrar un curso tipo MOOC en la plataforma. El objetivo es que cada profesor pueda organizar la información académica, cargar los contenidos, configurar las evaluaciones y revisar el curso antes de publicarlo."));
  b.push(paragraph("La plataforma está orientada a cursos autónomos, con videos breves, materiales complementarios, prácticas, evaluación automática y certificación digital. Por eso conviene preparar primero el diseño pedagógico y después cargarlo en el CMS académico."));
  b.push(paragraph("2. Conceptos básicos", "Heading1"));
  b.push(table([
    ["Elemento", "Qué significa en la plataforma"],
    ["Curso", "Unidad principal que verá el estudiante. Incluye la ficha académica, módulos, sesiones, evaluación y certificado."],
    ["Ficha MOOC", "Información académica general: objetivos, público destinatario, requisitos, duración, dedicación semanal, competencias y certificado."],
    ["Edición", "Convocatoria o versión del curso. Puede tener fecha de inicio, fecha de cierre, cupo y estado."],
    ["Módulo", "Bloque temático del curso. Agrupa varias sesiones o lecciones."],
    ["Sesión", "Lección concreta. Puede incluir video, bibliografía, materiales, enlaces y práctica."],
    ["Evaluación", "Prueba automática del curso, creada a partir del banco de preguntas."],
    ["Certificado", "Credencial emitida cuando el estudiante cumple los criterios definidos."]
  ]));
  b.push(paragraph("3. Qué debe preparar el profesor antes de entrar al CMS", "Heading1"));
  [
    "Título del curso y descripción breve.",
    "Objetivos de aprendizaje redactados de forma clara.",
    "Público al que va dirigido el curso.",
    "Requisitos previos, si existen.",
    "Duración estimada total y horas semanales recomendadas.",
    "Competencias que desarrollará el estudiante.",
    "Lista de módulos y sesiones en el orden correcto.",
    "Videos o enlaces a videos externos, preferiblemente en piezas breves.",
    "Bibliografía, lecturas, presentaciones, enlaces y materiales complementarios.",
    "Prácticas o actividades de aprendizaje.",
    "Preguntas para el banco de evaluación, con respuestas correctas y retroalimentación."
  ].forEach((item) => b.push(bullet(item)));
  b.push(note("Recomendación: si el curso todavía está incompleto, trabájelo siempre como borrador. Publique únicamente cuando exista al menos una sesión publicada con video y la información académica esté revisada."));
  b.push(paragraph("4. Entrar al sistema y abrir el CMS académico", "Heading1"));
  [
    "Abra la dirección de la plataforma en el navegador.",
    "Entre con su usuario y contraseña.",
    "Abra el panel del profesor o CMS académico.",
    "Revise que está trabajando con el usuario correcto antes de crear o modificar cursos."
  ].forEach((item) => b.push(bullet(item)));
  b.push(paragraph("5. Crear el curso como borrador", "Heading1"));
  b.push(paragraph("En el CMS académico, utilice la opción para crear un nuevo curso. Complete primero los datos mínimos: título, descripción, idioma, nivel, modalidad de precio y visibilidad. Mantenga el estado como borrador mientras prepara el contenido."));
  b.push(note("Si intenta publicar un curso sin sesiones publicadas con video, la plataforma puede impedir el guardado como curso publicable. Esto es una validación normal para evitar cursos visibles sin contenido principal."));
  b.push(paragraph("6. Completar la ficha MOOC", "Heading1"));
  [
    "Objetivos de aprendizaje: escriba resultados concretos, por ejemplo: “Al finalizar el curso, el estudiante será capaz de...”",
    "Público destinatario: indique para quién está pensado el curso.",
    "Requisitos: aclare conocimientos previos, herramientas o condiciones necesarias.",
    "Duración estimada: registre las horas totales aproximadas.",
    "Horas semanales: sugiera una dedicación razonable.",
    "Competencias: enumere capacidades o desempeños que el estudiante desarrollará.",
    "Certificado: confirme si el curso emitirá certificado al completarse."
  ].forEach((item) => b.push(bullet(item)));
  b.push(paragraph("7. Crear ediciones", "Heading1"));
  b.push(paragraph("Una edición representa una convocatoria o versión del curso. Puede usar una edición abierta, sin fecha fija, o una edición programada con fecha de inicio y cierre. Si hay varias ediciones, marque cuál será la edición principal o predeterminada."));
  b.push(paragraph("8. Crear módulos", "Heading1"));
  b.push(paragraph("Divida el curso en módulos progresivos. Cada módulo debe responder a un objetivo de aprendizaje parcial. Use nombres claros y breves, por ejemplo: “Introducción”, “Conceptos fundamentales”, “Aplicaciones prácticas” y “Proyecto final”."));
  b.push(paragraph("9. Crear sesiones o lecciones", "Heading1"));
  b.push(paragraph("Dentro de cada módulo, cree las sesiones en el orden en que deben estudiarse. Una sesión puede contener video, descripción, duración, palabras clave, materiales complementarios y práctica. Para cursos MOOC conviene que cada video sea breve y esté acompañado de una actividad o pregunta de reflexión."));
  b.push(paragraph("10. Agregar videos", "Heading1"));
  [
    "Si el video está en una plataforma externa, pegue el enlace correspondiente.",
    "Si el video debe quedar almacenado en la plataforma, utilice la opción de subida disponible.",
    "Revise que el video se reproduzca correctamente antes de publicar la sesión.",
    "Evite videos muy largos; es preferible dividir una conferencia extensa en varias sesiones breves."
  ].forEach((item) => b.push(bullet(item)));
  b.push(paragraph("11. Agregar bibliografía y materiales complementarios", "Heading1"));
  b.push(paragraph("Los materiales complementarios no pertenecen al video; forman parte del apoyo académico de la sesión. Pueden ser documentos PDF, presentaciones, enlaces, lecturas recomendadas o recursos alojados en repositorios externos de objetos de aprendizaje."));
  b.push(paragraph("Cuando el material esté en otra plataforma o repositorio, registre el enlace y una descripción clara. Cuando deba subirse a la plataforma, utilice la opción de carga de recursos."));
  b.push(paragraph("12. Agregar prácticas", "Heading1"));
  b.push(paragraph("Las prácticas sirven para que el estudiante aplique lo aprendido. No todas tienen que ser calificadas. Pueden ser ejercicios de reflexión, actividades de comprobación, pequeños problemas, análisis de casos o instrucciones para elaborar un producto."));
  b.push(paragraph("13. Crear el banco de preguntas", "Heading1"));
  [
    "Redacte preguntas claras y sin ambigüedad.",
    "Incluya opciones de respuesta cuando sean preguntas de selección.",
    "Marque la respuesta correcta.",
    "Agregue retroalimentación para explicar por qué la respuesta es correcta o incorrecta.",
    "Use etiquetas, dificultad y módulo cuando corresponda, para seleccionar preguntas de forma más flexible."
  ].forEach((item) => b.push(bullet(item)));
  b.push(paragraph("14. Crear la evaluación final", "Heading1"));
  b.push(paragraph("Configure el título, descripción, puntuación mínima de aprobación, número máximo de intentos y comportamiento de retroalimentación. Si el curso usa selección aleatoria, defina cuántas preguntas se tomarán y desde qué etiquetas o grupos."));
  b.push(paragraph("15. Publicar el curso", "Heading1"));
  b.push(paragraph("Antes de publicar, revise que la ficha MOOC esté completa, que exista al menos una edición, que los módulos y sesiones estén ordenados, que haya sesiones publicadas con video y que la evaluación esté configurada si el curso emitirá certificado."));
  b.push(paragraph("16. Revisar el curso como estudiante", "Heading1"));
  b.push(paragraph("Después de publicar, abra la vista pública o entre con un usuario estudiante de prueba. Verifique que el curso se vea correctamente, que los videos funcionen, que los materiales se abran, que las prácticas estén claras, que el progreso se actualice y que la evaluación pueda completarse."));
  b.push(paragraph("17. Errores frecuentes", "Heading1"));
  b.push(table([
    ["Problema", "Qué revisar"],
    ["No se puede publicar el curso", "Confirme que exista al menos una sesión publicada con video."],
    ["El video no aparece", "Revise el enlace externo o vuelva a subir el archivo si usa almacenamiento local."],
    ["El material no abre", "Verifique permisos del archivo, enlace externo y formato."],
    ["La evaluación no calcula bien", "Revise respuestas correctas, puntajes y configuración de intentos."],
    ["El estudiante no ve el curso", "Revise visibilidad, estado publicado y edición disponible."]
  ]));
  b.push(paragraph("18. Checklist final", "Heading1"));
  [
    "La ficha MOOC está completa.",
    "El curso tiene una edición configurada.",
    "Los módulos están ordenados.",
    "Cada sesión tiene título, descripción y contenido principal.",
    "Los videos se reproducen correctamente.",
    "La bibliografía y los materiales complementarios están visibles.",
    "Las prácticas están redactadas con instrucciones claras.",
    "El banco de preguntas está revisado.",
    "La evaluación final está configurada.",
    "El curso fue probado con un usuario estudiante."
  ].forEach((item) => b.push(bullet(item)));
  b.push(paragraph("19. Glosario rápido", "Heading1"));
  b.push(table([
    ["Término", "Significado"],
    ["CMS académico", "Área de administración donde se crean y editan los cursos."],
    ["Borrador", "Curso o contenido que todavía no debe ser visible para los estudiantes."],
    ["Publicado", "Contenido visible según la configuración de acceso."],
    ["Autoevaluación", "Actividad que ayuda al estudiante a comprobar su aprendizaje."],
    ["Retroalimentación", "Explicación que recibe el estudiante después de responder una pregunta o completar una actividad."]
  ]));
  return b;
}

function analysisBlocks() {
  const b = [];
  b.push(paragraph("Análisis de mejoras para la plataforma MOOC", "Title"));
  b.push(paragraph("Propuesta de etapas por factibilidad, impacto y dependencia técnica.", "Subtitle"));
  b.push(note("Este documento no implica implementación. Resume criterios para decidir el próximo ciclo de desarrollo."));
  b.push(paragraph("1. Punto de partida observado", "Heading1"));
  b.push(paragraph("La plataforma ya contiene la base para cursos MOOC: cursos, ediciones, módulos, sesiones, videos externos o subidos, materiales, prácticas, banco de preguntas, evaluación automática, progreso, pagos, certificados y roles. La fecha de inicio ya existe como dato de la edición del curso, mediante el campo startsAt. Actualmente el curso tiene un instructor principal; el soporte real para varios instructores requeriría una relación adicional."));
  b.push(paragraph("2. Mejoras solicitadas y factibilidad", "Heading1"));
  b.push(table([
    ["Mejora", "Factibilidad", "Criterio"],
    ["Hacer más evidente cuándo comienza el curso", "Alta", "La fecha ya existe en las ediciones. Conviene mostrarla mejor en home, ficha del curso, tarjetas y CMS."],
    ["Sección “Conozca a sus instructores”", "Media", "Hoy existe un instructor principal, pero faltan foto, biografía breve y, si se desea, varios instructores por curso."],
    ["Rama de las ciencias, palabras clave y temáticas", "Alta", "Requiere ampliar metadatos del curso y usarlos en filtros, agrupaciones y tarjetas."],
    ["Imagen o portada del curso", "Alta", "Requiere campo de imagen, subida o URL externa y validación visual en tarjetas y ficha."],
    ["Contador de visitas", "Media", "Debe evitar inflar conteos por recargas. Conviene registrar eventos o visitas únicas por ventana de tiempo."],
    ["Contador de estudiantes que completaron el curso", "Alta", "Puede derivarse de progreso, evaluaciones aprobadas o certificados emitidos."],
    ["Testimonios y evaluación por estrellas", "Media", "Requiere modelo de reseñas, reglas de quién puede opinar, moderación y gráficos."],
    ["Integración con eXeLearning", "Media/Alta", "Puede iniciar con importación o enlace de paquetes exportados y luego avanzar hacia integración más profunda."],
    ["Exportar curso offline e importarlo conservando estado", "Media/Alta", "Requiere formato propio JSON/ZIP, validaciones e importador. Los videos pueden quedar como enlaces."],
    ["Importar plantilla de diseño MOOC", "Media", "Es más robusto convertir la plantilla a datos estructurados que intentar leer HTML libre."],
    ["Revisión de plataformas MOOC para mejorar home", "Alta", "Puede aplicarse en diseño visual y contenido sin grandes cambios de base de datos."],
    ["Corregir textos del home", "Alta", "Cambio de contenido: corregir “Cursos en línea” y retirar “Plataforma MOOC en evolución”."],
    ["Imagen autogenerada con identidad cubana", "Alta", "Cambio visual. Debe evitar apariencia genérica y alinearse con contexto universitario cubano."]
  ]));
  b.push(paragraph("3. Etapa 0: ajustes inmediatos de comunicación y confianza", "Heading1"));
  [
    "Corregir textos del home: “Cursos en línea” con tilde y retirar la frase “Plataforma MOOC en evolución”.",
    "Mostrar con más fuerza la fecha de inicio de la edición cuando exista; si no existe, usar “Inicio abierto”.",
    "Revisar la imagen principal para que comunique educación superior cubana, no una escena genérica.",
    "Ajustar tarjetas de curso para que destaquen duración, nivel, certificado, modalidad e inicio."
  ].forEach((item) => b.push(bullet(item)));
  b.push(paragraph("4. Etapa 1: metadatos académicos y portada del curso", "Heading1"));
  [
    "Agregar portada del curso, usando subida local o URL externa.",
    "Agregar rama de la ciencia, temas y palabras clave a nivel de curso.",
    "Actualizar filtros de catálogo y CMS para usar esos metadatos.",
    "Preparar la home para agrupar cursos por áreas y destacar cursos recomendados."
  ].forEach((item) => b.push(bullet(item)));
  b.push(paragraph("5. Etapa 2: instructores y prueba social", "Heading1"));
  [
    "Agregar perfil académico del instructor: foto, resumen de CV, institución y enlaces opcionales.",
    "Decidir si un curso tendrá un solo instructor visible o varios instructores con roles.",
    "Crear sección “Conozca a sus instructores” en la ficha del curso.",
    "Agregar reseñas de estudiantes, puntuación de 1 a 5 estrellas, moderación y resumen gráfico."
  ].forEach((item) => b.push(bullet(item)));
  b.push(paragraph("6. Etapa 3: métricas académicas", "Heading1"));
  [
    "Mostrar estudiantes inscritos y estudiantes que completaron el curso.",
    "Crear contador de visitas con protección básica contra recargas repetidas.",
    "Incluir gráficos simples para administración: visitas, inscripciones, finalización y valoraciones.",
    "Definir qué métricas serán públicas y cuáles serán solo administrativas."
  ].forEach((item) => b.push(bullet(item)));
  b.push(paragraph("7. Etapa 4: importación, exportación y trabajo offline", "Heading1"));
  [
    "Definir un formato de curso exportable en JSON/ZIP con ficha, módulos, sesiones, recursos y enlaces de video.",
    "Exportar los videos como enlaces, no como archivos, salvo casos explícitos.",
    "Importar cursos en estado borrador para revisión antes de publicar.",
    "Modificar la plantilla HTML de profesores para que genere un archivo JSON importable por la plataforma.",
    "Dejar la evaluación como pendiente o importarla solo cuando el banco de preguntas cumpla una estructura validada."
  ].forEach((item) => b.push(bullet(item)));
  b.push(paragraph("8. Etapa 5: integración con eXeLearning", "Heading1"));
  b.push(paragraph("eXeLearning permite crear recursos con textos, imágenes, videos y actividades, y exportarlos en formatos como HTML, SCORM, EPUB e IMS. Para esta plataforma, lo más prudente es empezar por aceptar paquetes o enlaces exportados como recursos complementarios o sesiones enriquecidas. Una integración más profunda debe tratarse como proyecto separado, porque implica empaquetado, almacenamiento, previsualización, permisos y posible seguimiento de actividad."));
  b.push(table([
    ["Nivel de integración", "Descripción"],
    ["Básico", "Subir o enlazar paquetes HTML/SCORM como material complementario."],
    ["Intermedio", "Importar un paquete eXeLearning y crear automáticamente una sesión o recurso estructurado."],
    ["Avanzado", "Desplegar eXeLearning como herramienta autora separada e integrarla con repositorio, autenticación y flujo editorial."]
  ]));
  b.push(paragraph("9. Referencias de plataformas MOOC revisadas", "Heading1"));
  [
    "Coursera muestra en catálogo habilidades, nivel, duración, tipo de producto, valoraciones y volumen de reseñas.",
    "edX enfatiza rutas de aprendizaje, certificados, instituciones, duración estimada y aprendizaje flexible.",
    "Udacity organiza el catálogo por escuela, nivel, duración, tipo de programa y calificación.",
    "Udemy destaca vista previa del curso, resultados de aprendizaje, requisitos, contenido, instructor y retroalimentación estudiantil.",
    "eXeLearning es relevante como herramienta autora, no como sustituto directo de la plataforma MOOC."
  ].forEach((item) => b.push(bullet(item)));
  b.push(paragraph("Fuentes consultadas: Coursera Courses, edX Courses, edX Learn, Udacity Catalog, soporte de Udemy sobre páginas de curso y sitio oficial de eXeLearning.", "Note"));
  b.push(paragraph("10. Recomendación de priorización", "Heading1"));
  b.push(paragraph("Para el próximo ciclo conviene empezar por Etapa 0 y Etapa 1, porque elevan mucho la percepción profesional sin introducir riesgos grandes. Después debe abordarse instructores y prueba social. La integración con eXeLearning y el flujo de importación/exportación son valiosos, pero requieren especificación más cuidadosa para evitar deuda técnica."));
  return b;
}

fs.mkdirSync(docsDir, { recursive: true });
fs.mkdirSync(tmpRoot, { recursive: true });
writeDocx("manual-profesores-montar-curso.docx", "Manual de usuario para profesores: cómo montar un curso", manualBlocks());
writeDocx("analisis-mejoras-plataforma-mooc.docx", "Análisis de mejoras para la plataforma MOOC", analysisBlocks());
fs.rmSync(tmpRoot, { recursive: true, force: true });

console.log("Documentos generados:");
console.log(" - docs/manual-profesores-montar-curso.docx");
console.log(" - docs/analisis-mejoras-plataforma-mooc.docx");
