// Relais — serveur local : flux, projets, lancement des étapes dans Claude Code.
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn, execFile } = require('child_process');
const { listSkills } = require('./skills.js');

const PORT = 4748;
const HOST = '127.0.0.1';
const FLUX_DIR = process.env.RELAIS_FLUX || path.join(__dirname, 'flux'); // changé par test.js
const DATA = process.env.RELAIS_DATA || __dirname; // dossier de projets.json (changé par test.js)
const PROJETS = path.join(DATA, 'projets.json');
const PARENT = path.join(os.homedir(), 'Documents', 'Projets');
const PROMPT = 'Lis le fichier .relais/consigne.md et suis ses instructions.';

class Refus extends Error {}
const refus = (msg) => { throw new Refus(msg); };

const readJson = (file, fallback) => {
  try { return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^﻿/, '')); } catch { return fallback; }
};
const writeJson = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
const slug = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50);
const texte = (v, max = 2000) => String(v ?? '').trim().slice(0, max);

// ---------- Skills (cache court : la page interroge le serveur toutes les quelques secondes) ----------
let cache = { t: 0, skills: [] };
function skills() {
  if (Date.now() - cache.t > 10000) cache = { t: Date.now(), skills: listSkills() };
  return cache.skills;
}
const manque = (etape) => {
  const noms = new Set(skills().map((s) => s.name));
  return !etape.skills.length || etape.skills.some((n) => !noms.has(n));
};

// ---------- Modèles de flux ----------
function listeFlux() {
  let files = [];
  try { files = fs.readdirSync(FLUX_DIR).filter((f) => f.endsWith('.json')); } catch { /* pas encore de dossier */ }
  return files.map((f) => readJson(path.join(FLUX_DIR, f), null)).filter((f) => f && Array.isArray(f.etapes))
    .map((f) => (ids(f.etapes), f))
    .sort((a, b) => (a.ordre ?? 99) - (b.ordre ?? 99) || a.nom.localeCompare(b.nom));
}

// Un flux est une suite d'étapes et de retours. Un retour { retour: <id>, note } renvoie à une étape
// déjà passée (1 > 2 > 3 > 2 > 4) : il devient, dans le projet, un second passage sur cette étape.
const ID = /^[a-z0-9][a-z0-9-]*$/;
function ids(etapes) {
  const pris = new Set();
  for (const e of etapes) {
    if (e.retour) continue;
    const base = slug(e.titre) || 'etape';
    let id = ID.test(String(e.id || '')) && !pris.has(e.id) ? e.id : base;
    for (let n = 2; pris.has(id); n++) id = `${base}-${n}`;
    pris.add(id); e.id = id;
  }
  return etapes;
}

function verifieRetours(etapes) {
  const vus = new Set();
  let prec = null;
  etapes.forEach((e, i) => {
    if (!e.retour) { vus.add(e.id); prec = e.id; return; }
    if (!vus.has(e.retour)) refus(`Le retour n° ${i + 1} doit renvoyer à une étape placée avant lui.`);
    if (e.retour === prec) refus(`Le retour n° ${i + 1} renvoie à l’étape qui le précède : il ne sert à rien.`);
    prec = e.retour;
  });
}

function nettoieEtapes(etapes) {
  if (!Array.isArray(etapes) || !etapes.some((e) => e && !e.retour)) refus('Un flux a besoin d’au moins une étape.');
  const propres = etapes.map((e, i) => {
    if (e.retour) return { retour: texte(e.retour, 60), note: texte(e.note) };
    const titre = texte(e.titre, 80);
    if (!titre) refus(`L’étape ${i + 1} n’a pas de titre.`);
    return {
      id: texte(e.id, 60),
      titre,
      skills: (Array.isArray(e.skills) ? e.skills : []).map((s) => texte(s, 120)).filter(Boolean),
      objectif: texte(e.objectif),
      livrable: texte(e.livrable),
    };
  });
  verifieRetours(ids(propres));
  return propres;
}

// Transforme le modèle en passages linéaires : le moteur de projet n'a ainsi rien à savoir des retours.
function deroule(etapes) {
  verifieRetours(etapes);
  const parId = new Map(etapes.filter((e) => !e.retour).map((e) => [e.id, e]));
  let prec = null;
  return etapes.map((e) => {
    if (!e.retour) {
      prec = e;
      return { ref: e.id, titre: e.titre, skills: e.skills, objectif: e.objectif, livrable: e.livrable };
    }
    const cible = parId.get(e.retour), de = prec;
    prec = cible;
    return {
      ref: cible.id, retour: true, titre: cible.titre, skills: cible.skills,
      objectif: `Retour sur « ${cible.titre} » après « ${de.titre} ». ${e.note || 'Reprends ce travail à la lumière de ce qui a été fait depuis, et mets-le à jour.'}`,
      livrable: `${cible.livrable || cible.titre} Version révisée.`,
    };
  });
}

function enregistreFlux(f) {
  const nom = texte(f.nom, 80);
  if (!nom) refus('Le flux n’a pas de nom.');
  const id = f.id ? String(f.id) : slug(nom);
  if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) refus('Nom de flux invalide.');
  const file = path.join(FLUX_DIR, id + '.json');
  if (!f.id && fs.existsSync(file)) refus('Un flux porte déjà ce nom.');
  const flux = { id, nom, description: texte(f.description, 300), ordre: readJson(file, {}).ordre, etapes: nettoieEtapes(f.etapes) };
  fs.mkdirSync(FLUX_DIR, { recursive: true });
  writeJson(file, flux);
  return flux;
}

function supprimeFlux(id) {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(String(id))) refus('Flux inconnu.');
  fs.rmSync(path.join(FLUX_DIR, id + '.json'), { force: true });
}

// ---------- Projets ----------
// L'état vit dans le dossier du projet : .relais/etat.json (copie figée du flux + statuts), FLUX.md (lisible), livrables/.
const registre = () => readJson(PROJETS, []);
const etatFile = (dossier) => path.join(dossier, '.relais', 'etat.json');

function connu(dossier) {
  const d = registre().find((p) => p === dossier);
  if (!d) refus('Projet inconnu.');
  return d;
}

function ecrisFluxMd(dossier, etat) {
  const noms = { 'a-faire': 'à faire', 'en-cours': 'en cours', termine: 'terminé, à valider', valide: 'validé', saute: 'sauté' };
  const lignes = etat.etapes.map((e, i) =>
    `${i + 1}. **${e.titre}**${e.retour ? ' (retour)' : ''} — ${noms[e.statut]}\n   - Skills : ${e.skills.join(', ') || 'à trouver'}\n   - Livrable : \`${e.fichier}\``);
  fs.writeFileSync(path.join(dossier, 'FLUX.md'),
    `# ${etat.nom}\n\nFlux : ${etat.flux.nom}. Fichier tenu à jour par Relais, ne pas modifier à la main.\n\n## Étapes\n\n${lignes.join('\n')}\n`, 'utf8');
}

function sauve(dossier, etat) {
  const { dossier: _d, courante: _c, ...reste } = etat; // champs calculés par lisProjet, jamais écrits
  const propre = { ...reste, etapes: etat.etapes.map(({ manque: _m, ...e }) => e) };
  writeJson(etatFile(dossier), propre);
  ecrisFluxMd(dossier, propre);
}

// Lit l'état et le rapproche du disque : un livrable présent signifie que l'étape est terminée.
function lisProjet(dossier) {
  const etat = readJson(etatFile(dossier), null);
  if (!etat) return { dossier, nom: path.basename(dossier), introuvable: true, etapes: [] };
  let change = false;
  for (const e of etat.etapes) {
    const present = fs.existsSync(path.join(dossier, e.fichier));
    let s = e.statut;
    if (s !== 'valide' && s !== 'saute') {
      if (present) s = etat.auto ? 'valide' : 'termine';
      else if (s === 'termine') s = 'a-faire';
    }
    if (s !== e.statut) { e.statut = s; change = true; }
  }
  if (change) sauve(dossier, etat);
  const courante = etat.etapes.findIndex((e) => e.statut !== 'valide' && e.statut !== 'saute');
  return { ...etat, dossier, courante, etapes: etat.etapes.map((e) => ({ ...e, manque: manque(e) })) };
}

function creeProjet({ nom, fluxId, parent, existant, auto }) {
  const flux = listeFlux().find((f) => f.id === fluxId) || refus('Flux inconnu.');
  let dossier;
  if (texte(existant)) {
    dossier = path.resolve(texte(existant));
    if (!fs.existsSync(dossier) || !fs.statSync(dossier).isDirectory()) refus('Ce dossier n’existe pas.');
  } else {
    const propre = texte(nom, 80).replace(/[\\/:*?"<>|]/g, '').replace(/[. ]+$/, '');
    if (!propre) refus('Donne un nom au projet.');
    dossier = path.join(path.resolve(texte(parent) || PARENT), propre);
  }
  if (!fs.existsSync(etatFile(dossier))) { // sinon : projet Relais existant, on le rattache simplement
    if (fs.existsSync(path.join(dossier, 'FLUX.md'))) refus('Ce dossier contient déjà un FLUX.md qui ne vient pas de Relais.');
    fs.mkdirSync(path.join(dossier, '.relais'), { recursive: true });
    fs.mkdirSync(path.join(dossier, 'livrables'), { recursive: true });
    sauve(dossier, {
      nom: texte(nom, 80) || path.basename(dossier),
      flux: { id: flux.id, nom: flux.nom },
      auto: !!auto,
      etapes: deroule(flux.etapes).map((e, i) => ({
        ...e, fichier: `livrables/${String(i + 1).padStart(2, '0')}-${slug(e.titre)}${e.retour ? '-retour' : ''}.md`, statut: 'a-faire',
      })),
    });
  }
  const liste = registre();
  if (!liste.includes(dossier)) writeJson(PROJETS, [dossier, ...liste]);
  return dossier;
}

// ---------- Consignes ----------
function consigne(p, i) {
  const anciens = (e, n) => p.etapes.slice(0, n).filter((x) => x.ref === e.ref && x.statut === 'valide').map((x) => '`' + x.fichier + '`');
  const bloc = (e, n) => [
    `### Étape ${n + 1}/${p.etapes.length} : ${e.titre}${e.retour ? ' (retour)' : ''}`,
    `- Skills à invoquer avec l'outil Skill, avant de commencer : ${e.skills.map((s) => '`' + s + '`').join(', ')}`,
    e.retour && `- C'est un retour sur une étape déjà faite : relis d'abord ${anciens(e, n).join(', ') || 'son livrable précédent'}, puis produis une version révisée sans repartir de zéro.`,
    `- Objectif : ${e.objectif || e.titre}`,
    `- Livrable attendu : ${e.livrable || 'un résumé des décisions et du travail fait'}`,
    `- Fichier du livrable : \`${e.fichier}\``,
  ].filter(Boolean).join('\n');
  const aFaire = p.auto ? p.etapes.map((e, n) => [e, n]).filter(([e, n]) => n >= i && e.statut !== 'valide' && e.statut !== 'saute') : [[p.etapes[i], i]];
  const faits = p.etapes.filter((e, n) => n < i && e.statut === 'valide').map((e) => `- \`${e.fichier}\` (${e.titre})`);
  return [
    `# Relais — ${p.nom}`,
    `Tu travailles sur le projet « ${p.nom} » en suivant le flux « ${p.flux.nom} ». Réponds en français.`,
    '## Contexte',
    faits.length ? `Lis d'abord \`FLUX.md\` et les livrables des étapes précédentes :\n${faits.join('\n')}` : "C'est la première étape : il n'y a pas encore de livrable à lire.",
    p.auto ? '## Étapes à enchaîner, dans cet ordre' : '## Étape à réaliser',
    aFaire.map(([e, n]) => bloc(e, n)).join('\n\n'),
    '## Règles',
    [
      "- N'écris le fichier du livrable qu'à la toute fin de l'étape : sa présence signale à Relais qu'elle est terminée.",
      '- Le livrable résume les décisions prises et le travail fait, et cite les fichiers créés ou modifiés.',
      p.auto
        ? "- Enchaîne les étapes sans attendre de validation, mais pose toutes les questions que le skill demande de poser. Si une étape échoue, arrête-toi et explique pourquoi, sans écrire son livrable."
        : "- Ne commence pas l'étape suivante : elle sera lancée depuis Relais après validation.",
      '- Ne modifie ni `FLUX.md` ni le dossier `.relais`.',
    ].join('\n'),
  ].join('\n\n') + '\n';
}

function ouvreTerminal(dossier) {
  if (process.env.RELAIS_DRY) return;
  const repli = () => spawn('cmd', ['/c', 'start', '', '/D', dossier, 'cmd', '/k', 'claude', PROMPT], { detached: true, stdio: 'ignore', windowsHide: true }).unref();
  const wt = spawn('wt.exe', ['-d', dossier, 'claude', PROMPT], { detached: true, stdio: 'ignore' });
  wt.on('error', repli); // Windows Terminal absent : simple fenêtre cmd
  wt.unref();
}

function ecrisConsigne(dossier, contenu) {
  fs.mkdirSync(path.join(dossier, '.relais'), { recursive: true });
  fs.writeFileSync(path.join(dossier, '.relais', 'consigne.md'), contenu, 'utf8');
}

// ---------- Actions sur une étape ----------
function agis({ dossier, i, action }) {
  connu(dossier);
  const p = lisProjet(dossier);
  if (p.introuvable) refus('Le dossier du projet est introuvable.');
  const e = p.etapes[i] || refus('Étape inconnue.');
  if (action === 'lancer' || action === 'copier') {
    if (i !== p.courante) refus('Les étapes se font dans l’ordre : termine ou saute d’abord la précédente.');
    const visees = p.auto ? p.etapes.filter((x, n) => n >= i && x.statut !== 'saute' && x.statut !== 'valide') : [e];
    const bloquee = visees.find((x) => x.manque);
    if (bloquee) refus(`L’étape « ${bloquee.titre} » n’a pas de skill installé. Trouve-lui un skill ou saute-la.`);
    const contenu = consigne(p, i);
    ecrisConsigne(dossier, contenu);
    e.statut = 'en-cours';
    sauve(dossier, p);
    if (action === 'lancer') ouvreTerminal(dossier);
    return { consigne: contenu };
  }
  if (action === 'valider') {
    if (e.statut !== 'termine') refus('Rien à valider : le livrable n’est pas encore écrit.');
    e.statut = 'valide';
  } else if (action === 'sauter') {
    if (i !== p.courante) refus('On ne peut sauter que l’étape en cours.');
    e.statut = 'saute';
  } else if (action === 'refaire') {
    const file = path.join(dossier, e.fichier);
    if (fs.existsSync(file)) { // l'ancien livrable est gardé avec un suffixe
      let n = 1;
      const ancien = (k) => file.replace(/\.md$/, `.v${k}.md`);
      while (fs.existsSync(ancien(n))) n++;
      fs.renameSync(file, ancien(n));
    }
    e.statut = 'a-faire';
  } else refus('Action inconnue.');
  sauve(dossier, p);
  return {};
}

function regleAuto({ dossier, auto }) {
  connu(dossier);
  const etat = readJson(etatFile(dossier), null) || refus('Le dossier du projet est introuvable.');
  etat.auto = !!auto;
  sauve(dossier, etat);
}

// Sélecteur de dossier natif de Windows : le navigateur ne peut pas donner de chemin, le serveur si.
function choisitDossier({ depart }) {
  if (process.env.RELAIS_DRY) return Promise.resolve({ annule: true });
  const script = [
    '[Console]::OutputEncoding = [Text.Encoding]::UTF8',
    'Add-Type -AssemblyName System.Windows.Forms',
    "$f = New-Object System.Windows.Forms.Form -Property @{ TopMost = $true; ShowInTaskbar = $false }",
    '$d = New-Object System.Windows.Forms.FolderBrowserDialog',
    "$d.Description = 'Choisis le dossier'",
    '$d.ShowNewFolderButton = $true',
    'if ($env:RELAIS_DEPART -and (Test-Path -LiteralPath $env:RELAIS_DEPART)) { $d.SelectedPath = $env:RELAIS_DEPART }',
    "if ($d.ShowDialog($f) -eq 'OK') { $d.SelectedPath }",
  ].join('; ');
  return new Promise((resolve) => {
    // le dossier de départ passe par l'environnement, jamais dans le texte du script
    execFile('powershell.exe', ['-NoProfile', '-STA', '-Command', script],
      { env: { ...process.env, RELAIS_DEPART: texte(depart, 500) || PARENT }, windowsHide: true, timeout: 600000 },
      (err, out) => {
        const dossier = String(out || '').trim();
        resolve(!err && dossier ? { dossier } : { annule: true });
      });
  });
}

function trouveSkill({ titre, objectif }) {
  ecrisConsigne(__dirname, [
    '# Relais — trouver un skill',
    `Il me manque un skill Claude Code pour cette étape d'un flux : « ${texte(titre, 80)} ». Objectif : ${texte(objectif) || 'non précisé'}.`,
    "Invoque le skill `find-skills` avec l'outil Skill et cherche des candidats. Présente-moi en français les trois meilleurs : ce que fait chacun, son dépôt, sa popularité.",
    "N'installe rien sans mon accord explicite. Avant toute installation, montre-moi le contenu du SKILL.md.",
    'Réponds en français.',
  ].join('\n\n') + '\n');
  ouvreTerminal(__dirname);
}

// ---------- HTTP ----------
// ---------- Frontend compilé ----------
const WEB = path.join(__dirname, 'web', 'dist');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff', '.json': 'application/json' };
// Renvoie le fichier demandé s'il est bien dans web/dist, sinon null.
function fichierStatique(urlPath) {
  let rel;
  try { rel = decodeURIComponent(urlPath); } catch { return null; }
  const file = path.resolve(WEB, '.' + (rel === '/' ? '/index.html' : rel));
  if (file !== WEB && !file.startsWith(WEB + path.sep)) return null;
  return fs.existsSync(file) && fs.statSync(file).isFile() ? file : null;
}

function send(res, code, body, type = 'application/json; charset=utf-8') {
  res.writeHead(code, { 'content-type': type, 'cache-control': 'no-store' });
  res.end(typeof body === 'string' ? body : JSON.stringify(body));
}

function body(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => { data += c; if (data.length > 1e6) reject(new Refus('Requête trop grosse.')); });
    req.on('end', () => { try { resolve(JSON.parse(data || '{}')); } catch { reject(new Refus('JSON invalide.')); } });
  });
}

const routes = {
  '/api/flux': (b) => ({ flux: enregistreFlux(b) }),
  '/api/flux/supprimer': (b) => (supprimeFlux(b.id), {}),
  '/api/projet': (b) => ({ dossier: creeProjet(b) }),
  '/api/projet/retirer': (b) => (writeJson(PROJETS, registre().filter((d) => d !== b.dossier)), {}),
  '/api/projet/auto': (b) => (regleAuto(b), {}),
  '/api/etape': (b) => agis(b),
  '/api/trouver': (b) => (trouveSkill(b), {}),
  '/api/dossier': (b) => choisitDossier(b),
};

async function handle(req, res) {
  try {
    // Refuse les pages web tierces qui viseraient ce serveur local (rebinding DNS, requêtes inter-sites).
    const host = (req.headers.host || '').toLowerCase();
    if (host !== `localhost:${PORT}` && host !== `127.0.0.1:${PORT}`) return send(res, 403, { error: 'Hôte refusé' });
    const url = new URL(req.url, 'http://x');
    if (req.method === 'GET' && !url.pathname.startsWith('/api/')) {
      const file = fichierStatique(url.pathname);
      if (!file) {
        if (!fs.existsSync(path.join(WEB, 'index.html'))) return send(res, 503, 'Interface non compilée : lance Relais.bat.', 'text/plain; charset=utf-8');
        return send(res, 404, 'Introuvable', 'text/plain; charset=utf-8');
      }
      const immuable = file.includes(path.join(WEB, 'assets')); // noms de fichiers versionnés par Vite
      res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream', 'cache-control': immuable ? 'max-age=31536000, immutable' : 'no-store' });
      return fs.createReadStream(file).pipe(res);
    }
    if (req.method === 'GET' && url.pathname === '/api/data') {
      return send(res, 200, { skills: skills(), flux: listeFlux(), projets: registre().map(lisProjet), parent: PARENT });
    }
    if (req.method === 'GET' && url.pathname === '/api/livrable') {
      const p = lisProjet(connu(url.searchParams.get('d')));
      const e = p.etapes[Number(url.searchParams.get('i'))] || refus('Étape inconnue.');
      return send(res, 200, { texte: fs.readFileSync(path.join(p.dossier, e.fichier), 'utf8').replace(/^﻿/, '') });
    }
    if (req.method === 'POST' && routes[url.pathname]) {
      if (req.headers['x-relais'] !== '1') return send(res, 403, { error: 'Requête refusée' });
      return send(res, 200, await routes[url.pathname](await body(req)));
    }
    send(res, 404, { error: 'Introuvable' });
  } catch (e) {
    if (!(e instanceof Refus)) console.error(e);
    send(res, e instanceof Refus ? 400 : 500, { error: e instanceof Refus ? e.message : 'Erreur interne : ' + e.message });
  }
}

module.exports = { fichierStatique, WEB, creeProjet, lisProjet, agis, regleAuto, consigne, listeFlux, nettoieEtapes, deroule, slug, PROMPT };

if (require.main === module) {
  http.createServer(handle).listen(PORT, HOST, () => {
    const page = `http://localhost:${PORT}/`;
    console.log('Relais : ' + page);
    if (!process.argv.includes('--no-open')) execFile('cmd', ['/c', 'start', '', page], { windowsHide: true }, () => {});
  });
}
