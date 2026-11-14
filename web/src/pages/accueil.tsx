import { ArrowRightIcon, FolderPlusIcon, PencilIcon, PlayIcon, PlusIcon, XIcon } from "lucide-react"
import { toast } from "sonner"

import { Reseau } from "@/components/reseau"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { useConfirm } from "@/hooks/use-confirm"
import { useRelais } from "@/hooks/use-relais"
import { lien } from "@/hooks/use-route"
import { api } from "@/lib/api"
import { couleurs, derouleFlux, faits, noeudsProjet, resume, titreEtape } from "@/lib/relais"
import { cn } from "@/lib/utils"

// Accueil : d'abord reprendre ce qui est en cours, ensuite démarrer autre chose.
export function Accueil() {
  const { data, nouveauProjet, rafraichir } = useRelais()
  const [confirmer, boite] = useConfirm()
  const projets = data?.projets ?? []

  // Retire seulement l'entrée de projets.json : les fichiers du dossier ne sont pas touchés.
  const retirer = async (dossier: string, nom: string) => {
    if (
      !(await confirmer({
        titre: `Retirer « ${nom} » de la liste ?`,
        texte: "Relais oublie ce projet. Aucun fichier n'est supprimé.",
        action: "Retirer",
      }))
    )
      return
    try {
      await api("/api/projet/retirer", { dossier })
      await rafraichir()
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  return (
    <div className="grid gap-10">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="grid gap-2">
          <h1 tabIndex={-1} className="text-display outline-none">
            Que veux-tu <span className="bg-linear-to-r from-(--flux-braise) via-(--flux-rose) to-(--flux-ambre) bg-clip-text text-transparent">créer</span> ?
          </h1>
          <p className="max-w-xl text-muted-foreground">Un flux enchaîne des skills, étape par étape. Relais lance Claude Code et suit l'avancement de tes projets.</p>
        </div>
        <Button size="lg" onClick={() => nouveauProjet()}>
          <FolderPlusIcon />
          Nouveau projet
        </Button>
      </section>

      <section aria-labelledby="t-projets" className="grid gap-4">
        <h2 id="t-projets" className="text-sous-titre">
          Reprendre
        </h2>
        {!data ? (
          <div className="grid gap-4 @xl:grid-cols-2 @4xl:grid-cols-3">
            <Skeleton className="h-64" />
            <Skeleton className="h-64 @max-xl:hidden" />
          </div>
        ) : projets.length ? (
          <div className="apparait grid gap-4 @xl:grid-cols-2 @4xl:grid-cols-3">
            {projets.map((p) =>
              p.introuvable ? (
                <Card key={p.dossier}>
                  <CardHeader>
                    <CardTitle>{p.nom}</CardTitle>
                    <CardDescription className="break-all">
                      {p.abime ? "État illisible" : "Dossier introuvable"} : {p.dossier}
                    </CardDescription>
                  </CardHeader>
                  <CardFooter className="mt-auto">
                    <Button variant="outline" onClick={() => retirer(p.dossier, p.nom)}>
                      <XIcon />
                      Retirer de la liste
                    </Button>
                  </CardFooter>
                </Card>
              ) : (
                // un projet seul prend deux colonnes au lieu de laisser deux tiers vides
                <Card key={p.dossier} style={couleurs(data.flux, p.flux.id)} className={cn("transition-shadow duration-150 hover:shadow-flottant", projets.length === 1 && "@xl:col-span-2")}>
                  <CardHeader>
                    <CardDescription className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-(--c1)" />
                      {p.flux.nom}
                    </CardDescription>
                    <CardTitle className="text-lg">{p.nom}</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-4">
                    <Reseau noeuds={noeudsProjet(p)} projet courante={p.courante} hauteur={150} legende="Survole ou touche un neurone pour voir son étape." survolSeul />
                    <div className="grid gap-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="truncate text-muted-foreground">{p.courante < 0 ? "Flux terminé" : titreEtape(p.etapes[p.courante])}</span>
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
          <h2 id="t-flux" className="text-sous-titre">
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
          <div className="grid gap-4 @xl:grid-cols-2 @4xl:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-72" />
            ))}
          </div>
        ) : (
          <div className="apparait grid gap-4 @xl:grid-cols-2 @4xl:grid-cols-3">
            {data.flux.map((f) => (
              <Card key={f.id} style={couleurs(data.flux, f.id)} className="transition-shadow duration-150 hover:shadow-flottant">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <span className="size-2.5 shrink-0 rounded-full bg-linear-to-br from-(--c1) to-(--c2)" />
                    {f.nom}
                  </CardTitle>
                  <CardDescription>{f.description}</CardDescription>
                </CardHeader>
                {/* le nombre de retours est déjà dans la légende : plus de badge qui décale les pieds de carte */}
                <CardContent>
                  <Reseau noeuds={derouleFlux(f)} hauteur={150} legende={resume(f.etapes)} survolSeul />
                </CardContent>
                <CardFooter className="mt-auto gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => nouveauProjet(f.id)}>
                    <PlayIcon />
                    Démarrer
                  </Button>
                  <Button asChild variant="ghost">
                    <a href={lien.flux(f.id)}>
                      <PencilIcon />
                      Modifier
                    </a>
                  </Button>
                </CardFooter>
              </Card>
            ))}
            <a
              href={lien.nouveauFlux()}
              className="flex min-h-48 flex-col items-center justify-center gap-2 rounded-xl border border-dashed text-muted-foreground transition-colors hover:border-ring hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <PlusIcon className="size-6" />
              <span className="font-medium">Nouveau flux</span>
            </a>
          </div>
        )}
      </section>
      {boite}
    </div>
  )
}
