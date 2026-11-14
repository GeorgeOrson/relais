// Découverte des skills installés. Copie volontaire de Skills-Viewer/build.js : les deux outils restent indépendants.
const fs = require('fs');
const path = require('path');
const os = require('os');

const HOME = os.homedir();
const LOCAL = process.env.LOCALAPPDATA || path.join(HOME, 'AppData', 'Local');

function readFrontmatter(file) {
  let text;
  try { text = fs.readFileSync(file, 'utf8'); } catch { return null; }
  const m = text.replace(/^﻿/, '').match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  const lines = m[1].split(/\r?\n/);
  const data = {};
  for (let i = 0; i < lines.length; i++) {
    const km = lines[i].match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!km) continue;
    let val = km[2].trim();
    const indented = [];
    while (i + 1 < lines.length && (/^\s+\S/.test(lines[i + 1]) || lines[i + 1].trim() === '')) {
      indented.push(lines[++i].trim());
    }
    if (/^[>|][-+]?$/.test(val)) val = indented.join(' ');
    else {
      val = [val, ...indented].join(' ');
      if (/^".*"$/s.test(val)) val = val.slice(1, -1).replace(/\\"/g, '"');
      else if (/^'.*'$/s.test(val)) val = val.slice(1, -1).replace(/''/g, "'");
    }
    data[km[1]] = val.replace(/\s+/g, ' ').trim();
  }
  return data;
}

function listDirs(dir) {
  try {
    return fs.readdirSync(dir).filter((d) => {
      try { return fs.statSync(path.join(dir, d)).isDirectory(); } catch { return false; }
    });
  } catch { return []; }
}

function personalSkills() {
  const dir = path.join(HOME, '.claude', 'skills');
  const out = [];
  for (const d of listDirs(dir)) {
    const fm = readFrontmatter(path.join(dir, d, 'SKILL.md'));
    if (fm) out.push({ name: fm.name || d, description: fm.description || '', source: 'perso' });
  }
  return out;
}

function pluginSkills() {
  const out = [];
  let installed;
  try {
    installed = JSON.parse(fs.readFileSync(path.join(HOME, '.claude', 'plugins', 'installed_plugins.json'), 'utf8'));
  } catch { return out; }
  for (const [key, entries] of Object.entries(installed.plugins || {})) {
    const plugin = key.split('@')[0];
    const entry = [].concat(entries)[0];
    if (!entry || !entry.installPath) continue;
    const files = [];
    const root = path.join(entry.installPath, 'SKILL.md');
    if (fs.existsSync(root)) files.push(root);
    const skillsDir = path.join(entry.installPath, 'skills');
    for (const d of listDirs(skillsDir)) files.push(path.join(skillsDir, d, 'SKILL.md'));
    for (const f of files) {
      const fm = readFrontmatter(f);
      if (fm) out.push({ name: `${plugin}:${fm.name || path.basename(path.dirname(f))}`, description: fm.description || '', source: 'plugin' });
    }
  }
  return out;
}

function appSkills() {
  const base = path.join(LOCAL, 'Claude-Data');
  let best = null;
  for (const account of listDirs(base)) {
    const sp = path.join(base, account, 'local-agent-mode-sessions', 'skills-plugin');
    for (const a of listDirs(sp)) for (const b of listDirs(path.join(sp, a))) {
      try {
        const m = JSON.parse(fs.readFileSync(path.join(sp, a, b, 'manifest.json'), 'utf8'));
        if (!best || (m.lastUpdated || 0) > (best.lastUpdated || 0)) best = m;
      } catch { /* manifeste illisible : on l'ignore */ }
    }
  }
  if (!best) return [];
  return (best.skills || []).filter((s) => s.enabled !== false)
    .map((s) => ({ name: 'anthropic-skills:' + s.name, description: s.description || '', source: 'app' }));
}

// Intégrés à Claude Code : aucun fichier à lire, liste fixe.
const BUILTIN = {
  'code-review': 'Relit le diff en cours pour trouver des bugs.',
  'simplify': 'Relit le code modifié pour le simplifier, puis applique les corrections.',
  'security-review': 'Revue de sécurité des changements en attente.',
  'init': 'Crée un CLAUDE.md qui documente le projet.',
  'run': "Lance l'app du projet pour voir un changement fonctionner.",
  'claude-api': "Référence de l'API Claude et du SDK Anthropic.",
  'dataviz': 'Règles de design pour graphiques et tableaux de bord.',
};

function listSkills() {
  const builtin = Object.entries(BUILTIN).map(([name, description]) => ({ name, description, source: 'builtin' }));
  const seen = new Set();
  return [...personalSkills(), ...pluginSkills(), ...appSkills(), ...builtin]
    .filter((s) => !seen.has(s.name) && seen.add(s.name))
    .sort((a, b) => a.name.localeCompare(b.name));
}

module.exports = { listSkills };
