import * as React from "react"

import { useCalme } from "@/hooks/use-calme"
import { hash, type Noeud } from "@/lib/relais"
import { cn } from "@/lib/utils"

// Réseau neuronal d'un flux : un nœud par étape (un neurone par skill), des axones vers l'étape suivante,
// une boucle lumineuse par retour. Le signal suit le chemin réel ; dans un projet, il s'arrête à l'étape en cours.
// Le dessin prend la largeur réelle de son conteneur : le texte garde sa taille au lieu d'être réduit.

type Props = {
  noeuds: Noeud[]
  hauteur?: number
  projet?: boolean // colore les nœuds selon le statut des passages
  courante?: number
  legende?: string // texte affiché quand aucun nœud n'est survolé
  onNoeud?: (passage: number) => void
  className?: string
}

function alea(a: number) {
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function Reseau({ noeuds, hauteur = 190, projet, courante, legende, onNoeud, className }: Props) {
  const boite = React.useRef<HTMLDivElement>(null)
  const [W, setW] = React.useState(0)
  const [survol, setSurvol] = React.useState<string | null>(null)
  const calme = useCalme()

  React.useEffect(() => {
    const el = boite.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const cle = JSON.stringify(noeuds) + W + hauteur + courante + !!projet + calme
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const dessin = React.useMemo(() => (W ? dessine(noeuds, W, hauteur, { projet, courante, clic: !!onNoeud, calme }) : null), [cle])

  return (
    <div className={cn("scene", className)}>
      <div ref={boite} className="relative">
        {dessin && (
          <svg
            className="reseau"
            width={W}
            height={hauteur}
            viewBox={`0 0 ${W} ${hauteur}`}
            role={onNoeud ? "group" : "img"}
            aria-label={onNoeud ? "Carte des étapes" : `Réseau : ${noeuds.map((n) => n.titre + (n.retour ? " (retour)" : "")).join(", ")}`}
            onPointerOver={(e) => setSurvol((e.target as Element).closest(".couche")?.getAttribute("data-l") ?? null)}
            onPointerLeave={() => setSurvol(null)}
            onFocus={(e) => setSurvol((e.target as Element).closest(".couche")?.getAttribute("data-l") ?? null)}
            onBlur={() => setSurvol(null)}
            onClick={(e) => {
              const i = (e.target as Element).closest(".couche")?.getAttribute("data-i")
              if (i != null && onNoeud) onNoeud(Number(i))
            }}
            onKeyDown={(e) => {
              const i = (e.target as Element).closest(".couche")?.getAttribute("data-i")
              if ((e.key === "Enter" || e.key === " ") && i != null && onNoeud) {
                e.preventDefault()
                onNoeud(Number(i))
              }
            }}
          >
            {dessin.boucles}
            {dessin.liens}
            {dessin.signaux}
            {dessin.corps}
          </svg>
        )}
        {!dessin && <div style={{ height: hauteur }} />}
      </div>
      {legende && (
        <p className={cn("relative px-3 pb-2.5 text-center font-mono text-xs transition-colors", survol ? "text-white" : "text-white/55")} aria-hidden="true">
          {survol ?? legende}
        </p>
      )}
    </div>
  )
}

function dessine(seq: Noeud[], W: number, H: number, o: { projet?: boolean; courante?: number; clic: boolean; calme: boolean }) {
  const refs = [...new Set(seq.map((e) => e.ref))]
  const idx = new Map(refs.map((r, i) => [r, i]))
  const chemin = seq.map((e) => idx.get(e.ref)!)
  const L = refs.length
  const S = seq.length
  const pad = Math.min(70, Math.max(26, W / (L * 2.4)))
  const ecart = L > 1 ? (W - 2 * pad) / (L - 1) : W
  const labels = ecart >= 86 // assez de place pour écrire le nom de chaque étape
  const haut = 46
  const bas = labels ? 30 : 8
  const rnd = alea(hash(seq.map((e) => e.ref + e.titre + e.skills).join("|")))
  const mid = haut + (H - bas - haut) / 2
  const bande = H - bas - haut
  const u = 1 / (S + 1)
  const T = (0.6 * (S + 1)).toFixed(2) + "s"
  const jusqu = o.courante === undefined || o.courante < 0 ? S - 1 : o.courante
  const sansAnim = o.calme
  const borne = (y: number) => Math.min(H - bas - 12, Math.max(haut + 4, y))
  const f = (v: number) => v.toFixed(1)
  const s3 = (v: number) => v.toFixed(3)

  const nds = refs.map((r, i) => {
    const e = seq.find((x) => x.ref === r)!
    const x = L === 1 ? W / 2 : pad + i * ecart
    const n = Math.min(Math.max(e.skills.length, 1), 4)
    const base = mid + (rnd() - 0.5) * bande * 0.4
    return {
      e,
      i,
      x,
      neurones: Array.from({ length: n }, (_, k) => ({ x: x + (n > 1 ? (rnd() - 0.5) * 12 : 0), y: borne(base + (k - (n - 1) / 2) * 26) })),
    }
  })

  const influx = (key: string, d: string, t0: number, t1: number, gros?: boolean) =>
    sansAnim ? null : (
      <circle key={key} className="influx" r={gros ? 3.6 : 2.8}>
        <animateMotion dur={T} repeatCount="indefinite" path={d} calcMode="linear" keyPoints="0;0;1;1" keyTimes={`0;${s3(t0)};${s3(t1)};1`} />
        <animate attributeName="opacity" dur={T} repeatCount="indefinite" values="0;0;1;1;0;0" keyTimes={`0;${s3(t0 - 0.001)};${s3(t0)};${s3(t1 - 0.001)};${s3(t1)};1`} />
      </circle>
    )

  const liens: React.ReactNode[] = []
  const boucles: React.ReactNode[] = []
  const signaux: React.ReactNode[] = []
  for (let k = 0; k < S - 1; k++) {
    const a = nds[chemin[k]]
    const b = nds[chemin[k + 1]]
    if (a === b) continue
    const vif = k + 1 <= jusqu
    const t0 = (k + 0.5) * u
    const t1 = (k + 1.5) * u
    if (b.i > a.i) {
      a.neurones.forEach((p, pi) =>
        b.neurones.forEach((q, qi) => {
          const dx = (q.x - p.x) / 2
          const d = `M${f(p.x)} ${f(p.y)}C${f(p.x + dx)} ${f(p.y)} ${f(q.x - dx)} ${f(q.y)} ${f(q.x)} ${f(q.y)}`
          const key = `${k}-${pi}-${qi}`
          liens.push(<path key={key} className={cn("mix axone", vif && "vif")} style={{ "--k": f((a.i + 0.5) / Math.max(L - 1, 1)) } as React.CSSProperties} d={d} />)
          if (vif) signaux.push(influx(key, d, t0, t1))
        })
      )
    } else {
      // retour : grande boucle au-dessus du réseau
      const p = a.neurones[0]
      const q = b.neurones[0]
      const sommet = Math.max(6, Math.min(p.y, q.y) - 32 - (a.i - b.i) * 9)
      const d = `M${f(p.x)} ${f(p.y)}C${f(p.x + 16)} ${f(sommet)} ${f(q.x - 16)} ${f(sommet)} ${f(q.x)} ${f(q.y)}`
      boucles.push(<path key={`b${k}`} className={cn("boucle", vif && "vif")} d={d} />)
      if (vif) signaux.push(influx(`b${k}`, d, t0, t1, true))
    }
  }

  const corps = nds.map((c) => {
    const passages = chemin.flatMap((n, k) => (n === c.i ? [k] : []))
    const tirs = passages.filter((k) => k <= jusqu).map((k) => (k + 0.5) * u)
    const feu = (attr: string, repos: number, pic: number) => {
      if (sansAnim || !tirs.length) return null
      const kt = [0]
      const vals = [repos]
      for (const t of tirs) {
        kt.push(t - 0.3 * u, t, t + 0.45 * u)
        vals.push(repos, pic, repos)
      }
      kt.push(1)
      vals.push(repos)
      return <animate attributeName={attr} dur={T} repeatCount="indefinite" values={vals.join(";")} keyTimes={kt.map(s3).join(";")} />
    }
    const k = f(c.i / Math.max(L - 1, 1))
    const titre = `${c.e.titre} — ${c.e.skills.join(" + ") || "skill à trouver"}${passages.length > 1 ? ` · ${passages.length} passages` : ""}`
    let etat = ""
    let cible = passages[0]
    if (o.projet) {
      const st = passages.map((p) => seq[p].statut)
      if (o.courante !== undefined && passages.includes(o.courante)) {
        etat = `${seq[o.courante].statut} courante`
        cible = o.courante
      } else {
        etat = st.every((x) => x === "valide" || x === "saute") ? (st.includes("valide") ? "valide" : "saute") : st.includes("termine") ? "termine" : "a-faire"
        cible = [...passages].reverse().find((p) => o.courante === undefined || o.courante < 0 || p < o.courante) ?? passages[0]
      }
    }
    const court = c.e.titre.length > 16 ? c.e.titre.slice(0, 15) + "…" : c.e.titre
    return (
      <g
        key={c.e.ref}
        className={cn("couche mix", etat)}
        style={{ "--k": k } as React.CSSProperties}
        data-l={titre}
        data-i={cible}
        {...(o.clic ? { tabIndex: 0, role: "button", "aria-label": titre } : {})}
      >
        {c.neurones.map((n, j) => {
          const dend: React.ReactNode[] = []
          for (let b = 0; b < 3; b++) {
            const ang = rnd() * Math.PI * 2
            const len = 14 + rnd() * 12
            const ex = n.x + Math.cos(ang) * len
            const ey = n.y + Math.sin(ang) * len
            dend.push(
              <React.Fragment key={b}>
                <path className="mix dendrite" d={`M${f(n.x)} ${f(n.y)}Q${f(n.x + Math.cos(ang + 0.6) * len * 0.55)} ${f(n.y + Math.sin(ang + 0.6) * len * 0.55)} ${f(ex)} ${f(ey)}`} />
                <circle className="mix bout" cx={f(ex)} cy={f(ey)} r={1.2} />
              </React.Fragment>
            )
          }
          return (
            <React.Fragment key={j}>
              {dend}
              <circle className="mix halo" cx={f(n.x)} cy={f(n.y)} r={12}>
                {feu("r", 12, 22)}
                {feu("opacity", 0.35, 1)}
              </circle>
              {j === 0 && passages.length > 1 && <circle className="anneau" cx={f(n.x)} cy={f(n.y)} r={10} />}
              <circle className="mix noyau" cx={f(n.x)} cy={f(n.y)} r={5.6} />
              <circle className="zone" cx={f(n.x)} cy={f(n.y)} r={18} />
            </React.Fragment>
          )
        })}
        {labels && (
          <text x={f(c.x)} y={H - 9}>
            {court}
          </text>
        )}
      </g>
    )
  })

  return { liens, boucles, signaux, corps }
}
