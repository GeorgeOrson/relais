import * as React from "react"

type Theme = "dark" | "light" | "system"
type Etat = { theme: Theme; setTheme: (t: Theme) => void }

const Ctx = React.createContext<Etat | undefined>(undefined)
const CLE = "relais-theme"
const SOMBRE = "(prefers-color-scheme: dark)"

function lis(): Theme {
  try {
    const t = localStorage.getItem(CLE)
    if (t === "dark" || t === "light" || t === "system") return t
  } catch {
    /* stockage indisponible */
  }
  return "dark"
}

// Thème clair, sombre ou celui du système. Sombre par défaut : c'est l'identité de Relais.
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = React.useState<Theme>(lis)

  const setTheme = React.useCallback((t: Theme) => {
    try {
      localStorage.setItem(CLE, t)
    } catch {
      /* le choix vaut pour cette visite */
    }
    setThemeState(t)
  }, [])

  React.useEffect(() => {
    const mq = matchMedia(SOMBRE)
    const applique = () => {
      const r = document.documentElement
      const sombre = theme === "dark" || (theme === "system" && mq.matches)
      r.classList.toggle("dark", sombre)
      r.classList.toggle("light", !sombre)
    }
    applique()
    if (theme !== "system") return
    mq.addEventListener("change", applique)
    return () => mq.removeEventListener("change", applique)
  }, [theme])

  const valeur = React.useMemo(() => ({ theme, setTheme }), [theme, setTheme])
  return <Ctx.Provider value={valeur}>{children}</Ctx.Provider>
}

export function useTheme() {
  const c = React.useContext(Ctx)
  if (!c) throw new Error("useTheme hors de ThemeProvider")
  return c
}
