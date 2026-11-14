import { toast } from "sonner"

// Appels au serveur local. Les écritures portent l'en-tête x-relais, que le serveur exige.
export async function api<T = Record<string, unknown>>(url: string, body?: unknown): Promise<T> {
  const r = await fetch(
    url,
    body === undefined
      ? undefined
      : { method: "POST", headers: { "content-type": "application/json", "x-relais": "1" }, body: JSON.stringify(body) }
  )
  const j = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(j.error || `Erreur ${r.status}`)
  return j as T
}

// Ouvre Claude Code pour chercher un skill à cette étape ; l'issue s'affiche dans un toast.
export async function trouveSkill(etape: unknown, description?: string) {
  try {
    await api("/api/trouver", etape)
    toast("Claude Code s'ouvre pour chercher un skill", { description })
  } catch (err) {
    toast.error((err as Error).message)
  }
}
