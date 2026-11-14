import * as React from "react"
import { FolderPlusIcon, HomeIcon, PlusIcon, PuzzleIcon, SparklesIcon, WorkflowIcon } from "lucide-react"

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command"
import { useRelais } from "@/hooks/use-relais"
import { lien, va } from "@/hooks/use-route"

// Palette de commandes (Ctrl+K) : aller partout et lancer les actions principales au clavier.
export function CommandMenu({ open, setOpen }: { open: boolean; setOpen: (o: boolean) => void }) {
  const { data, nouveauProjet } = useRelais()

  React.useEffect(() => {
    const touche = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen(!open)
      }
    }
    addEventListener("keydown", touche)
    return () => removeEventListener("keydown", touche)
  }, [open, setOpen])

  const lance = (f: () => void) => () => {
    setOpen(false)
    f()
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen} title="Rechercher" description="Ouvrir un projet ou un flux, ou lancer une action">
      <CommandInput placeholder="Projet, flux, action…" />
      <CommandList>
        <CommandEmpty>Aucun résultat.</CommandEmpty>
        <CommandGroup heading="Actions">
          <CommandItem onSelect={lance(() => nouveauProjet())}>
            <FolderPlusIcon />
            Nouveau projet
          </CommandItem>
          <CommandItem onSelect={lance(() => va(lien.nouveauFlux()))}>
            <PlusIcon />
            Nouveau flux
          </CommandItem>
          <CommandItem onSelect={lance(() => va(lien.accueil()))}>
            <HomeIcon />
            Accueil
          </CommandItem>
          <CommandItem onSelect={lance(() => va(lien.skills()))}>
            <PuzzleIcon />
            Skills
            <CommandShortcut>{data?.skills.length}</CommandShortcut>
          </CommandItem>
        </CommandGroup>
        {!!data?.projets.length && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Projets">
              {data.projets
                .filter((p) => !p.introuvable)
                .map((p) => (
                  <CommandItem key={p.dossier} value={`projet ${p.nom}`} onSelect={lance(() => va(lien.projet(p.dossier)))}>
                    <SparklesIcon />
                    {p.nom}
                    <CommandShortcut>{p.flux.nom}</CommandShortcut>
                  </CommandItem>
                ))}
            </CommandGroup>
          </>
        )}
        <CommandSeparator />
        <CommandGroup heading="Flux">
          {data?.flux.map((f) => (
            <React.Fragment key={f.id}>
              <CommandItem value={`démarrer ${f.nom}`} onSelect={lance(() => nouveauProjet(f.id))}>
                <FolderPlusIcon />
                Démarrer « {f.nom} »
              </CommandItem>
              <CommandItem value={`modifier ${f.nom}`} onSelect={lance(() => va(lien.flux(f.id)))}>
                <WorkflowIcon />
                Modifier « {f.nom} »
              </CommandItem>
            </React.Fragment>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
