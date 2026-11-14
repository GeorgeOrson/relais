import * as React from "react"
import { FolderOpenIcon, Loader2Icon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useConfirm } from "@/hooks/use-confirm"
import { useRelais } from "@/hooks/use-relais"
import { lien, va } from "@/hooks/use-route"
import { api } from "@/lib/api"
import { couleurs } from "@/lib/relais"

// Création d'un projet : un flux, un nom, un dossier choisi avec le sélecteur de Windows.
export function NouveauProjet() {
  const { data, rafraichir, setNouveauProjet } = useRelais()
  const [open, setOpen] = React.useState(false)
  const [fluxId, setFluxId] = React.useState("")
  const [nom, setNom] = React.useState("")
  const [existant, setExistant] = React.useState(false)
  const [dossier, setDossier] = React.useState("")
  const [manuel, setManuel] = React.useState(true)
  const [erreurs, setErreurs] = React.useState<{ nom?: string; dossier?: string; autre?: string }>({})
  const [occupe, setOccupe] = React.useState<"" | "dossier" | "envoi">("")
  const [confirmer, boite] = useConfirm()

  React.useEffect(() => {
    setNouveauProjet((id) => {
      setFluxId(id && data?.flux.some((f) => f.id === id) ? id : data?.flux[0]?.id || "")
      setNom("")
      setExistant(false)
      setDossier(data?.parent || "")
      setManuel(true)
      setErreurs({})
      setOpen(true)
    })
  }, [data, setNouveauProjet])

  const parcourir = async () => {
    setOccupe("dossier")
    try {
      const r = await api<{ dossier?: string }>("/api/dossier", { depart: dossier || data?.parent })
      if (r.dossier) {
        setDossier(r.dossier)
        setErreurs((e) => ({ ...e, dossier: undefined }))
      }
    } catch (e) {
      toast.error(String((e as Error).message))
    } finally {
      setOccupe("")
    }
  }

  const envoyer = async (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!existant && !nom.trim()) return setErreurs({ nom: "Donne un nom au projet." })
    if (!dossier.trim()) return setErreurs({ dossier: "Choisis un dossier." })
    setOccupe("envoi")
    try {
      type Reponse = { dossier?: string; info?: string; confirmer?: { flux: string; etapes: string[] } }
      const corps = { fluxId, nom: existant ? "" : nom, parent: existant ? "" : dossier, existant: existant ? dossier : "", auto: !manuel }
      let r = await api<Reponse>("/api/projet", corps)
      // dossier venu d'ailleurs qui a déjà un état Relais : ses étapes deviendront des consignes pour Claude Code
      if (r.confirmer) {
        const ok = await confirmer({
          titre: "Rattacher ce dossier ?",
          texte: `Il suit déjà le flux « ${r.confirmer.flux} », qui ne vient pas de ce Relais. Ses étapes seront envoyées à Claude Code comme consignes : ${r.confirmer.etapes.join(" · ")}. Le flux choisi ici sera ignoré.`,
          action: "Rattacher",
        })
        if (!ok) return
        r = await api<Reponse>("/api/projet", { ...corps, confirme: true })
      }
      await rafraichir()
      setOpen(false)
      if (r.info) toast(r.info)
      va(lien.projet(r.dossier!))
    } catch (e) {
      const m = (e as Error).message
      setErreurs(!existant && /\bnom\b/i.test(m) ? { nom: m } : /dossier|chemin/i.test(m) ? { dossier: m } : { autre: m })
    } finally {
      setOccupe("")
    }
  }

  // même nettoyage que le serveur, pour montrer le dossier réellement créé
  const net = nom.trim().replace(/[\\/:*?"<>|]/g, "").replace(/[. ]+$/, "")
  const cible = existant ? dossier : dossier && net ? `${dossier.replace(/[\\/]+$/, "")}\\${net}` : ""
  const aide = erreurs.dossier ?? (occupe === "dossier" ? "Une fenêtre de sélection s'est ouverte sur ton bureau." : cible && `Projet : ${cible}`)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={envoyer} className="grid gap-5" noValidate>
          <DialogHeader>
            <DialogTitle>Nouveau projet</DialogTitle>
            <DialogDescription>Relais crée le dossier du projet et y suit l'avancement du flux.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-2">
            <Label htmlFor="np-flux">Flux</Label>
            <Select value={fluxId} onValueChange={setFluxId}>
              <SelectTrigger id="np-flux" className="w-full">
                <SelectValue placeholder="Choisis un flux" />
              </SelectTrigger>
              <SelectContent>
                {data?.flux.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    <span className="size-2 rounded-full bg-(--c1)" style={couleurs(data.flux, f.id)} />
                    {f.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
            <div className="grid gap-0.5">
              <Label htmlFor="np-existant">Utiliser un dossier existant</Label>
              <p className="text-xs text-muted-foreground">Sinon, un nouveau dossier est créé.</p>
            </div>
            <Switch
              id="np-existant"
              checked={existant}
              onCheckedChange={(v) => {
                setExistant(v)
                setDossier(v ? "" : data?.parent || "") // ne jamais proposer le dossier parent comme dossier de projet
                setErreurs({})
              }}
            />
          </div>

          {!existant && (
            <div className="grid gap-2">
              <Label htmlFor="np-nom">Nom du projet</Label>
              <Input
                id="np-nom"
                value={nom}
                autoFocus
                autoComplete="off"
                aria-invalid={!!erreurs.nom}
                aria-describedby={erreurs.nom ? "np-nom-err" : undefined}
                onChange={(e) => (setNom(e.target.value), setErreurs({}))}
              />
              {erreurs.nom && (
                <p id="np-nom-err" className="text-sm text-destructive">
                  {erreurs.nom}
                </p>
              )}
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="np-dossier">{existant ? "Dossier du projet" : "Dossier parent"}</Label>
            <div className="flex gap-2">
              <Input
                id="np-dossier"
                value={dossier}
                className="font-mono text-xs"
                autoComplete="off"
                aria-invalid={!!erreurs.dossier}
                aria-describedby="np-dossier-aide"
                onChange={(e) => (setDossier(e.target.value), setErreurs({}))}
              />
              <Button type="button" variant="outline" onClick={parcourir} disabled={!!occupe}>
                {occupe === "dossier" ? <Loader2Icon className="animate-spin" /> : <FolderOpenIcon />}
                Parcourir
              </Button>
            </div>
            {aide && (
              <p id="np-dossier-aide" className={erreurs.dossier ? "text-sm text-destructive" : "truncate text-xs text-muted-foreground"}>
                {aide}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
            <div className="grid gap-0.5">
              <Label htmlFor="np-manuel">Valider chaque étape</Label>
              <p className="text-xs text-muted-foreground">Désactivé, une seule session enchaîne tout le flux.</p>
            </div>
            <Switch id="np-manuel" checked={manuel} onCheckedChange={setManuel} />
          </div>

          {erreurs.autre && <p className="text-sm text-destructive">{erreurs.autre}</p>}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={!!occupe || !fluxId}>
              {occupe === "envoi" && <Loader2Icon className="animate-spin" />}
              Créer le projet
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
      {boite}
    </Dialog>
  )
}
