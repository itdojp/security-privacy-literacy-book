#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const EXPECTED = {
  packageName: 'security-privacy-literacy-book',
  repoUrl: 'https://github.com/itdojp/security-privacy-literacy-book',
  repoGitUrl: 'https://github.com/itdojp/security-privacy-literacy-book.git',
  packageRepoUrl: 'git+https://github.com/itdojp/security-privacy-literacy-book.git',
  issuesUrl: 'https://github.com/itdojp/security-privacy-literacy-book/issues',
  homepage: 'https://itdojp.github.io/security-privacy-literacy-book/',
  pagesOrigin: 'https://itdojp.github.io',
  baseurl: '/security-privacy-literacy-book',
};

const errors = [];

function fail(file, message) {
  errors.push(`${file}: ${message}`);
}

function readText(file) {
  try {
    return fs.readFileSync(path.join(ROOT, file), 'utf8');
  } catch (error) {
    fail(file, `ファイルを読めません: ${error.message}`);
    return '';
  }
}

function readJson(file) {
  const text = readText(file);
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (error) {
    fail(file, `JSONを解析できません: ${error.message}`);
    return null;
  }
}

function unquote(value) {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function stripInlineComment(line) {
  let quote = null;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if ((ch === '"' || ch === "'") && line[i - 1] !== '\\') {
      quote = quote === ch ? null : (quote || ch);
    }
    if (ch === '#' && !quote && (i === 0 || /\s/.test(line[i - 1]))) {
      return line.slice(0, i);
    }
  }
  return line;
}

function parseTopLevelYaml(file) {
  const result = {};
  const text = readText(file);
  for (const rawLine of text.split(/\r?\n/)) {
    const line = stripInlineComment(rawLine);
    if (!line.trim() || /^\s/.test(line) || line.trim().startsWith('#')) continue;
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!match) continue;
    result[match[1]] = unquote(match[2]);
  }
  return result;
}

function parseFrontMatter(file) {
  const text = readText(file);
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) {
    fail(file, 'YAML front matter がないか、終了マーカーがありません');
    return {};
  }
  const front = match[1];
  const result = {};
  for (const rawLine of front.split(/\r?\n/)) {
    if (!rawLine.trim() || rawLine.trim().startsWith('#')) continue;
    const fieldMatch = rawLine.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (fieldMatch) result[fieldMatch[1]] = unquote(fieldMatch[2]);
  }
  return result;
}

function parseNavigation(file) {
  const text = readText(file);
  const sections = {};
  let currentSection = null;
  let currentItem = null;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = stripInlineComment(rawLine);
    if (!line.trim()) continue;

    const sectionMatch = line.match(/^([A-Za-z0-9_-]+):\s*$/);
    if (sectionMatch) {
      currentSection = sectionMatch[1];
      sections[currentSection] = sections[currentSection] || [];
      currentItem = null;
      continue;
    }

    const itemTitle = line.match(/^\s*-\s*title:\s*(.+)$/);
    if (itemTitle && currentSection) {
      currentItem = { title: unquote(itemTitle[1]) };
      sections[currentSection].push(currentItem);
      continue;
    }

    const itemPath = line.match(/^\s*path:\s*(.+)$/);
    if (itemPath && currentSection && currentItem) {
      currentItem.path = unquote(itemPath[1]);
    }
  }

  return sections;
}

function expectEqual(file, field, actual, expected) {
  if (actual !== expected) {
    fail(file, `${field} は ${JSON.stringify(expected)} にしてください（現在: ${JSON.stringify(actual)}）`);
  }
}

function ensureSafeRoute(file, route, context) {
  if (typeof route !== 'string') {
    fail(file, `${context}.path は文字列である必要があります`);
    return false;
  }
  let ok = true;
  if (!route.startsWith('/')) { fail(file, `${context}.path は / から始めてください: ${route}`); ok = false; }
  if (!route.endsWith('/')) { fail(file, `${context}.path は / で終えてください: ${route}`); ok = false; }
  if (route.includes('..')) { fail(file, `${context}.path に .. を含めないでください: ${route}`); ok = false; }
  if (route.includes('//')) { fail(file, `${context}.path に // を含めないでください: ${route}`); ok = false; }
  if (/[?#%\\]/.test(route)) { fail(file, `${context}.path にクエリ・フラグメント・エンコード・逆スラッシュを含めないでください: ${route}`); ok = false; }
  return ok;
}

function routeCandidates(route) {
  if (route === '/') return ['docs/index.md'];
  const rel = route.replace(/^\//, '').replace(/\/$/, '');
  return [`docs/${rel}/index.md`, `docs/${rel}.md`];
}

function routeExists(route) {
  return typeof route === 'string' && routeCandidates(route).some(candidate => fs.existsSync(path.join(ROOT, candidate)));
}

function checkRouteSource(file, route, context) {
  if (typeof route !== 'string') return;
  if (!routeExists(route)) {
    fail(file, `${context}.path に対応する docs ソースがありません: ${route}（候補: ${routeCandidates(route).join(', ')}）`);
  }
}

function walkConfiguredItems(items, section, routes, topRoutes, parent = '') {
  if (!Array.isArray(items) || items.length === 0) {
    fail('book-config.json', `structure.${section}${parent} は1件以上の配列にしてください`);
    return;
  }
  for (const [index, item] of items.entries()) {
    const context = `structure.${section}${parent}[${index}]`;
    for (const field of ['id', 'title', 'path', 'description']) {
      if (!item || typeof item[field] !== 'string' || !item[field].trim()) {
        fail('book-config.json', `${context}.${field} を設定してください`);
      }
    }
    if (ensureSafeRoute('book-config.json', item && item.path, context)) {
      checkRouteSource('book-config.json', item.path, context);
      routes.push(item.path);
      if (!parent) topRoutes.push(item.path);
    }
    if (Array.isArray(item && item.items)) {
      walkConfiguredItems(item.items, section, routes, topRoutes, `${parent}[${index}].items`);
    }
  }
}

function collectStructureRoutes(bookConfig) {
  const routes = [];
  const topRoutes = [];
  const structure = bookConfig && bookConfig.structure;
  if (!structure || typeof structure !== 'object') {
    fail('book-config.json', 'structure がありません');
    return { routes, topRoutes };
  }
  for (const section of ['chapters', 'appendices']) {
    walkConfiguredItems(structure[section], section, routes, topRoutes);
  }
  return { routes, topRoutes };
}

function checkUnique(file, values, label) {
  const seen = new Set();
  for (const value of values.filter(Boolean)) {
    if (seen.has(value)) fail(file, `${label} が重複しています: ${value}`);
    seen.add(value);
  }
}

function setDiff(left, right) {
  const r = new Set(right);
  return [...new Set(left)].filter(item => !r.has(item));
}

const bookConfig = readJson('book-config.json') || {};
for (const field of ['title', 'description', 'author', 'version', 'license']) {
  if (!bookConfig[field]) fail('book-config.json', `${field} を設定してください`);
}
expectEqual('book-config.json', 'homepage', bookConfig.homepage, EXPECTED.homepage);
expectEqual('book-config.json', 'repository.url', bookConfig.repository && bookConfig.repository.url, EXPECTED.repoGitUrl);
expectEqual('book-config.json', 'repository.branch', bookConfig.repository && bookConfig.repository.branch, 'main');

const pkg = readJson('package.json') || {};
expectEqual('package.json', 'name', pkg.name, EXPECTED.packageName);
expectEqual('package.json', 'version', pkg.version, bookConfig.version);
expectEqual('package.json', 'description', pkg.description, bookConfig.description);
expectEqual('package.json', 'author', pkg.author, bookConfig.author);
expectEqual('package.json', 'license', pkg.license, bookConfig.license);
expectEqual('package.json', 'repository.url', pkg.repository && pkg.repository.url, EXPECTED.packageRepoUrl);
expectEqual('package.json', 'bugs.url', pkg.bugs && pkg.bugs.url, EXPECTED.issuesUrl);
expectEqual('package.json', 'homepage', pkg.homepage, EXPECTED.homepage);
if (!pkg.scripts || pkg.scripts['check:metadata'] !== 'node scripts/check-metadata-consistency.js') {
  fail('package.json', 'check:metadata スクリプトを設定してください');
}
if (!pkg.scripts || pkg.scripts['check:security'] !== 'npm audit --omit=optional') {
  fail('package.json', 'check:security スクリプトを設定してください');
}
const testScript = String((pkg.scripts && pkg.scripts.test) || '');
if (!testScript.includes('npm run check:metadata')) {
  fail('package.json', 'npm test に check:metadata を含めてください');
}
if (!testScript.includes('npm run check:security')) {
  fail('package.json', 'npm test に check:security を含めてください');
}

const lock = readJson('package-lock.json') || {};
expectEqual('package-lock.json', 'name', lock.name, EXPECTED.packageName);
expectEqual('package-lock.json', 'version', lock.version, bookConfig.version);
const lockRoot = lock.packages && lock.packages[''];
if (!lockRoot) {
  fail('package-lock.json', 'packages[""] がありません');
} else {
  expectEqual('package-lock.json', 'packages[""].name', lockRoot.name, EXPECTED.packageName);
  expectEqual('package-lock.json', 'packages[""].version', lockRoot.version, bookConfig.version);
  expectEqual('package-lock.json', 'packages[""].license', lockRoot.license, bookConfig.license);
}

for (const file of ['_config.yml', 'docs/_config.yml']) {
  const config = parseTopLevelYaml(file);
  expectEqual(file, 'title', config.title, bookConfig.title);
  expectEqual(file, 'description', config.description, bookConfig.description);
  expectEqual(file, 'author', config.author, bookConfig.author);
  expectEqual(file, 'version', config.version, bookConfig.version);
  expectEqual(file, 'license', config.license, bookConfig.license);
  expectEqual(file, 'lang', config.lang, 'ja');
  expectEqual(file, 'url', config.url, EXPECTED.pagesOrigin);
  expectEqual(file, 'baseurl', config.baseurl, EXPECTED.baseurl);
  expectEqual(file, 'repository', config.repository, EXPECTED.repoUrl);
  expectEqual(file, 'homepage', config.homepage, EXPECTED.homepage);
}

const front = parseFrontMatter('docs/index.md');
expectEqual('docs/index.md', 'title', front.title, bookConfig.title);
expectEqual('docs/index.md', 'description', front.description, bookConfig.description);
expectEqual('docs/index.md', 'author', front.author, bookConfig.author);
expectEqual('docs/index.md', 'version', front.version, bookConfig.version);
expectEqual('docs/index.md', 'permalink', front.permalink, '/');

const { routes: configuredRoutes, topRoutes } = collectStructureRoutes(bookConfig);
checkUnique('book-config.json', configuredRoutes, 'configured route');

const navigation = parseNavigation('docs/_data/navigation.yml');
const navRoutes = [];
for (const section of ['chapters', 'appendices']) {
  const items = navigation[section];
  if (!Array.isArray(items) || items.length === 0) {
    fail('docs/_data/navigation.yml', `${section} セクションがありません`);
    continue;
  }
  for (const [index, item] of items.entries()) {
    const context = `${section}[${index}]`;
    if (!item.title) fail('docs/_data/navigation.yml', `${context}.title を設定してください`);
    if (ensureSafeRoute('docs/_data/navigation.yml', item.path, context)) {
      checkRouteSource('docs/_data/navigation.yml', item.path, context);
      navRoutes.push(item.path);
    }
  }
}
checkUnique('docs/_data/navigation.yml', navRoutes, 'navigation route');
for (const missing of setDiff(navRoutes, topRoutes)) {
  fail('book-config.json', `navigation にある ${missing} が book-config.json の top-level structure にありません`);
}
for (const missing of setDiff(topRoutes, navRoutes)) {
  fail('docs/_data/navigation.yml', `book-config.json の top-level structure にある ${missing} が navigation にありません`);
}

const requiredAssets = [
  'docs/assets/css/main.css',
  'docs/assets/css/syntax-highlighting.css',
  'docs/assets/js/theme.js',
  'docs/assets/js/search.js',
  'docs/assets/js/code-copy-lightweight.js',
  'docs/_layouts/book.html',
  'docs/_includes/page-navigation.html',
  'docs/_includes/sidebar-nav.html',
];
for (const asset of requiredAssets) {
  const full = path.join(ROOT, asset);
  if (!fs.existsSync(full) || fs.statSync(full).size === 0) {
    fail(asset, '公開サイトに必要なアセットまたはレイアウトがありません');
  }
}

const readme = readText('README.md');
for (const command of ['npm test', 'npm run check:metadata', 'npm run check:security']) {
  if (!readme.includes(command)) {
    fail('README.md', `${command} をローカル品質ゲートに記載してください`);
  }
}

if (errors.length) {
  console.error('Metadata consistency check failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Metadata consistency check passed: ${configuredRoutes.length} configured routes, ${navRoutes.length} navigation routes, ${requiredAssets.length} required assets.`);
