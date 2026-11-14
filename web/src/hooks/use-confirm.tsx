import * as React from "react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

type Demande = { titre: string; texte: string; action: string; danger?: boolean }

// Remplace confirm() : renvoie une promesse résolue par le choix fait dans la boîte de dialogue.
export function useConfirm() {
  const [demande, setDemande] = React.useState<(Demande & { ok: (v: boolean) => void }) | null>(null)
  const confirmer = React.useCallback(
    (d: Demande) => new Promise<boolean>((ok) => setDemande({ ...d, ok })),
    []
  )
  const fin = (v: boolean) => {
    demande?.ok(v)
    setDemande(null)
  }
  const boite = (
    <AlertDialog open={!!demande} onOpenChange={(o) => !o && fin(false)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{demande?.titre}</AlertDialogTitle>
          <AlertDialogDescription>{demande?.texte}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction variant={demande?.danger ? "destructive" : "default"} onClick={() => fin(true)}>
            {demande?.action}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
  return [confirmer, boite] as const
}
