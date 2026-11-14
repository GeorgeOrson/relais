import * as React from "react"
import { SearchIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { useRelais } from "@/hooks/use-relais"
import { nomSkill, SOURCES, type Skill } from "@/lib/relais"

// Tous les skills installés, groupés par origine. Un skill masqué n'apparaît plus dans l'atelier.
export function Skills() {
  const { data, reglages, regler } = useRelais()
  const [q, setQ] = React.useState("")
  const masques = new Set(reglages.masques)
  const utilises = new Set(data?.flux.flatMap((f) => f.etapes.flatMap((e) => ("skills" in e ? e.skills : []))))

  if (!data) return <Skeleton className="h-96" />
  const trouves = data.skills.filter((s) => !q || (s.name + " " + s.description).toLowerCase().includes(q.toLowerCase()))
  const bascule = (nom: string, visible: boolean) => {
    const n = new Set(masques)
    if (visible) n.delete(nom)
    else n.add(nom)
    regler({ masques: [...n] })
  }

  return (
    <div className="grid gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="grid gap-1">
          <h1 tabIndex={-1} className="text-titre outline-none">
            Skills
          </h1>
          <p className="text-muted-foreground">
            {data.skills.length} skills installés, {data.skills.filter((s) => !masques.has(s.name)).length} visibles dans l'atelier.
          </p>
        </div>
        <div className="relative sm:w-72">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Chercher un skill…" className="pl-8" aria-label="Chercher un skill" />
        </div>
      </header>

      {(Object.keys(SOURCES) as Skill["source"][]).map((src) => {
        const liste = trouves.filter((s) => s.source === src)
        if (!liste.length) return null
        return (
          <Card key={src} className="gap-0 py-0">
            <CardHeader className="border-b py-4">
              <CardTitle className="text-base">{SOURCES[src]}</CardTitle>
              <CardDescription>{liste.length} skills</CardDescription>
            </CardHeader>
            <CardContent className="divide-y px-0">
              {liste.map((s) => (
                <div key={s.name} className="flex items-start gap-4 px-6 py-3">
                  <div className="grid min-w-0 flex-1 gap-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{nomSkill(s.name)}</span>
                      {utilises.has(s.name) && <Badge variant="secondary">dans un flux</Badge>}
                    </div>
                    <span className="truncate font-mono text-xs text-muted-foreground">{s.name}</span>
                    <p className="line-clamp-2 text-sm text-muted-foreground">{s.description}</p>
                  </div>
                  <Switch checked={!masques.has(s.name)} onCheckedChange={(v) => bascule(s.name, v)} aria-label={`Afficher ${s.name} dans l'atelier`} className="mt-1" />
                </div>
              ))}
            </CardContent>
          </Card>
        )
      })}
      {!trouves.length && <p className="text-muted-foreground">Aucun skill ne correspond à « {q} ».</p>}
    </div>
  )
}
