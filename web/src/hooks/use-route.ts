import * as React from "react"

// Routage par l'ancre de l'URL : #/, #/projet/<dossier>, #/flux/<id>, #/skills.
export type Route =
  | { vue: "accueil" }
  | { vue: "projet"; dossier: string }
  | { vue: "flux"; id: string }
  | { vue: "skills" }

export function lisRoute(hash = location.hash): Route {
  const [, vue, ...reste] = hash.replace(/^#/, "").split("/")
  const arg = decodeURIComponent(reste.join("/"))
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

export const va = (href: string) => {
  location.hash = href.slice(1)
}

export function useRoute() {
  const [route, setRoute] = React.useState(() => lisRoute())
  React.useEffect(() => {
    const maj = () => setRoute(lisRoute())
    window.addEventListener("hashchange", maj)
    return () => window.removeEventListener("hashchange", maj)
  }, [])
  return route
}
