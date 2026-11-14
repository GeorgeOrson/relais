import { ArrowRightIcon, FolderPlusIcon, PencilIcon, PlayIcon, PlusIcon, RotateCcwIcon } from "lucide-react"

import { Reseau } from "@/components/reseau"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { useRelais } from "@/hooks/use-relais"
import { lien } from "@/hooks/use-route"
import { couleurs, derouleFlux, estRetour, faits, noeudsProjet, resume } from "@/lib/relais"

// Accueil : d'abord reprendre ce qui est en cours, ensuite démarrer autre chose.
export function Accueil() {
  const { data, nouveauProjet } = useRelais()
  const projets = data?.projets ?? []

  return (
    <div className="grid gap-10">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="grid gap-2">
          <h1 tabIndex={-1} className="font-display text-3xl font-bold tracking-tight outline-none sm:text-4xl">
            Que veux-tu{" "}
            <span className="bg-linear-to-r from-[#FF5B1F] via-[#FF2E88] to-[#FFB21F] bg-clip-text text-transparent">créer</span> ?
          </h1>
          <p className="max-w-xl text-muted-foreground">
            Chaque flux enchaîne les bons skills, étape par étape. Relais lance Claude Code et suit l'avancement de tes projets.
          </p>
        </div>
        <Button size="lg" onClick={() => nouveauProjet()}>
          <FolderPlusIcon />
          Nouveau projet
        </Button>
      </section>

      <section aria-labelledby="t-projets" className="grid gap-4">
        <h2 id="t-projets" className="text-lg font-semibold">
          Reprendre
        </h2>
        {!data ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Skeleton className="h-64" />
            <Skeleton className="h-64 max-md:hidden" />
          </div>
        ) : projets.length ? (
          <div className="apparait grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {projets.map((p) =>
              p.introuvable ? (
                <Card key={p.dossier}>
                  <CardHeader>
                    <CardTitle>{p.nom}</CardTitle>
                    <CardDescription className="break-all">Dossier introuvable : {p.dossier}</CardDescription>
                  </CardHeader>
                </Card>
              ) : (
                <Card key={p.dossier} style={couleurs(data.flux, p.flux.id)} className="group transition-shadow hover:shadow-lg">
                  <CardHeader>
                    <CardDescription className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-(--c1)" />
                      {p.flux.nom}
                    </CardDescription>
                    <CardTitle className="text-lg">{p.nom}</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-4">
                    <Reseau noeuds={noeudsProjet(p)} projet courante={p.courante} hauteur={150} legende="Survole un neurone pour voir son étape." />
                    <div className="grid gap-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="truncate text-muted-foreground">
                          {p.courante < 0 ? "Flux terminé" : `${p.etapes[p.courante].titre}${p.etapes[p.courante].retour ? " (retour)" : ""}`}
                        </span>
                        <span className="tabular-nums">
                          {faits(p)}/{p.etapes.length}
                        </span>
                      </div>
                      <Progress value={(faits(p) / p.etapes.length) * 100} aria-label={`Avancement de ${p.nom}`} />
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button asChild variant="secondary" className="w-full">
                      <a href={lien.projet(p.dossier)}>
                        Ouvrir le projet
                        <ArrowRightIcon />
                      </a>
                    </Button>
                  </CardFooter>
                </Card>
              )
            )}
          </div>
        ) : (
          <Card className="border-dashed bg-transparent">
            <CardContent className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium">Aucun projet en cours</p>
                <p className="text-sm text-muted-foreground">Choisis un flux ci-dessous pour lancer ton premier projet.</p>
              </div>
              <Button variant="outline" onClick={() => nouveauProjet()}>
                <FolderPlusIcon />
                Nouveau projet
              </Button>
            </CardContent>
          </Card>
        )}
      </section>

      <section aria-labelledby="t-flux" className="grid gap-4">
        <div className="flex items-center justify-between gap-4">
          <h2 id="t-flux" className="text-lg font-semibold">
            Flux
          </h2>
          <Button asChild variant="ghost" size="sm">
            <a href={lien.nouveauFlux()}>
              <PlusIcon />
              Nouveau flux
            </a>
          </Button>
        </div>
        {!data ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-72" />
            ))}
          </div>
        ) : (
          <div className="apparait grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {data.flux.map((f) => {
              const retours = f.etapes.filter(estRetour).length
              return (
                <Card key={f.id} style={couleurs(data.flux, f.id)} className="transition-shadow hover:shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <span className="size-2.5 shrink-0 rounded-full bg-linear-to-br from-(--c1) to-(--c2)" />
                      {f.nom}
                    </CardTitle>
                    <CardDescription>{f.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-3">
                    <Reseau noeuds={derouleFlux(f)} hauteur={150} legende={resume(f.etapes)} />
                    {retours > 0 && (
                      <Badge variant="outline" className="gap-1 text-muted-foreground">
                        <RotateCcwIcon />
                        Contient {retours > 1 ? `${retours} retours` : "un retour"}
                      </Badge>
                    )}
                  </CardContent>
                  <CardFooter className="mt-auto gap-2">
                    <Button className="flex-1" onClick={() => nouveauProjet(f.id)}>
                      <PlayIcon />
                      Démarrer
                    </Button>
                    <Button asChild variant="outline">
                      <a href={lien.flux(f.id)}>
                        <PencilIcon />
                        Modifier
                      </a>
                    </Button>
                  </CardFooter>
                </Card>
              )
            })}
            <a
              href={lien.nouveauFlux()}
              className="flex min-h-48 flex-col items-center justify-center gap-2 rounded-xl border border-dashed text-muted-foreground transition-colors hover:border-primary hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <PlusIcon className="size-6" />
              <span className="font-medium">Créer un flux</span>
            </a>
          </div>
        )}
      </section>
    </div>
  )
}
