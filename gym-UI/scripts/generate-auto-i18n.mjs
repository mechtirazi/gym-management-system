import fs from 'node:fs/promises';
import path from 'node:path';
import https from 'node:https';

const APP_ROOT = path.resolve('src', 'app');
const OUTPUT_DIR = path.resolve('src', 'assets', 'i18n', 'auto');
const EN_OUTPUT = path.join(OUTPUT_DIR, 'en.json');
const FR_OUTPUT = path.join(OUTPUT_DIR, 'fr.json');
const TRANSLATE_ENDPOINT = 'https://translate.googleapis.com/translate_a/single';
const BATCH_SEPARATOR = '@@__AUTO_I18N_SPLIT__@@';
const BATCH_SIZE = 20;
const REQUEST_DELAY_MS = 140;

const ICON_LIGATURES = new Set();
const COLLECTED_STRINGS = new Set();

async function main() {
  const files = await collectFiles(APP_ROOT);
  const htmlFiles = files.filter(file => file.endsWith('.html'));
  const tsFiles = files.filter(file => file.endsWith('.ts') && !file.endsWith('.spec.ts'));

  for (const file of htmlFiles) {
    const content = await fs.readFile(file, 'utf8');
    extractIconLigatures(content);
  }

  for (const file of htmlFiles) {
    const content = await fs.readFile(file, 'utf8');
    extractStringsFromHtml(content);
  }

  for (const file of tsFiles) {
    const content = await fs.readFile(file, 'utf8');
    extractStringsFromTs(content);
  }

  const phrases = [...COLLECTED_STRINGS].sort((a, b) => a.localeCompare(b));
  console.log(`Collected ${phrases.length} UI phrases.`);

  const enMap = {};
  for (const phrase of phrases) {
    enMap[phrase] = phrase;
  }

  const frMap = await translatePhrasesToFrench(phrases);

  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.writeFile(EN_OUTPUT, JSON.stringify(enMap, null, 2), 'utf8');
  await fs.writeFile(FR_OUTPUT, JSON.stringify(frMap, null, 2), 'utf8');

  console.log(`Generated: ${EN_OUTPUT}`);
  console.log(`Generated: ${FR_OUTPUT}`);
}

async function collectFiles(rootDir) {
  const entries = await fs.readdir(rootDir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(fullPath)));
      continue;
    }

    if (entry.isFile()) {
      files.push(fullPath);
    }
  }

  return files;
}

function extractIconLigatures(html) {
  const iconRegex = /<[^>]*class\s*=\s*["'][^"']*material-symbols[^"']*["'][^>]*>([\s\S]*?)<\/[^>]+>/gi;
  let match;
  while ((match = iconRegex.exec(html)) !== null) {
    const iconValue = normalizeText(stripHtml(match[1]));
    if (iconValue) {
      ICON_LIGATURES.add(iconValue);
    }
  }
}

function extractStringsFromHtml(html) {
  const withoutComments = html.replace(/<!--[\s\S]*?-->/g, ' ');

  const attrRegex = /\b(?:placeholder|title|aria-label|alt)\s*=\s*(["'])([\s\S]*?)\1/gim;
  let attrMatch;
  while ((attrMatch = attrRegex.exec(withoutComments)) !== null) {
    addPhrase(attrMatch[2]);
  }

  const textRegex = />([^<]+)</g;
  let textMatch;
  while ((textMatch = textRegex.exec(withoutComments)) !== null) {
    addPhrase(textMatch[1]);
  }
}

function extractStringsFromTs(tsContent) {
  const inlineTemplateRegex = /template\s*:\s*`([\s\S]*?)`/g;
  let templateMatch;
  while ((templateMatch = inlineTemplateRegex.exec(tsContent)) !== null) {
    extractStringsFromHtml(templateMatch[1]);
  }

  const messageRegex = /\b(?:confirm|alert|snackBar\.open|snackbar\.open)\s*\(\s*(["'`])([\s\S]*?)\1/gm;
  let msgMatch;
  while ((msgMatch = messageRegex.exec(tsContent)) !== null) {
    addPhraseOrTemplateChunks(msgMatch[2]);
  }

  const tsUiStringRegex =
    /\b(?:return|showToast|handleSuccess|handleError|toastService\.(?:success|error|info|warning)|snackBar\.open|title|subtitle|label|placeholder|message)\b[\s(:=,]+(["'`])([\s\S]*?)\1/gm;
  let tsUiMatch;
  while ((tsUiMatch = tsUiStringRegex.exec(tsContent)) !== null) {
    addPhraseOrTemplateChunks(tsUiMatch[2]);
  }

  const genericStringLiteralRegex =
    /'((?:\\.|[^'\\\r\n])*)'|"((?:\\.|[^"\\\r\n])*)"|`([\s\S]*?)`/gm;
  let genericMatch;
  while ((genericMatch = genericStringLiteralRegex.exec(tsContent)) !== null) {
    const candidate = genericMatch[1] ?? genericMatch[2] ?? genericMatch[3] ?? '';
    addPhraseOrTemplateChunks(candidate);
  }
}

function addPhraseOrTemplateChunks(rawValue) {
  if (!rawValue) return;

  if (!rawValue.includes('${')) {
    addPhrase(rawValue);
    return;
  }

  const parts = rawValue.split(/\$\{[\s\S]*?\}/g);
  for (const part of parts) {
    if (part.trim()) {
      addPhrase(part);
    }
  }
}

function addPhrase(rawValue) {
  const cleaned = normalizeText(stripAngular(rawValue));
  if (!isTranslatable(cleaned)) return;
  COLLECTED_STRINGS.add(cleaned);
}

function stripAngular(value) {
  return value
    .replace(/{{[\s\S]*?}}/g, ' ')
    .replace(/@(?:if|else|for|switch|case|empty)\b[\s\S]*?\{/g, ' ')
    .replace(/\[[^\]]+\]\s*=\s*['"][^'"]*['"]/g, ' ')
    .replace(/\([^)]+\)\s*=\s*['"][^'"]*['"]/g, ' ');
}

function stripHtml(value) {
  return value.replace(/<[^>]+>/g, ' ');
}

function normalizeText(value) {
  return value.replace(/\s+/g, ' ').trim();
}

function isTranslatable(value) {
  if (!value) return false;
  if (value.length < 2 || value.length > 220) return false;
  if (!/\p{L}/u.test(value)) return false;
  if (ICON_LIGATURES.has(value)) return false;
  if (value.includes('://')) return false;
  if (value.startsWith('/') || value.startsWith('./') || value.startsWith('../')) return false;
  if (value.includes('\\')) return false;
  if (/[&?=]/.test(value) && !/\s/.test(value)) return false;
  if (value.includes('<') || value.includes('>')) return false;
  if (/\.(?:png|jpe?g|gif|webp|svg|scss|css|html|ts|json)$/i.test(value)) return false;
  if (/^(?:[a-z]+-[\w[\]():/._]+)(?:\s+[a-z]+-[\w[\]():/._]+)+$/i.test(value)) return false;
  if (/^[a-z][a-z0-9_]*$/.test(value)) return false;
  if (/^[a-z][a-z0-9-]*$/.test(value)) return false;
  if (/^[a-z]+(?:[A-Z][a-z0-9]*)+$/.test(value)) return false;
  if (/^#[0-9a-f]{3,8}$/i.test(value)) return false;
  const letters = (value.match(/\p{L}/gu) ?? []).length;
  const symbols = (value.match(/[^\p{L}\p{N}\s]/gu) ?? []).length;
  if (letters > 0 && symbols > letters / 2) return false;
  if (/[{}[\]]/.test(value)) return false;
  if (/^(true|false|null|undefined)$/i.test(value)) return false;
  if (/^[A-Z0-9_.-]{2,}$/.test(value)) return false;
  if (/^(mat-|ng-|app-)/i.test(value)) return false;
  if (value.includes('translate') && value.includes('|')) return false;
  return true;
}

async function translatePhrasesToFrench(phrases) {
  const frMap = {};
  let translatedCount = 0;

  for (let i = 0; i < phrases.length; i += BATCH_SIZE) {
    const chunk = phrases.slice(i, i + BATCH_SIZE);
    const joined = chunk.join(BATCH_SEPARATOR);

    const translatedJoined = await requestTranslation(joined);
    const translatedChunk = splitBatchTranslation(translatedJoined, chunk.length);

    if (translatedChunk.length === chunk.length) {
      for (let index = 0; index < chunk.length; index++) {
        frMap[chunk[index]] = translatedChunk[index];
      }
    } else {
      for (const phrase of chunk) {
        frMap[phrase] = await requestTranslation(phrase);
      }
    }

    translatedCount += chunk.length;
    if (translatedCount % 100 === 0 || translatedCount === phrases.length) {
      console.log(`Translated ${translatedCount}/${phrases.length}`);
    }

    await delay(REQUEST_DELAY_MS);
  }

  return frMap;
}

function splitBatchTranslation(value, expectedCount) {
  const direct = value.split(BATCH_SEPARATOR).map(part => normalizeText(part));
  if (direct.length === expectedCount) {
    return direct;
  }

  const tolerant = value
    .split(/@+\s*__AUTO_I18N_SPLIT__\s*@+/i)
    .map(part => normalizeText(part));

  if (tolerant.length === expectedCount) {
    return tolerant;
  }

  return [];
}

function requestTranslation(text) {
  return new Promise((resolve, reject) => {
    const params = new URLSearchParams({
      client: 'gtx',
      sl: 'en',
      tl: 'fr',
      dt: 't',
      q: text
    });

    const url = `${TRANSLATE_ENDPOINT}?${params.toString()}`;

    https
      .get(url, response => {
        let data = '';
        response.on('data', chunk => {
          data += chunk;
        });

        response.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            const segments = Array.isArray(parsed?.[0]) ? parsed[0] : [];
            const translated = segments.map(segment => segment?.[0] ?? '').join('');
            resolve(normalizeText(translated) || normalizeText(text));
          } catch (error) {
            reject(error);
          }
        });
      })
      .on('error', reject);
  });
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
