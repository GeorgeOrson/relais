import type { CSSProperties } from "react"

// Modèle de données de Relais, tel que le renvoie le serveur, et règles partagées par les vues.

export type Source = "perso" | "plugin" | "app" | "builtin"
export type Skill = { name: string; description: string; source: Source }
export type Etape = { id?: string; titre: string; skills: string[]; objectif: string; livrable: string }
export type Retour = { retour: string; note?: string }
export type Item = Etape | Retour
export type Flux = { id: string; nom: string; description: string; ordre?: number; etapes: Item[] }
export type Statut = "a-faire" | "en-cours" | "termine" | "valide" | "saute"
export type Passage = Etape & { ref?: string; retour?: boolean; fichier: string; statut: Statut; manque: boolean; invalide?: boolean }
export type Projet = {
  dossier: string
  nom: string
  introuvable?: boolean
  abime?: boolean // etat.json illisible
  flux: { id: string; nom: string }
  auto: boolean
  courante: number
  etapes: Passage[]
}
export type Data = { skills: Skill[]; flux: Flux[]; projets: Projet[]; parent: string }

export const estRetour = (x: Item): x is Retour => "retour" in x && !!x.retour

export const STATUTS: Record<Statut, string> = {
  "a-faire": "À faire",
  "en-cours": "En cours",
  termine: "À valider",
  valide: "Validé",
  saute: "Sauté",
}

export const SOURCES: Record<Source, string> = {
  perso: "Mes skills",
  plugin: "Plugins",
  app: "Application Claude",
  builtin: "Intégrés à Claude Code",
}

// Un nœud du réseau : une étape, ou un second passage sur une étape (retour).
export type Noeud = { ref: string; titre: string; skills: string[]; statut?: Statut; retour?: boolean }

// Un retour renvoie à une étape déjà passée (1 > 2 > 3 > 2 > 4). Déroulé, il devient un second passage sur cette étape.
export function deroule(items: Item[], idDe: (e: Etape) => string, cibleDe: (r: Retour) => string): Noeud[] {
  const par = new Map<string, Etape>()
  for (const e of items) if (!estRetour(e)) par.set(idDe(e), e)
  const out: Noeud[] = []
  for (const e of items) {
    if (!estRetour(e)) out.push({ ref: idDe(e), titre: e.titre, skills: e.skills })
    else {
      const c = par.get(cibleDe(e))
      if (c) out.push({ ref: cibleDe(e), titre: c.titre, skills: c.skills, retour: true })
    }
  }
  return out
}
export const derouleFlux = (f: Flux) => deroule(f.etapes, (e) => e.id ?? e.titre, (r) => r.retour)
export const noeudsProjet = (p: Projet): Noeud[] => p.etapes.map((e, i) => ({ ...e, ref: e.ref ?? String(i) }))

export function resume(items: Item[]) {
  const n = items.filter((e) => !estRetour(e)).length
  const r = items.length - n
  const sk = new Set(items.flatMap((e) => (estRetour(e) ? [] : e.skills))).size
  return `${n} étape${n > 1 ? "s" : ""}${r ? ` · ${r} retour${r > 1 ? "s" : ""}` : ""} · ${sk} skill${sk > 1 ? "s" : ""}`
}

export const faits = (p: Projet) => p.etapes.filter((e) => e.statut === "valide" || e.statut === "saute").length

// Une paire de couleurs par flux : la seule couleur de l'interface. Les valeurs sont les tokens
// --flux-* de index.css, qui changent de clarté selon le thème.
const PAL: [string, string][] = [
  ["braise", "ambre"],
  ["citron", "menthe"],
  ["rose", "mandarine"],
  ["orchidee", "soleil"],
  ["soleil", "citron"],
  ["mandarine", "rose"],
].map(([a, b]) => [`var(--flux-${a})`, `var(--flux-${b})`] as [string, string])
export function hash(s: string) {
  let h = 2166136261
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619)
  return h >>> 0
}
export function couleurs(flux: Flux[], id?: string): CSSProperties {
  let i = flux.findIndex((f) => f.id === id)
  if (i < 0) i = hash(id || "nouveau")
  const [a, b] = PAL[i % PAL.length]
  return { "--c1": a, "--c2": b } as CSSProperties
}

// « anthropic-skills:built-in-browser » → « Built in browser »
export function nomSkill(nom: string) {
  const s = nom.split(":").pop()!.replace(/[-_]+/g, " ").trim()
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export const slug = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50)
