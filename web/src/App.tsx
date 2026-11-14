import * as React from "react"
import { FolderPlusIcon, RefreshCwIcon, SearchIcon, ServerOffIcon, TriangleAlertIcon } from "lucide-react"

import { AppSidebar } from "@/components/app-sidebar"
import { CommandMenu } from "@/components/command-menu"
import { FondNeuronal } from "@/components/fond-neuronal"
import { NouveauProjet } from "@/components/nouveau-projet"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { useCalme } from "@/hooks/use-calme"
import { useRelais } from "@/hooks/use-relais"
import { lien, useRoute, va, type Route } from "@/hooks/use-route"
import { Accueil } from "@/pages/accueil"
import { Atelier } from "@/pages/atelier"
import { ProjetPage } from "@/pages/projet"
import { Skills } from "@/pages/skills"

function titreDe(route: Route, nomDe: (r: Route) => string | undefined) {
  if (route.vue === "skills") return "Skills"
  if (route.vue === "accueil") return "Accueil"
  return nomDe(route) ?? (route.vue === "flux" ? "Nouveau flux" : "Projet")
}

export default function App() {
  const route = useRoute()
  const { data, erreur, rafraichir, reglages, nouveauProjet } = useRelais()
  const [cmd, setCmd] = React.useState(false)
  const calme = useCalme()
  const coupe = !!erreur && !!data // serveur arrêté après le premier chargement
  // la boîte « Nouveau projet » présélectionne le flux qu'on regarde
  const fluxVu = route.vue === "flux" ? route.id : route.vue === "projet" ? data?.projets.find((p) => p.dossier === route.dossier)?.flux?.id : undefined

  const titre = titreDe(route, (r) =>
    r.vue === "projet" ? data?.projets.find((p) => p.dossier === r.dossier)?.nom : r.vue === "flux" ? data?.flux.find((f) => f.id === r.id)?.nom : undefined
  )

  // Titre d'onglet par vue, et focus sur le titre de la page après chaque navigation.
  React.useEffect(() => {
    document.title = titre === "Accueil" ? "Relais" : `${titre} · Relais`
  }, [titre])
  React.useEffect(() => {
    scrollTo(0, 0)
    requestAnimationFrame(() => document.querySelector<HTMLElement>("main h1")?.focus({ preventScroll: true }))
  }, [route])

  return (
    <TooltipProvider>
      <a href="#contenu" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2">
        Aller au contenu
      </a>
      {reglages.fond && !calme && <FondNeuronal />}
      <SidebarProvider>
        <AppSidebar route={route} />
        <SidebarInset className="bg-transparent">
          <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b bg-background/80 px-3 backdrop-blur-md sm:px-4">
            <SidebarTrigger />
            <Separator orientation="vertical" className="mr-1 data-[orientation=vertical]:h-5" />
            <p className="min-w-0 flex-1 truncate text-sm font-medium">{titre}</p>
            <Button variant="outline" size="sm" className="text-muted-foreground max-sm:size-9 max-sm:p-0" onClick={() => setCmd(true)} aria-label="Rechercher (Ctrl+K)">
              <SearchIcon />
              <span className="max-sm:hidden">Rechercher</span>
              <kbd className="pointer-events-none ml-2 rounded border bg-muted px-1.5 font-mono text-[10px] max-sm:hidden">Ctrl K</kbd>
            </Button>
            <Button size="sm" className="max-sm:size-9 max-sm:p-0" onClick={() => nouveauProjet(fluxVu)} disabled={coupe} aria-label="Nouveau projet">
              <FolderPlusIcon />
              <span className="max-sm:hidden">Nouveau projet</span>
            </Button>
          </header>
          {coupe && (
            <div role="alert" className="sticky top-14 z-20 flex items-center gap-2 border-b border-destructive/40 bg-destructive/15 px-4 py-2 text-sm backdrop-blur-md">
              <ServerOffIcon className="size-4 shrink-0" />
              <span>
                Le serveur Relais ne répond plus. Relance <code className="font-mono">Relais.bat</code>.
              </span>
            </div>
          )}
          <main id="contenu" className="@container mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            {erreur && !data ? (
              <ServeurArrete erreur={erreur} reessayer={rafraichir} />
            ) : (
              // pendant une coupure, les boutons de la vue sont désactivés
              <fieldset disabled={coupe} className="contents">
                <Garde key={JSON.stringify(route)}>
                  {route.vue === "projet" ? (
                    <ProjetPage key={route.dossier} dossier={route.dossier} />
                  ) : route.vue === "flux" ? (
                    <Atelier key={route.id} id={route.id} />
                  ) : route.vue === "skills" ? (
                    <Skills />
                  ) : (
                    <Accueil />
                  )}
                </Garde>
              </fieldset>
            )}
          </main>
        </SidebarInset>
      </SidebarProvider>
      <NouveauProjet />
      <CommandMenu open={cmd} setOpen={setCmd} />
      <Toaster position="bottom-right" richColors closeButton />
    </TooltipProvider>
  )
}

// Une erreur dans une vue n'emporte pas toute l'application : la barre latérale reste utilisable.
class Garde extends React.Component<{ children: React.ReactNode }, { erreur: Error | null }> {
  state = { erreur: null as Error | null }
  static getDerivedStateFromError(erreur: Error) {
    return { erreur }
  }
  componentDidCatch(erreur: Error) {
    console.error(erreur)
  }
  render() {
    const { erreur } = this.state
    if (!erreur) return this.props.children
    return (
      <Card className="mx-auto mt-10 max-w-md">
        <CardHeader>
          <TriangleAlertIcon className="mb-2 size-8 text-destructive" />
          <CardTitle>
            <h1 tabIndex={-1} className="outline-none">
              Cet écran a rencontré une erreur
            </h1>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <p className="rounded-md bg-muted px-3 py-2 font-mono text-xs break-words text-muted-foreground">{erreur.message}</p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => location.reload()}>
              <RefreshCwIcon />
              Recharger
            </Button>
            <Button variant="outline" onClick={() => (this.setState({ erreur: null }), va(lien.accueil()))}>
              Retour à l'accueil
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }
}

function ServeurArrete({ erreur, reessayer }: { erreur: string; reessayer: () => void }) {
  return (
    <Card className="mx-auto mt-10 max-w-md">
      <CardHeader>
        <ServerOffIcon className="mb-2 size-8 text-muted-foreground" />
        <CardTitle>
          <h1 tabIndex={-1} className="outline-none">
            Le serveur Relais ne répond pas
          </h1>
        </CardTitle>
        <CardDescription>Il s'est sans doute arrêté. Relance-le avec Relais.bat, puis réessaie.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        <p className="rounded-md bg-muted px-3 py-2 font-mono text-xs text-muted-foreground">{erreur}</p>
        <Button onClick={reessayer}>
          <RefreshCwIcon />
          Réessayer
        </Button>
      </CardContent>
    </Card>
  )
}
