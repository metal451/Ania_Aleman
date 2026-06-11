const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const LESSONS_DIR = path.join(ROOT, 'lecciones');
const OUTPUT_FILE = path.join(ROOT, 'index.html');

const LEGACY_LESSONS = [
  {
    file: 'ania_moegen_mochten_v2.html',
    titleHtml: '<em>mögen</em> vs. <em>möchten</em>',
    titleText: 'mögen vs. möchten',
    description: 'Gusto real vs. deseo cortés. Conjugación, ejercicios y quiz.',
    order: 1
  },
  {
    file: 'ania_darf_durft_leccion2.html',
    titleHtml: '<em>darf</em> vs. <em>dürft</em>',
    titleText: 'darf vs. dürft',
    description: 'Una persona con permiso vs. un grupo al que hablas. Falencia 2.',
    order: 2
  },
  {
    file: 'leccion3_mejorada.html',
    titleHtml: '<em>müssen</em> · <em>sollen</em> · <em>dürfen</em>',
    titleText: 'müssen · sollen · dürfen',
    description: 'El examen de Kakashi: necesidad, voz de otro y permiso.',
    order: 3
  },
  {
    file: 'semana1_lunes_mein_zimmer.html',
    titleHtml: '<em>Mein Zimmer</em> und <em>meine Schulsachen</em>',
    titleText: 'Mein Zimmer und meine Schulsachen',
    description: 'Semana 1 · Lunes. Cuarto, mochila, cuaderno de Naruto, bloc de dibujo y regla mein/meine.',
    order: 4
  }
];

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function normalizePath(filePath) {
  return filePath.split(path.sep).join('/');
}

function walkHtmlFiles(directory) {
  if (!fs.existsSync(directory)) return [];

  const entries = fs.readdirSync(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...walkHtmlFiles(fullPath));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.html')) {
      files.push(fullPath);
    }
  }

  return files;
}

function extractTitle(html) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!match) return '';

  return match[1]
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractMeta(html, name) {
  const tags = html.match(/<meta\b[^>]*>/gi) || [];
  const target = name.toLowerCase();

  for (const tag of tags) {
    const nameMatch = tag.match(/\bname\s*=\s*["']([^"']+)["']/i);

    if (!nameMatch || nameMatch[1].toLowerCase() !== target) {
      continue;
    }

    const contentMatch = tag.match(/\bcontent\s*=\s*["']([^"']*)["']/i);
    return contentMatch ? contentMatch[1].trim() : '';
  }

  return '';
}

function titleFromFilename(filePath) {
  return path
    .basename(filePath, path.extname(filePath))
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\p{L}/gu, letter => letter.toUpperCase());
}

function readDynamicLesson(filePath) {
  const html = fs.readFileSync(filePath, 'utf8');
  const relativePath = normalizePath(path.relative(ROOT, filePath));

  const customTitle = extractMeta(html, 'lesson-title');
  const documentTitle = extractTitle(html);
  const titleText = customTitle || documentTitle || titleFromFilename(filePath);

  const customDescription = extractMeta(html, 'lesson-description');
  const standardDescription = extractMeta(html, 'description');
  const description =
    customDescription ||
    standardDescription ||
    'Lección interactiva de alemán con audio y ejercicios.';

  const rawOrder = extractMeta(html, 'lesson-order');
  const parsedOrder = Number.parseFloat(rawOrder);
  const order = Number.isFinite(parsedOrder) ? parsedOrder : 1000;

  const hidden = extractMeta(html, 'lesson-hidden').toLowerCase() === 'true';

  return {
    file: relativePath,
    titleHtml: escapeHtml(titleText),
    titleText,
    description,
    order,
    hidden
  };
}

const legacyLessons = LEGACY_LESSONS.filter(lesson => {
  const exists = fs.existsSync(path.join(ROOT, lesson.file));

  if (!exists) {
    console.warn(`Aviso: no se encontró ${lesson.file}; se omitirá del índice.`);
  }

  return exists;
});

const dynamicLessons = walkHtmlFiles(LESSONS_DIR)
  .map(readDynamicLesson)
  .filter(lesson => !lesson.hidden)
  .sort((a, b) => {
    if (a.order !== b.order) {
      return a.order - b.order;
    }
    return a.titleText.localeCompare(b.titleText, 'es', { sensitivity: 'base' });
  });

const lessons = [...legacyLessons, ...dynamicLessons];

const lessonCards = lessons
  .map((lesson, index) => {
    const number = String(index + 1).padStart(2, '0');

    return `
<a class="lesson-card" href="${escapeHtml(lesson.file)}">
  <span class="lesson-num">${number}</span>

  <div class="lesson-body">
    <div class="lesson-title">
      ${lesson.titleHtml}
    </div>

    <div class="lesson-desc">
      ${escapeHtml(lesson.description)}
    </div>
  </div>

  <span class="lesson-arrow" aria-hidden="true">→</span>
</a>`;
  })
  .join('\n');

const generatedAt = new Intl.DateTimeFormat('es-BO', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  timeZone: 'America/La_Paz'
}).format(new Date());

const indexHtml = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Lecciones de Alemán — Ania</title>
<meta name="description" content="Lecciones interactivas de alemán para Ania.">
<link rel="preconnect" href="[https://fonts.googleapis.com](https://fonts.googleapis.com)">
<link rel="preconnect" href="[https://fonts.gstatic.com](https://fonts.gstatic.com)" crossorigin>
<link href="[https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap](https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap)" rel="stylesheet">
<style>
:root {
  --burgundy: #581825;
  --burgundy-hover: #401019;
  --gold: #b38e4a;
  --gold-light: #fcf9f2;
  --dark: #222222;
  --gray: #666666;
  --gray-mid: #e1e1e1;
  --gray-light: #f9f9f9;
  --white: #ffffff;
  --radius: 14px;
}

*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: 'DM Sans', sans-serif;
  background: #f7f5f2;
  color: var(--dark);
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
}

.page {
  max-width: 760px;
  margin: 0 auto;
  padding: 48px 20px 80px;
}

header {
  margin-bottom: 56px;
}

.badge {
  display: inline-block;
  font-family: 'DM Mono', monospace;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 2px;
  color: var(--gold);
  background: var(--gold-light);
  border: 1px solid rgba(179, 142, 74, 0.25);
  padding: 5px 14px;
  border-radius: 30px;
  margin-bottom: 20px;
}

h1 {
  font-family: 'DM Serif Display', serif;
  font-size: clamp(2.4rem, 6vw, 3.6rem);
  font-weight: 400;
  line-height: 1.1;
  color: var(--burgundy);
  margin-bottom: 14px;
}

h1 em {
  font-style: italic;
  color: var(--gold);
}

.subtitle {
  font-size: 1.05rem;
  color: var(--gray);
  font-weight: 300;
  max-width: 500px;
  line-height: 1.65;
}

.divider {
  height: 2px;
  background: linear-gradient(90deg, var(--burgundy), transparent);
  margin: 40px 0;
  border-radius: 2px;
}

.section-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 16px;
  margin-bottom: 20px;
}

.section-label, .lesson-count {
  font-family: 'DM Mono', monospace;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 2px;
  color: var(--gray);
}

.lessons {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.lesson-card {
  display: flex;
  align-items: center;
  gap: 20px;
  background: var(--white);
  border: 1.5px solid var(--gray-mid);
  border-radius: var(--radius);
  padding: 22px 24px;
  text-decoration: none;
  color: inherit;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.lesson-card::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: var(--gold);
  border-radius: 0 2px 2px 0;
  transform: scaleY(0);
  transition: transform 0.25s ease;
}

.lesson-card:hover {
  border-color: var(--burgundy);
  box-shadow: 0 6px 24px rgba(88, 24, 37, 0.08);
  transform: translateX(4px);
}

.lesson-card:hover::before {
  transform: scaleY(1);
}

.lesson-num {
  font-family: 'DM Serif Display', serif;
  font-size: 2rem;
  color: var(--gray-mid);
  min-width: 40px;
  line-height: 1;
  transition: color 0.25s;
}

.lesson-card:hover .lesson-num {
  color: var(--gold);
}

.lesson-body {
  flex: 1;
  min-width: 0;
}

.lesson-title {
  font-family: 'DM Serif Display', serif;
  font-size: 1.25rem;
  color: var(--burgundy);
  margin-bottom: 4px;
}

.lesson-title em {
  font-style: italic;
  color: var(--gold);
}

.lesson-desc {
  font-size: 0.88rem;
  color: var(--gray);
  font-weight: 300;
  line-height: 1.5;
}

.lesson-arrow {
  font-size: 1.1rem;
  color: var(--gray-mid);
  transition: color 0.25s, transform 0.25s;
}

.lesson-card:hover .lesson-arrow {
  color: var(--burgundy);
  transform: translateX(4px);
}

.empty {
  background: var(--white);
  border: 1.5px dashed var(--gray-mid);
  border-radius: var(--radius);
  padding: 24px;
  color: var(--gray);
}

footer {
  margin-top: 64px;
  padding-top: 24px;
  border-top: 1px solid var(--gray-mid);
  font-family: 'DM Mono', monospace;
  font-size: 0.72rem;
  color: var(--gray);
  letter-spacing: 0.5px;
  display: flex;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

@media (max-width: 560px) {
  .page {
    padding-top: 32px;
  }
  header {
    margin-bottom: 40px;
  }
  .lesson-card {
    padding: 18px 16px;
    gap: 14px;
  }
  .lesson-num {
    font-size: 1.65rem;
    min-width: 34px;
  }
  .lesson-title {
    font-size: 1.1rem;
  }
  .lesson-arrow {
    display: none;
  }
}
</style>
</head>
<body>
<div class="page">
  <header>
    <div class="badge">Alemán A1 · P6A</div>
    <h1>Lecciones<br>de <em>Alemán</em></h1>
    <p class="subtitle">Microlecciones para corregir falencias específicas. Cada tarjeta abre una lección interactiva con audio y ejercicios.</p>
  </header>
  <div class="divider"></div>
  <div class="section-row">
    <p class="section-label">Lecciones disponibles</p>
    <p class="lesson-count">${lessons.length} en total</p>
  </div>
  <div class="lessons">
    ${lessonCards || '<div class="empty">Todavía no hay lecciones disponibles.</div>'}
  </div>
  <footer>
    <span>metal451.github.io/Ania_Aleman · 2026</span>
    <span>Índice automático · ${generatedAt}</span>
  </footer>
</div>
</body>
</html>`;

fs.writeFileSync(OUTPUT_FILE, indexHtml, 'utf8');

console.log(`index.html generado con ${lessons.length} lección(es).`);
