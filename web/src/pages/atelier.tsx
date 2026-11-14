import * as React from "react"
import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  ArrowDownIcon,
  ArrowUpIcon,
  GripVerticalIcon,
  LibraryIcon,
  Loader2Icon,
  MoreHorizontalIcon,
  PlusIcon,
  SaveIcon,
  SearchIcon,
  SparklesIcon,
  Trash2Icon,
  Undo2Icon,
  XIcon,
} from "lucide-react"
import { toast } from "sonner"

import { Reseau } from "@/components/reseau"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { useConfirm } from "@/hooks/use-confirm"
import { useRelais } from "@/hooks/use-relais"
import { lien, setGarde, va } from "@/hooks/use-route"
import { api, trouveSkill } from "@/lib/api"
import { couleurs, deroule, estRetour, nomSkill, resume, slug, SOURCES, type Flux, type Item, type Skill } from "@/lib/relais"
import { cn } from "@/lib/utils"

// Brouillon de l'atelier. Chaque élément a une clé k stable ; un retour désigne sa cible par sa clé.
type EtapeB = { k: string; type: "etape"; id?: string; titre: string; skills: string[]; objectif: string; livrable: string }
type RetourB = { k: string; type: "retour"; vers?: string; note: string }
type ElemB = EtapeB | RetourB
type Brouillon = { id?: string; nom: string; description: string; items: ElemB[] }

let kid = 0
const nk = () => `k${++kid}`

function versBrouillon(f?: Flux): Brouillon {
  if (!f) return { nom: "", description: "", items: [{ k: nk(), type: "etape", titre: "Cadrage", skills: ["grilling"], objectif: "", livrable: "" }] }
  const items: ElemB[] = f.etapes.map((e) =>
    estRetour(e) ? { k: nk(), type: "retour", note: e.note ?? "", vers: e.retour } : { k: nk(), type: "etape", id: e.id, titre: e.titre, skills: [...e.skills], objectif: e.objectif, livrable: e.livrable }
  )
  // les retours désignent un id d'étape : on le traduit en clé
  for (const r of items) if (r.type === "retour") r.vers = items.find((x) => x.type === "etape" && x.id === r.vers)?.k
  return { id: f.id, nom: f.nom, description: f.description, items }
}

// Étape « où l'on se trouve » juste avant la position i (un retour y ramène sur sa cible).
const precedent = (items: ElemB[], i: number) => {
  const x = items[i - 1]
  return x && (x.type === "retour" ? x.vers : x.k)
}
const retourOk = (items: ElemB[], i: number) => {
  const r = items[i] as RetourB
  return !!r.vers && items.slice(0, i).some((x) => x.type === "etape" && x.k === r.vers) && r.vers !== precedent(items, i)
}
const versItems = (b: Brouillon): Item[] =>
  b.items.map((e) => (e.type === "retour" ? { retour: e.vers ?? "", note: e.note } : { id: e.k, titre: e.titre, skills: e.skills, objectif: e.objectif, livrable: e.livrable }))

// Trois colonnes quand la zone principale (sans la barre latérale) fait au moins 64rem, comme @5xl.
const LARGE = 1024
function largeur() {
  const el = document.getElementById("contenu")
  if (!el) return 0
  const s = getComputedStyle(el)
  return el.clientWidth - parseFloat(s.paddingLeft) - parseFloat(s.paddingRight)
}
function useLarge() {
  const [large, setLarge] = React.useState(() => largeur() >= LARGE)
  React.useEffect(() => {
    const el = document.getElementById("contenu")
    if (!el) return
    const ro = new ResizeObserver(() => setLarge(largeur() >= LARGE))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return large
}

export function Atelier({ id }: { id: string }) {
  const { data } = useRelais()
  const [ouvert, setOuvert] = React.useState(false) // l'éditeur a été affiché : il reste ouvert même si le flux disparaît
  const flux = data?.flux.find((f) => f.id === id)
  if (flux && !ouvert) setOuvert(true)
  if (!data)
    return (
      <div className="grid gap-4 @5xl:grid-cols-[260px_1fr_320px]">
        <Skeleton className="h-96 @max-5xl:hidden" />
        <Skeleton className="h-96" />
        <Skeleton className="h-96 @max-5xl:hidden" />
      </div>
    )
  if (id !== "nouveau" && !flux && !ouvert)
    return (
      <div className="grid gap-2">
        <h1 tabIndex={-1} className="text-titre outline-none">
          Flux introuvable
        </h1>
        <a className="text-muted-foreground underline" href={lien.accueil()}>
          Retour à l'accueil
        </a>
      </div>
    )
  return <Editeur flux={flux} disparu={id !== "nouveau" && !flux} tousFlux={data.flux} skills={data.skills} />
}

function Editeur({ flux, disparu, tousFlux, skills }: { flux?: Flux; disparu: boolean; tousFlux: Flux[]; skills: Skill[] }) {
  const { rafraichir, reglages } = useRelais()
  const [b, setB] = React.useState<Brouillon>(() => versBrouillon(flux))
  const [initial, setInitial] = React.useState(() => JSON.stringify(versItems(b)) + b.nom + b.description)
  const [sel, setSel] = React.useState<string | null>(null)
  const [actif, setActif] = React.useState<{ type: "skill" | "item"; id: string } | null>(null)
  const [bibli, setBibli] = React.useState(false)
  const [enregistre, setEnregistre] = React.useState(false)
  const [confirmer, boite] = useConfirm()
  const large = useLarge()
  const modifie = JSON.stringify(versItems(b)) + b.nom + b.description !== initial
  const aSauver = modifie || disparu

  // Brouillon non enregistré : confirmation avant toute navigation interne, et avant de fermer l'onglet.
  const aSauverRef = React.useRef(aSauver)
  React.useEffect(() => {
    aSauverRef.current = aSauver
  })
  React.useEffect(() => {
    setGarde(() =>
      aSauverRef.current
        ? confirmer({ titre: "Quitter sans enregistrer ?", texte: "Tes changements sur ce flux seront perdus.", action: "Quitter", danger: true })
        : Promise.resolve(true)
    )
    const avant = (e: BeforeUnloadEvent) => {
      if (aSauverRef.current) e.preventDefault()
    }
    addEventListener("beforeunload", avant)
    return () => {
      setGarde(null)
      removeEventListener("beforeunload", avant)
    }
  }, [confirmer])

  const items = b.items
  const choisi = items.find((x) => x.k === sel) ?? null
  const majItems = (f: (it: ElemB[]) => ElemB[]) => setB((v) => ({ ...v, items: f(v.items) }))
  const majElem = (k: string, patch: Partial<EtapeB> | Partial<RetourB>) => majItems((it) => it.map((x) => (x.k === k ? ({ ...x, ...patch } as ElemB) : x)))
  const etapeDe = (k?: string) => items.find((x): x is EtapeB => x.type === "etape" && x.k === k)

  const ajouteEtape = (skill?: string, apres?: number) => {
    const e: EtapeB = { k: nk(), type: "etape", titre: skill ? nomSkill(skill) : "", skills: skill ? [skill] : [], objectif: "", livrable: "" }
    majItems((it) => (apres === undefined ? [...it, e] : [...it.slice(0, apres + 1), e, ...it.slice(apres + 1)]))
    setSel(e.k)
    return e
  }
  const ajouteRetour = () => {
    const prec = precedent(items, items.length)
    const cible = [...items].reverse().find((x) => x.type === "etape" && x.k !== prec)
    if (!cible) return toast("Ajoute d'abord au moins deux étapes", { description: "Un retour renvoie à une étape déjà passée." })
    const r: RetourB = { k: nk(), type: "retour", vers: cible.k, note: "" }
    majItems((it) => [...it, r])
    setSel(r.k)
  }
  const ajouteSkill = (k: string, skill: string) => {
    const e = items.find((x) => x.k === k)
    if (!e) return
    if (e.type === "retour") return toast("Un retour reprend les skills de son étape", { description: "Ajoute le skill à l'étape visée." })
    if (!e.skills.includes(skill)) majElem(k, { skills: [...e.skills, skill] })
    toast.success(`${nomSkill(skill)} ajouté à « ${e.titre || "Sans titre"} »`)
  }
  // « + » de la bibliothèque : sur l'étape sélectionnée, sinon une nouvelle étape
  const plusSkill = (skill: string) => {
    if (choisi?.type === "etape") ajouteSkill(choisi.k, skill)
    else ajouteEtape(skill)
  }
  const supprime = (k: string) => {
    majItems((it) => it.filter((x) => x.k !== k && !(x.type === "retour" && x.vers === k))) // les retours vers cette étape partent avec elle
    if (sel === k) setSel(null)
  }
  const deplace = (k: string, d: -1 | 1) =>
    majItems((it) => {
      const i = it.findIndex((x) => x.k === k)
      const j = i + d
      return j < 0 || j >= it.length ? it : arrayMove(it, i, j)
    })

  const enregistrer = async () => {
    // identifiants stables, pour que les retours puissent désigner leur étape
    const pris = new Set<string>()
    const idDe = new Map<string, string>()
    for (const e of items)
      if (e.type === "etape") {
        const base = slug(e.titre) || "etape"
        let id = e.id && !pris.has(e.id) ? e.id : base
        for (let n = 2; pris.has(id); n++) id = `${base}-${n}`
        pris.add(id)
        idDe.set(e.k, id)
      }
    const etapes = items.map((e) =>
      e.type === "retour" ? { retour: idDe.get(e.vers ?? "") ?? "", note: e.note } : { id: idDe.get(e.k), titre: e.titre, skills: e.skills, objectif: e.objectif, livrable: e.livrable }
    )
    setEnregistre(true)
    try {
      const r = await api<{ flux: Flux }>("/api/flux", { id: b.id, nom: b.nom, description: b.description, etapes })
      await rafraichir()
      toast.success("Flux enregistré")
      setB((v) => ({ ...v, id: r.flux.id, items: v.items.map((x) => (x.type === "etape" ? { ...x, id: idDe.get(x.k) } : x)) }))
      setInitial(JSON.stringify(versItems(b)) + b.nom + b.description)
      aSauverRef.current = false
      if (!b.id) va(lien.flux(r.flux.id))
    } catch (e) {
      toast.error("Impossible d'enregistrer le flux", { description: (e as Error).message })
    } finally {
      setEnregistre(false)
    }
  }

  const supprimeFlux = async () => {
    if (!(await confirmer({ titre: `Supprimer « ${b.nom} » ?`, texte: "Les projets déjà lancés avec ce flux gardent leur copie des étapes.", action: "Supprimer", danger: true })))
      return
    try {
      await api("/api/flux/supprimer", { id: b.id })
    } catch (e) {
      return toast.error("Impossible de supprimer le flux", { description: (e as Error).message })
    }
    setGarde(null) // le flux n'existe plus : rien à protéger
    await va(lien.accueil())
    toast.success("Flux supprimé")
    rafraichir()
  }

  // ---------- Glisser-déposer ----------
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }))
  const collision: CollisionDetection = (args) => {
    if (args.active.data.current?.type !== "skill") return closestCenter(args)
    const hits = pointerWithin(args)
    const cartes = hits.filter((h) => h.id !== "piste")
    return cartes.length ? cartes : hits
  }
  // Annonces pour lecteur d'écran, en français (dnd-kit les fournit en anglais par défaut).
  const libelle = (id: string | number) => {
    const s = String(id)
    if (s === "piste") return "la piste"
    if (s.startsWith("skill:")) return `le skill ${nomSkill(s.slice(6))}`
    const x = items.find((y) => y.k === s)
    return x?.type === "etape" ? `« ${x.titre || "Sans titre"} »` : "le retour"
  }
  const accessibilite = {
    screenReaderInstructions: { draggable: "Pour déplacer un élément, appuie sur Espace ou Entrée, choisis sa place avec les flèches, puis appuie de nouveau sur Espace ou Entrée. Échap annule." },
    announcements: {
      onDragStart: ({ active }: { active: { id: string | number } }) => `${libelle(active.id)} saisi.`,
      onDragOver: ({ active, over }: { active: { id: string | number }; over: { id: string | number } | null }) => (over ? `${libelle(active.id)} au-dessus de ${libelle(over.id)}.` : `${libelle(active.id)} hors de la piste.`),
      onDragEnd: ({ active, over }: { active: { id: string | number }; over: { id: string | number } | null }) => (over ? `${libelle(active.id)} posé sur ${libelle(over.id)}.` : `${libelle(active.id)} lâché hors de la piste.`),
      onDragCancel: ({ active }: { active: { id: string | number } }) => `Déplacement de ${libelle(active.id)} annulé.`,
    },
  }
  const debut = (e: DragStartEvent) => setActif({ type: e.active.data.current?.type, id: String(e.active.id) })
  const fin = (e: DragEndEvent) => {
    setActif(null)
    const { active, over } = e
    if (!over) return
    if (active.data.current?.type === "skill") {
      const skill = active.data.current.skill as string
      if (over.id === "piste") ajouteEtape(skill)
      else ajouteSkill(String(over.id), skill)
      return
    }
    if (active.id !== over.id && over.id !== "piste")
      majItems((it) => arrayMove(it, it.findIndex((x) => x.k === active.id), it.findIndex((x) => x.k === over.id)))
  }

  const masques = new Set(reglages.masques)
  const visibles = skills.filter((s) => !masques.has(s.name))
  const bibliotheque = <Bibliotheque skills={visibles} masques={skills.length - visibles.length} plus={plusSkill} glissable={large} cible={choisi?.type === "etape" ? choisi.titre || "Sans titre" : null} />
  const inspecteur = choisi ? (
    <Inspecteur
      e={choisi}
      items={items}
      maj={(p) => majElem(choisi.k, p)}
      supprime={() => supprime(choisi.k)}
      ouvreBibli={() => setBibli(true)}
      large={large}
    />
  ) : null

  return (
    <div className="grid grid-cols-1 gap-6" style={couleurs(tousFlux, b.id)}>
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h1 tabIndex={-1} className="text-titre outline-none">
            {b.id ? "Modifier le flux" : "Nouveau flux"}
          </h1>
          {aSauver && (
            <Badge variant="outline" className="border-warning/50 text-warning">
              Non enregistré
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" asChild>
            <a href={lien.accueil()}>Fermer</a>
          </Button>
          <Button onClick={enregistrer} disabled={enregistre || !aSauver}>
            {enregistre ? <Loader2Icon className="animate-spin" /> : <SaveIcon />}
            Enregistrer
          </Button>
          {b.id && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" aria-label="Plus d'actions">
                  <MoreHorizontalIcon />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem variant="destructive" onSelect={supprimeFlux}>
                  <Trash2Icon />
                  Supprimer le flux
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </header>

      {disparu && (
        <p role="alert" className="rounded-lg border border-warning/50 bg-warning/10 px-4 py-3 text-sm">
          Ce flux a été supprimé. Enregistre pour le recréer.
        </p>
      )}

      <DndContext accessibility={accessibilite} sensors={sensors} collisionDetection={collision} onDragStart={debut} onDragEnd={fin} onDragCancel={() => setActif(null)}>
        <div className="grid grid-cols-1 items-start gap-6 @5xl:grid-cols-[260px_minmax(0,1fr)_320px]">
          {large && <aside className="sticky top-20 max-h-[calc(100svh-6rem)]">{bibliotheque}</aside>}

          <section className="grid min-w-0 grid-cols-1 gap-4">
            <Card>
              {/* Champs empilés : le nom tient en entier et la description s'écrit sur plusieurs lignes. */}
              <CardContent className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="f-nom">Nom du flux</Label>
                  <Input id="f-nom" value={b.nom} onChange={(e) => setB({ ...b, nom: e.target.value })} placeholder="Ex. : Création de podcast" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="f-desc">Description</Label>
                  <Textarea id="f-desc" rows={2} className="min-h-0" value={b.description} onChange={(e) => setB({ ...b, description: e.target.value })} placeholder="En une phrase : du point de départ au résultat." />
                </div>
              </CardContent>
            </Card>

            <Reseau
              noeuds={deroule(versItems(b), (e) => e.id!, (r) => r.retour)}
              hauteur={190}
              legende={items.length ? resume(versItems(b)) : "Ajoute une étape pour voir le réseau."}
              survolSeul
            />

            {!large && (
              <Button variant="outline" onClick={() => setBibli(true)}>
                <LibraryIcon />
                Ajouter un skill
              </Button>
            )}

            <Piste items={items} sel={sel} setSel={setSel} actif={actif} etapeDe={etapeDe} deplace={deplace} supprime={supprime} />

            <div className="grid gap-2 sm:grid-cols-2">
              <Button variant="outline" className="border-dashed" onClick={() => ajouteEtape(undefined)}>
                <PlusIcon />
                Nouvelle étape
              </Button>
              <Button variant="outline" className="border-dashed" onClick={ajouteRetour}>
                <Undo2Icon />
                Nouveau retour
              </Button>
            </div>
          </section>

          {large && (
            <aside className="sticky top-20">
              {inspecteur ?? (
                <Card className="border-dashed bg-transparent">
                  <CardHeader>
                    <CardTitle className="text-base">Réglages de l'étape</CardTitle>
                    <CardDescription>
                      Choisis une étape pour régler son titre, ses skills, son objectif et son livrable. Un retour fait repasser par une étape déjà faite avant de continuer : 1 → 2 → 3 → 2 → 4.
                    </CardDescription>
                  </CardHeader>
                </Card>
              )}
            </aside>
          )}
        </div>

        <DragOverlay dropAnimation={null}>
          {actif?.type === "skill" && (
            <Badge className="h-8 gap-1.5 px-3 font-mono text-sm shadow-lg">
              <PlusIcon />
              {actif.id.replace(/^skill:/, "")}
            </Badge>
          )}
        </DragOverlay>
      </DndContext>

      {!large && (
        <>
          <Sheet open={bibli} onOpenChange={setBibli}>
            <SheetContent side="left" className="w-[88vw] gap-0 p-0 sm:max-w-sm">
              <SheetHeader className="border-b">
                <SheetTitle>Ajouter un skill</SheetTitle>
                <SheetDescription>{choisi?.type === "etape" ? `Le skill choisi sera ajouté à « ${choisi.titre || "Sans titre"} ».` : "Chaque skill choisi crée une nouvelle étape."}</SheetDescription>
              </SheetHeader>
              <div className="min-h-0 flex-1 p-3">{bibliotheque}</div>
            </SheetContent>
          </Sheet>
          <Sheet open={!!choisi && !bibli} onOpenChange={(o) => !o && setSel(null)}>
            <SheetContent side="bottom" className="max-h-[85svh] overflow-y-auto">
              <SheetHeader className="sr-only">
                <SheetTitle>Réglages de l'élément</SheetTitle>
                <SheetDescription>Titre, skills, objectif et livrable</SheetDescription>
              </SheetHeader>
              <div className="p-4 pt-8">{inspecteur}</div>
            </SheetContent>
          </Sheet>
        </>
      )}
      {boite}
    </div>
  )
}

// ---------- Piste : la suite d'étapes, triable, avec les boucles des retours dans la marge ----------
function Piste(props: {
  items: ElemB[]
  sel: string | null
  setSel: (k: string | null) => void
  actif: { type: "skill" | "item"; id: string } | null
  etapeDe: (k?: string) => EtapeB | undefined
  deplace: (k: string, d: -1 | 1) => void
  supprime: (k: string) => void
}) {
  const { items, actif } = props
  const { setNodeRef, isOver } = useDroppable({ id: "piste" })
  const boite = React.useRef<HTMLOListElement | null>(null)
  const [arcs, setArcs] = React.useState<{ d: string; ok: boolean }[]>([])

  // Boucles des retours : recalculées d'après la position réelle des cartes.
  React.useLayoutEffect(() => {
    const ol = boite.current
    if (!ol) return
    const calcule = () => {
      const pos = (k: string) => {
        const el = ol.querySelector<HTMLElement>(`[data-k="${k}"]`)
        return el ? el.offsetTop + Math.min(32, el.offsetHeight / 2) : null
      }
      setArcs(
        items.flatMap((r, i) => {
          if (r.type !== "retour" || !r.vers) return []
          const y1 = pos(r.k)
          const y2 = pos(r.vers)
          if (y1 == null || y2 == null) return []
          const p = 14 + Math.min(18, Math.abs(y1 - y2) / 14)
          return [{ d: `M38 ${y1}C${38 - p * 2} ${y1} ${38 - p * 2} ${y2} 34 ${y2}`, ok: retourOk(items, i) }]
        })
      )
    }
    calcule()
    const ro = new ResizeObserver(calcule)
    ro.observe(ol)
    return () => ro.disconnect()
  }, [items])

  const strategie = actif?.type === "skill" ? () => null : verticalListSortingStrategy // un skill glissé ne pousse pas les cartes
  return (
    <SortableContext items={items.map((x) => x.k)} strategy={strategie}>
      <ol
        ref={(el) => {
          boite.current = el
          setNodeRef(el)
        }}
        aria-label="Étapes du flux"
        className={cn("relative grid grid-cols-1 gap-3 rounded-xl pl-11 transition-colors", isOver && actif?.type === "skill" && "bg-primary/5 ring-2 ring-primary/40")}
      >
        <span aria-hidden className={cn("pointer-events-none absolute top-6 bottom-6 left-[37px] border-l-2 border-dashed border-border transition-opacity", actif && "opacity-0")} />
        <svg aria-hidden className={cn("pointer-events-none absolute inset-y-0 left-0 h-full w-11 overflow-visible transition-opacity", actif && "opacity-0")} style={{ color: "var(--c2)" }}>
          <defs>
            <marker id="fleche" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M0 0L10 5L0 10z" fill="currentColor" />
            </marker>
          </defs>
          {arcs.map((a, i) => (
            <path key={i} d={a.d} fill="none" strokeWidth="2" strokeLinecap="round" markerEnd="url(#fleche)" className={a.ok ? "boucle vif" : "stroke-destructive"} />
          ))}
        </svg>
        {items.map((x, i) => (
          <Carte key={x.k} x={x} i={i} {...props} />
        ))}
        {!items.length && <li className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">Glisse un skill ici ou ajoute une étape.</li>}
      </ol>
    </SortableContext>
  )
}

function Carte({ x, i, items, sel, setSel, etapeDe, deplace, supprime }: { x: ElemB; i: number } & Parameters<typeof Piste>[0]) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver, active } = useSortable({ id: x.k, data: { type: "item" } })
  const surSkill = isOver && active?.data.current?.type === "skill"
  const choisi = sel === x.k
  const ok = x.type === "etape" || retourOk(items, i)
  const cible = x.type === "retour" ? etapeDe(x.vers) : undefined
  const nom = x.type === "etape" ? x.titre || "Sans titre" : `Retour vers ${cible?.titre || "?"}`
  return (
    <li
      ref={setNodeRef}
      data-k={x.k}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn("relative list-none select-none", isDragging && "z-10")}
    >
      <span aria-hidden className={cn("absolute top-5 -left-[13px] z-10 size-3 rounded-full border-2 bg-background", x.type === "retour" ? "border-(--c2)" : "border-(--c1)")} />
      <Card
        className={cn(
          "gap-0 py-0 transition-[box-shadow,border-color]",
          choisi && "border-primary ring-2 ring-primary/30",
          isDragging && "opacity-90 shadow-xl",
          surSkill && "border-success ring-2 ring-success/40",
          x.type === "retour" && "border-dashed border-(--c2)/50 bg-(--c2)/5",
          !ok && "border-destructive"
        )}
      >
        <div className="flex items-start gap-1 p-2 pr-1">
          <Button variant="ghost" size="icon" className="cursor-grab touch-none text-muted-foreground active:cursor-grabbing" aria-label={`Déplacer « ${nom} »`} {...attributes} {...listeners}>
            <GripVerticalIcon />
          </Button>
          <button
            className="grid min-w-0 flex-1 gap-1.5 rounded-md px-1 py-1.5 text-left focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            onClick={() => setSel(choisi ? null : x.k)}
            aria-pressed={choisi}
          >
            <span className="flex items-center gap-2">
              <span className="font-mono text-xs text-(--c1) tabular-nums">{String(i + 1).padStart(2, "0")}</span>
              {x.type === "retour" && <Undo2Icon className="size-4 text-(--c2)" />}
              <span className={cn("truncate font-medium", x.type === "etape" && !x.titre && "text-muted-foreground italic")}>{nom}</span>
            </span>
            {x.type === "etape" ? (
              <span className="flex flex-wrap gap-1">
                {x.skills.length ? (
                  x.skills.map((s) => (
                    <Badge key={s} variant="secondary" className="font-mono font-normal">
                      {s}
                    </Badge>
                  ))
                ) : (
                  <Badge variant="outline" className="border-warning/50 text-warning">
                    skill à trouver
                  </Badge>
                )}
              </span>
            ) : (
              <span className={cn("text-xs", ok ? "text-muted-foreground" : "text-destructive")}>
                {ok ? (x.note || "Reprend l'étape en tenant compte de la suite.") : "L'étape visée doit être avant ce retour, mais pas juste avant."}
              </span>
            )}
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="text-muted-foreground" aria-label={`Actions sur « ${nom} »`}>
                <MoreHorizontalIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem disabled={i === 0} onSelect={() => deplace(x.k, -1)}>
                <ArrowUpIcon />
                Monter
              </DropdownMenuItem>
              <DropdownMenuItem disabled={i === items.length - 1} onSelect={() => deplace(x.k, 1)}>
                <ArrowDownIcon />
                Descendre
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => supprime(x.k)}>
                <Trash2Icon />
                Supprimer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </Card>
    </li>
  )
}

// ---------- Bibliothèque de skills ----------
function Bibliotheque({ skills, masques, plus, glissable, cible }: { skills: Skill[]; masques: number; plus: (s: string) => void; glissable: boolean; cible: string | null }) {
  const [q, setQ] = React.useState("")
  const trouves = skills.filter((s) => !q || (s.name + " " + s.description).toLowerCase().includes(q.toLowerCase()))
  const groupes = (Object.keys(SOURCES) as Skill["source"][]).map((src) => [src, trouves.filter((s) => s.source === src)] as const).filter(([, l]) => l.length)
  return (
    <Card className="h-full gap-3 py-4">
      <CardHeader className="px-4">
        <CardTitle className="text-base">Skills</CardTitle>
        <CardDescription className="text-xs">{cible ? `« + » ajoute le skill à « ${cible} ».` : glissable ? "Glisse un skill sur la piste ou sur une étape." : "« + » crée une étape avec le skill."}</CardDescription>
      </CardHeader>
      <div className="relative px-4">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-6.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Chercher…" className="pl-8" aria-label="Chercher un skill" />
      </div>
      <ScrollArea className="min-h-0 flex-1 px-2 lg:h-[calc(100svh-17rem)]">
        <div className="grid gap-4 px-2 pb-2">
          {groupes.map(([src, liste]) => (
            <div key={src} className="grid gap-1">
              <p className="px-1 text-xs font-medium text-muted-foreground">{SOURCES[src]}</p>
              {liste.map((s) => (
                <SkillLigne key={s.name} s={s} plus={plus} glissable={glissable} cible={cible} />
              ))}
            </div>
          ))}
          {!groupes.length && <p className="px-1 text-sm text-muted-foreground">Aucun skill trouvé.</p>}
          {masques > 0 && (
            <a href={lien.skills()} className="px-1 text-xs text-muted-foreground underline-offset-2 hover:underline">
              {masques} skill{masques > 1 ? "s" : ""} masqué{masques > 1 ? "s" : ""} · gérer
            </a>
          )}
        </div>
      </ScrollArea>
    </Card>
  )
}

function SkillLigne({ s, plus, glissable, cible }: { s: Skill; plus: (s: string) => void; glissable: boolean; cible: string | null }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `skill:${s.name}`, data: { type: "skill", skill: s.name }, disabled: !glissable })
  return (
    <div
      ref={setNodeRef}
      className={cn("group flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-accent", glissable && "cursor-grab touch-none select-none", isDragging && "opacity-40")}
      {...(glissable ? { ...listeners, ...attributes, role: undefined, "aria-roledescription": undefined, tabIndex: -1 } : {})}
      title={s.description}
    >
      <div className="grid min-w-0 flex-1">
        <span className="truncate text-sm font-medium">{nomSkill(s.name)}</span>
        <span className="truncate font-mono text-xs text-muted-foreground">{s.name}</span>
      </div>
      {/* le libellé dit ce que fait le « + » selon qu'une étape est choisie ou non */}
      <Button
        variant="ghost"
        size="icon-sm"
        className="shrink-0 text-muted-foreground group-hover:text-foreground"
        aria-label={cible ? `Ajouter ${nomSkill(s.name)} à « ${cible} »` : `Créer une étape avec ${nomSkill(s.name)}`}
        title={cible ? `Ajouter à « ${cible} »` : "Créer une étape avec ce skill"}
        onClick={() => plus(s.name)}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <PlusIcon />
      </Button>
    </div>
  )
}

// ---------- Réglages de l'élément sélectionné ----------
function Inspecteur({ e, items, maj, supprime, ouvreBibli, large }: { e: ElemB; items: ElemB[]; maj: (p: Partial<EtapeB> | Partial<RetourB>) => void; supprime: () => void; ouvreBibli: () => void; large: boolean }) {
  const i = items.indexOf(e)
  const trouver = () => e.type === "etape" && trouveSkill(e)
  if (e.type === "retour") {
    const options = items.slice(0, i).filter((x): x is EtapeB => x.type === "etape")
    return (
      <Card className="gap-4">
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Undo2Icon className="size-4 text-(--c2)" />
            Retour · élément {i + 1}
          </CardTitle>
          <Button variant="ghost" size="icon" className="text-destructive" onClick={supprime} aria-label="Supprimer ce retour">
            <Trash2Icon />
          </Button>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="r-vers">Revenir à l'étape</Label>
            <Select value={e.vers} onValueChange={(v) => maj({ vers: v })}>
              <SelectTrigger id="r-vers" className="w-full">
                <SelectValue placeholder="Choisis une étape" />
              </SelectTrigger>
              <SelectContent>
                {options.map((x) => (
                  <SelectItem key={x.k} value={x.k}>
                    {x.titre || "Sans titre"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!retourOk(items, i) && <p className="text-sm text-destructive">Choisis une étape placée avant ce retour, mais pas celle juste avant.</p>}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="r-note">Ce qu'il faut revoir</Label>
            <Textarea id="r-note" value={e.note} onChange={(ev) => maj({ note: ev.target.value })} placeholder="Ex. : corrige ce que la relecture a trouvé." />
            <p className="text-xs text-muted-foreground">L'étape est relancée avec ses skills : Claude relit l'ancien livrable et en écrit une version révisée.</p>
          </div>
        </CardContent>
      </Card>
    )
  }
  return (
    <Card className="gap-4">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-base">Étape {i + 1}</CardTitle>
        <Button variant="ghost" size="icon" className="text-destructive" onClick={supprime} aria-label="Supprimer cette étape">
          <Trash2Icon />
        </Button>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="e-titre">Titre</Label>
          <Input id="e-titre" value={e.titre} onChange={(ev) => maj({ titre: ev.target.value })} placeholder="Ex. : Relecture" autoFocus={large} />
        </div>
        <div className="grid gap-2">
          <Label>Skills</Label>
          <div className="flex flex-wrap gap-1.5">
            {e.skills.map((s) => (
              <Badge key={s} variant="secondary" className="h-7 gap-1 pr-1 font-mono font-normal">
                {s}
                <button className="grid size-6 place-items-center rounded-full hover:bg-background/60" aria-label={`Retirer ${s}`} onClick={() => maj({ skills: e.skills.filter((x) => x !== s) })}>
                  <XIcon className="size-3" />
                </button>
              </Badge>
            ))}
            {!e.skills.length && (
              <Badge variant="outline" className="h-7 border-warning/50 text-warning">
                skill à trouver
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {!large && (
              <Button variant="outline" size="sm" onClick={ouvreBibli}>
                <PlusIcon />
                Ajouter un skill
              </Button>
            )}
            {!e.skills.length && (
              <Button variant="outline" size="sm" onClick={trouver}>
                <SparklesIcon />
                Trouver un skill
              </Button>
            )}
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="e-obj">Objectif</Label>
          <Textarea id="e-obj" value={e.objectif} onChange={(ev) => maj({ objectif: ev.target.value })} placeholder="Ce que l'étape doit accomplir." />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="e-liv">Livrable attendu</Label>
          <Textarea id="e-liv" value={e.livrable} onChange={(ev) => maj({ livrable: ev.target.value })} placeholder="Ce que Claude doit écrire à la fin." />
        </div>
      </CardContent>
    </Card>
  )
}
