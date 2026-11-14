import * as React from "react"

// Routage par l'ancre de l'URL : #/, #/projet/<dossier>, #/flux/<id>, #/skills.
export type Route =
  | { vue: "accueil" }
  | { vue: "projet"; dossier: string }
  | { vue: "flux"; id: string }
  | { vue: "skills" }

export function lisRoute(hash = location.hash): Route {
  const [, vue, ...reste] = hash.replace(/^#/, "").split("/")
  let arg: string
  try {
    arg = decodeURIComponent(reste.join("/"))
  } catch {
    return { vue: "accueil" } // ancre mal formée
  }
  if (vue === "projet" && arg) return { vue: "projet", dossier: arg }
  if (vue === "flux" && arg) return { vue: "flux", id: arg }
  if (vue === "skills") return { vue: "skills" }
  return { vue: "accueil" }
}

export const lien = {
  accueil: () => "#/",
  projet: (dossier: string) => `#/projet/${encodeURIComponent(dossier)}`,
  flux: (id: string) => `#/flux/${encodeURIComponent(id)}`,
  nouveauFlux: () => "#/flux/nouveau",
  skills: () => "#/skills",
}

// Garde de navigation : l'Atelier l'installe tant que son brouillon n'est pas enregistré.
let garde: (() => Promise<boolean>) | null = null
export const setGarde = (g: typeof garde) => {
  garde = g
}

// Chaque entrée d'historique porte son rang (history.state.i) : « Précédent » ou « Suivant » refusé par la garde
// peut ainsi être annulé par history.go(), sans perdre d'entrée.
const rang = () => (typeof history.state?.i === "number" ? (history.state.i as number) : null)
let actuel = location.hash // dernière ancre acceptée
let idx = rang() ?? 0 // et son rang
if (rang() === null) history.replaceState({ i: idx }, "")
let accepte = false // le prochain changement d'ancre est déjà passé par la garde (va, ou retour confirmé)

export const va = async (href: string) => {
  if (garde && !(await garde())) return
  if (location.hash !== href) accepte = true
  location.hash = href.slice(1)
}

export function useRoute() {
  const [route, setRoute] = React.useState(() => lisRoute())
  React.useEffect(() => {
    const maj = async () => {
      if (location.hash === actuel) return // retour sur place après un refus
      // « Précédent » / « Suivant » du navigateur, ou ancre tapée : on revient sur place le temps de demander à la garde.
      if (garde && !accepte) {
        const voulu = location.hash
        const ecart = rang() === null ? null : rang()! - idx // null : nouvelle entrée (ancre tapée)
        if (ecart) history.go(-ecart)
        else history.back()
        if (await garde()) {
          accepte = true
          if (ecart) history.go(ecart)
          else location.hash = voulu
        }
        return
      }
      accepte = false
      actuel = location.hash
      idx = rang() ?? idx + 1 // nouvelle entrée : rang suivant
      history.replaceState({ i: idx }, "")
      setRoute(lisRoute())
    }
    // les liens internes passent aussi par la garde
    const clic = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.('a[href^="#/"]')
      if (!garde || !a || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey) return
      e.preventDefault()
      va(a.getAttribute("href")!)
    }
    window.addEventListener("hashchange", maj)
    document.addEventListener("click", clic, true)
    return () => {
      window.removeEventListener("hashchange", maj)
      document.removeEventListener("click", clic, true)
    }
  }, [])
  return route
}
