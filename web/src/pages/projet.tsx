import * as React from "react"
import { CheckIcon, ChevronDownIcon, CopyIcon, EyeIcon, PlayIcon, RotateCcwIcon, SkipForwardIcon, SparklesIcon, Undo2Icon } from "lucide-react"
import { toast } from "sonner"

import { Reseau } from "@/components/reseau"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { useConfirm } from "@/hooks/use-confirm"
import { useRelais } from "@/hooks/use-relais"
import { lien } from "@/hooks/use-route"
import { api, trouveSkill } from "@/lib/api"
import { couleurs, faits, noeudsProjet, STATUTS, titreEtape, type Passage, type Projet } from "@/lib/relais"
import { cn } from "@/lib/utils"

export function ProjetPage({ dossier }: { dossier: string }) {
  const { data, rafraichir } = useRelais()
  const [confirmer, boite] = useConfirm()
  const [ouverts, setOuverts] = React.useState<Set<number>>(new Set())
  const [livrable, setLivrable] = React.useState<{ titre: string; texte: string } | null>(null)
  const [occupe, setOccupe] = React.useState<string | null>(null)
  const p = data?.projets.find((x) => x.dossier === dossier)

  if (!data) return <Skeleton className="h-96" />
  if (!p || p.introuvable)
    return (
      <div className="grid gap-2">
        <h1 tabIndex={-1} className="text-titre outline-none">
          Projet introuvable
        </h1>
        <p className="text-muted-foreground">
          {p?.abime ? "Le fichier .relais/etat.json de ce projet est illisible." : "Ce projet n'est plus dans la liste ou son dossier a disparu."}{" "}
          <a className="underline" href={lien.accueil()}>Retour à l'accueil</a>
        </p>
      </div>
    )

  const agis = async (i: number, action: string) => {
    const e = p.etapes[i]
    if (action === "voir") {
      try {
        const r = await api<{ texte: string }>(`/api/livrable?d=${encodeURIComponent(dossier)}&i=${i}`)
        setLivrable({ titre: e.titre, texte: r.texte })
      } catch (err) {
        toast.error((err as Error).message)
      }
      return
    }
    if (action === "refaire" && !(await confirmer({ titre: `Refaire « ${e.titre} » ?`, texte: "Le livrable actuel est gardé sous un autre nom (.v1, .v2…) et l'étape repasse à faire.", action: "Refaire" })))
      return
    setOccupe(`${i}${action}`)
    try {
      const r = await api<{ consigne?: string; terminal?: false }>("/api/etape", { dossier, i, action })
      if (action === "copier" && r.consigne) {
        await navigator.clipboard.writeText(r.consigne)
        toast.success("Consigne copiée", { description: "Colle-la dans Claude Code, ouvert dans le dossier du projet." })
      }
      if (action === "lancer" && r.terminal === false) {
        const copie = !!r.consigne && (await navigator.clipboard.writeText(r.consigne).then(() => true, () => false))
        toast.warning("Le terminal ne s'est pas ouvert", {
          description: copie ? "La consigne est copiée : colle-la dans Claude Code, ouvert dans le dossier du projet." : "Clique sur « Copier la consigne », puis colle-la dans Claude Code.",
        })
      } else if (action === "lancer") toast.success("Claude Code s'ouvre dans un terminal", { description: "L'étape passera à « À valider » dès que son livrable sera écrit." })
      if (action === "valider") toast.success(`« ${e.titre} » validée`)
      await rafraichir()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setOccupe(null)
    }
  }

  const trouver = (e: Passage) => trouveSkill(e, "Ajoute-le ensuite à l'étape dans l'éditeur du flux.")

  const montre = (i: number) => {
    setOuverts((o) => new Set(o).add(i))
    requestAnimationFrame(() => document.getElementById(`etape-${i}`)?.scrollIntoView({ behavior: "smooth", block: "center" }))
  }

  const n = faits(p)
  return (
    <div className="grid gap-6" style={couleurs(data.flux, p.flux.id)}>
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid min-w-0 gap-1">
          <Badge variant="outline" className="gap-1.5">
            <span className="size-2 rounded-full bg-(--c1)" />
            {p.flux.nom}
          </Badge>
          <h1 tabIndex={-1} className="text-titre outline-none">
            {p.nom}
          </h1>
          <p className="truncate font-mono text-xs text-muted-foreground" title={p.dossier}>
            {p.dossier}
          </p>
        </div>
        <ModeValidation p={p} rafraichir={rafraichir} />
      </header>

      <Card>
        <CardContent className="grid gap-4">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="text-2xl font-semibold tabular-nums">
              {n}
              <span className="text-base text-muted-foreground">/{p.etapes.length}</span>
            </span>
            <Progress value={(n / p.etapes.length) * 100} className="min-w-40 flex-1" aria-label="Avancement du flux" />
            <span className="text-sm text-muted-foreground">
              {p.courante < 0 ? "Toutes les étapes sont faites." : `En cours : ${titreEtape(p.etapes[p.courante])}`}
            </span>
          </div>
          <Reseau noeuds={noeudsProjet(p)} projet courante={p.courante} hauteur={210} legende="Survole un neurone pour voir son étape, clique dessus pour l'ouvrir." onNoeud={montre} />
        </CardContent>
      </Card>

      <ol className="grid gap-3" aria-label="Étapes du flux">
        {p.etapes.map((e, i) => {
          const courante = i === p.courante
          const ouvert = courante || ouverts.has(i)
          const bascule = () =>
            setOuverts((o) => {
              const n = new Set(o)
              if (n.has(i)) n.delete(i)
              else n.add(i)
              return n
            })
          return (
            <li key={i} id={`etape-${i}`} className="relative grid grid-cols-[2rem_1fr] gap-3 sm:grid-cols-[2.5rem_1fr]">
              {i < p.etapes.length - 1 && (
                <span aria-hidden className={cn("absolute top-10 bottom-[-0.75rem] left-4 w-px sm:left-5", e.statut === "valide" || e.statut === "saute" ? "bg-success/60" : "bg-border")} />
              )}
              <Pastille e={e} i={i} courante={courante} />
              <Card className={cn("gap-0 py-0 transition-shadow", courante && "lisere shadow-flottant", e.statut === "saute" && "opacity-60", e.statut === "a-faire" && !courante && "opacity-80")}>
                <button
                  className="flex w-full items-center gap-3 rounded-xl p-4 text-left focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                  onClick={courante ? undefined : bascule}
                  aria-expanded={ouvert}
                  aria-controls={`detail-${i}`}
                  disabled={courante}
                >
                  <div className="grid min-w-0 flex-1 gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={cn("font-medium", e.statut === "saute" && "line-through")}>{e.titre}</span>
                      {e.retour && (
                        <Badge variant="outline" className="gap-1 border-(--c2)/40 text-(--c2)">
                          <Undo2Icon />
                          Retour
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {e.skills.length ? (
                        e.skills.map((s) => (
                          <Badge key={s} variant="secondary" className="font-mono font-normal">
                            {s}
                          </Badge>
                        ))
                      ) : (
                        <Badge variant="outline" className="border-warning/50 text-warning">
                          skill à trouver
                        </Badge>
                      )}
                    </div>
                  </div>
                  <StatutBadge statut={e.statut} />
                  {!courante && <ChevronDownIcon className={cn("size-4 shrink-0 text-muted-foreground transition-transform", ouvert && "rotate-180")} />}
                </button>
                {ouvert && (
                  <div id={`detail-${i}`} className="grid gap-4 border-t px-4 py-4">
                    <dl className="grid gap-3 text-sm sm:grid-cols-2">
                      <div>
                        <dt className="mb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">Objectif</dt>
                        <dd className="whitespace-pre-line">{e.objectif || "—"}</dd>
                      </div>
                      <div>
                        <dt className="mb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">Livrable</dt>
                        <dd className="whitespace-pre-line">{e.livrable || "—"}</dd>
                      </div>
                    </dl>
                    <Actions e={e} i={i} p={p} occupe={occupe} agis={agis} trouver={trouver} />
                  </div>
                )}
              </Card>
            </li>
          )
        })}
      </ol>

      <Dialog open={!!livrable} onOpenChange={(o) => !o && setLivrable(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{livrable?.titre}</DialogTitle>
            <DialogDescription>Livrable de l'étape</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] rounded-md bg-muted">
            <pre className="p-4 font-sans text-sm leading-relaxed whitespace-pre-wrap">{livrable?.texte}</pre>
          </ScrollArea>
        </DialogContent>
      </Dialog>
      {boite}
    </div>
  )
}

function ModeValidation({ p, rafraichir }: { p: Projet; rafraichir: () => Promise<void> }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2">
      <div className="grid">
        <Label htmlFor="mode">Valider chaque étape</Label>
        <span className="text-xs text-muted-foreground">{p.auto ? "Une session enchaîne tout le flux." : "Tu valides avant de passer à la suite."}</span>
      </div>
      <Switch
        id="mode"
        checked={!p.auto}
        onCheckedChange={async (v) => {
          await api("/api/projet/auto", { dossier: p.dossier, auto: !v }).catch((e) => toast.error(e.message))
          rafraichir()
        }}
      />
    </div>
  )
}

function Pastille({ e, i, courante }: { e: Passage; i: number; courante: boolean }) {
  const fait = e.statut === "valide"
  return (
    <span
      aria-hidden
      className={cn(
        "relative z-10 mt-3 grid size-8 place-items-center rounded-full border bg-background text-xs font-semibold tabular-nums sm:size-10 sm:text-sm",
        fait && "coche border-success/60 bg-success/15 text-success",
        e.statut === "termine" && "border-warning/60 bg-warning/15 text-warning",
        courante && !fait && "border-(--c1) bg-(--c1) text-sur-flux shadow-lueur-flux"
      )}
    >
      {fait ? <CheckIcon className="size-4" /> : e.statut === "saute" ? <SkipForwardIcon className="size-3.5" /> : i + 1}
    </span>
  )
}

function StatutBadge({ statut }: { statut: Passage["statut"] }) {
  const style = {
    "a-faire": "text-muted-foreground",
    "en-cours": "border-(--c1)/50 text-(--c1)",
    termine: "border-warning/50 bg-warning/10 text-warning",
    valide: "border-success/50 bg-success/10 text-success",
    saute: "text-muted-foreground",
  }[statut]
  return (
    <Badge variant="outline" className={cn("shrink-0", style)}>
      {statut === "en-cours" && <span className="size-1.5 animate-pulse rounded-full bg-current" />}
      {STATUTS[statut]}
    </Badge>
  )
}

function Actions(props: {
  e: Passage
  i: number
  p: Projet
  occupe: string | null
  agis: (i: number, action: string) => void
  trouver: (e: Passage) => void
}) {
  const { e, i, p, occupe, agis, trouver } = props
  const courante = i === p.courante
  const b = (action: string, Icone: typeof PlayIcon, txt: string, variant: "default" | "outline" | "ghost" = "outline") => (
    <Button key={action} variant={variant} disabled={!!occupe} onClick={() => agis(i, action)}>
      <Icone />
      {txt}
    </Button>
  )
  const liste: React.ReactNode[] = []
  if (e.invalide)
    return (
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <p className="text-sm text-destructive">Le livrable de cette étape pointe hors du dossier livrables/. Relais peut seulement la sauter.</p>
        {courante && b("sauter", SkipForwardIcon, "Sauter")}
      </div>
    )
  if (e.statut === "termine") liste.push(b("valider", CheckIcon, "Valider", "default"), b("voir", EyeIcon, "Voir le livrable"), b("refaire", RotateCcwIcon, "Refaire", "ghost"))
  else if (e.statut === "valide") liste.push(b("voir", EyeIcon, "Voir le livrable"), b("refaire", RotateCcwIcon, "Refaire", "ghost"))
  else if (e.statut === "saute") liste.push(b("refaire", RotateCcwIcon, "Reprendre", "ghost"))
  else if (courante) {
    if (e.manque)
      liste.push(
        <Button key="trouver" onClick={() => trouver(e)}>
          <SparklesIcon />
          Trouver un skill
        </Button>
      )
    else {
      // en mode auto, une session lancée enchaîne déjà les étapes : pas de second lancement
      if (p.auto && e.statut === "en-cours") liste.push(<span key="session" className="self-center text-sm text-muted-foreground">Session en cours</span>)
      liste.push(b("lancer", PlayIcon, e.statut === "en-cours" ? "Rouvrir dans Claude Code" : p.auto ? "Lancer tout le flux" : "Lancer dans Claude Code", "default"), b("copier", CopyIcon, "Copier la consigne"))
    }
    liste.push(b("sauter", SkipForwardIcon, "Sauter", "ghost"))
  } else return <p className="text-sm text-muted-foreground">Tu pourras lancer cette étape quand les précédentes seront faites.</p>
  return <div className="flex flex-wrap gap-2">{liste}</div>
}
