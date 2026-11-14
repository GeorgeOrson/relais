// Vérifie le cycle de vie d'un projet, sans ouvrir de terminal : node test.js
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'relais-'));
process.env.RELAIS_DATA = tmp;
process.env.RELAIS_DRY = '1';
// copie des vrais flux, plus un flux à boucle propre au test
process.env.RELAIS_FLUX = path.join(tmp, 'flux');
fs.cpSync(path.join(__dirname, 'flux'), process.env.RELAIS_FLUX, { recursive: true });
fs.writeFileSync(path.join(process.env.RELAIS_FLUX, 'boucle.json'), JSON.stringify({
  id: 'boucle', nom: 'Boucle', etapes: [
    { titre: 'A', skills: ['grilling'] }, { titre: 'B', skills: ['ponytail'] }, { titre: 'C', skills: ['code-review'] },
    { retour: 'b', note: 'Corrige ce que la relecture a trouvé.' }, { titre: 'D', skills: ['pricing'] },
  ],
}));
const r = require('./server.js');

assert.strictEqual(r.slug('Périmètre du MVP !'), 'perimetre-du-mvp');
assert.strictEqual(r.listeFlux().length >= 4, true);

const d = r.creeProjet({ nom: 'Essai: site?', fluxId: 'site-web', parent: tmp });
assert.strictEqual(path.basename(d), 'Essai site');
let p = r.lisProjet(d);
assert.strictEqual(p.courante, 0);
assert.ok(fs.existsSync(path.join(d, 'FLUX.md')));

// Ordre imposé
assert.throws(() => r.agis({ dossier: d, i: 1, action: 'lancer' }), /ordre/);
// Projet hors registre refusé
assert.throws(() => r.agis({ dossier: tmp, i: 0, action: 'lancer' }), /inconnu/);

const { consigne } = r.agis({ dossier: d, i: 0, action: 'lancer' });
assert.match(consigne, /`grilling`/);
assert.match(consigne, /livrables\/01-cadrage\.md/);
assert.strictEqual(r.lisProjet(d).etapes[0].statut, 'en-cours');
assert.throws(() => r.agis({ dossier: d, i: 0, action: 'valider' }), /pas encore/);

// Le livrable apparaît : l'étape attend la validation
fs.writeFileSync(path.join(d, p.etapes[0].fichier), 'v1');
assert.strictEqual(r.lisProjet(d).etapes[0].statut, 'termine');
r.agis({ dossier: d, i: 0, action: 'valider' });
r.agis({ dossier: d, i: 1, action: 'sauter' });
p = r.lisProjet(d);
assert.deepStrictEqual(p.etapes.slice(0, 2).map((e) => e.statut), ['valide', 'saute']);
assert.strictEqual(p.courante, 2);
assert.match(fs.readFileSync(path.join(d, 'FLUX.md'), 'utf8'), /Marque\*\* — sauté/);
assert.match(r.consigne(p, 2), /01-cadrage\.md \(Cadrage\)|`livrables\/01-cadrage\.md` \(Cadrage\)/);

// Refaire garde l'ancien livrable
r.agis({ dossier: d, i: 0, action: 'refaire' });
assert.ok(fs.existsSync(path.join(d, 'livrables', '01-cadrage.v1.md')));
assert.strictEqual(r.lisProjet(d).courante, 0);

// Mode automatique : un livrable présent vaut validation, et la consigne couvre les étapes restantes
r.regleAuto({ dossier: d, auto: true });
fs.writeFileSync(path.join(d, 'livrables', '01-cadrage.md'), 'v2');
p = r.lisProjet(d);
assert.strictEqual(p.etapes[0].statut, 'valide');
const auto = r.consigne(p, 2);
assert.match(auto, /Étape 3\/5/);
assert.match(auto, /Étape 5\/5/);
assert.doesNotMatch(auto, /Étape 2\/5/);

// Étape sans skill : lancement refusé
const f = r.creeProjet({ nom: 'Formation', fluxId: 'formation', parent: tmp });
fs.writeFileSync(path.join(f, 'livrables', '01-cadrage.md'), 'ok');
r.lisProjet(f);
r.agis({ dossier: f, i: 0, action: 'valider' });
const etatF = path.join(f, '.relais', 'etat.json');
const brut = JSON.parse(fs.readFileSync(etatF, 'utf8'));
brut.etapes[1].skills = []; // indépendant du contenu réel des flux
fs.writeFileSync(etatF, JSON.stringify(brut));
assert.throws(() => r.agis({ dossier: f, i: 1, action: 'lancer' }), /skill/);

// Rattacher un projet existant ne réécrit pas son état
r.creeProjet({ fluxId: 'logiciel', existant: f });
assert.strictEqual(r.lisProjet(f).flux.id, 'formation');

// Retours : 1 > 2 > 3 > 2 > 4
const et = r.nettoieEtapes([{ titre: 'A' }, { titre: 'B' }, { titre: 'C' }, { retour: 'b' }, { titre: 'D' }]);
assert.deepStrictEqual(r.deroule(et).map((e) => e.ref), ['a', 'b', 'c', 'b', 'd']);
assert.throws(() => r.nettoieEtapes([{ retour: 'a' }, { titre: 'A' }]), /avant lui/);
assert.throws(() => r.nettoieEtapes([{ titre: 'A' }, { titre: 'B' }, { retour: 'zz' }]), /avant lui/);
assert.throws(() => r.nettoieEtapes([{ titre: 'A' }, { titre: 'B' }, { retour: 'b' }]), /précède/);
assert.deepStrictEqual(r.nettoieEtapes([{ titre: 'X' }, { titre: 'X' }]).map((e) => e.id), ['x', 'x-2']);

const b = r.creeProjet({ nom: 'Boucle', fluxId: 'boucle', parent: tmp });
let pb = r.lisProjet(b);
assert.deepStrictEqual(pb.etapes.map((e) => e.fichier.slice(10)), ['01-a.md', '02-b.md', '03-c.md', '04-b-retour.md', '05-d.md']);
for (let i = 0; i < 3; i++) {
  fs.writeFileSync(path.join(b, pb.etapes[i].fichier), 'x');
  r.lisProjet(b);
  r.agis({ dossier: b, i, action: 'valider' });
}
pb = r.lisProjet(b);
assert.strictEqual(pb.courante, 3);
const cb = r.agis({ dossier: b, i: 3, action: 'lancer' }).consigne;
assert.match(cb, /\(retour\)/);
assert.match(cb, /relis d'abord `livrables\/02-b\.md`/);
assert.match(cb, /Retour sur « B » après « C »\. Corrige ce que la relecture a trouvé\./);

fs.rmSync(tmp, { recursive: true, force: true });
console.log('OK');

// Fichiers statiques : rien en dehors de web/dist
const st = require('./server.js');
assert.strictEqual(st.fichierStatique('/../server.js'), null);
assert.strictEqual(st.fichierStatique('/%2e%2e/server.js'), null);
assert.strictEqual(st.fichierStatique('/..%5Cserver.js'), null);
assert.strictEqual(st.fichierStatique('/%E0%A4%A'), null);
console.log('OK statique');
