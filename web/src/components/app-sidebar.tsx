import { HomeIcon, MonitorIcon, MoonIcon, PlusIcon, PuzzleIcon, SparklesIcon, SunIcon, WorkflowIcon } from "lucide-react"

import { useTheme } from "@/components/theme-provider"
import { Label } from "@/components/ui/label"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { Switch } from "@/components/ui/switch"
import { useRelais } from "@/hooks/use-relais"
import { lien, type Route } from "@/hooks/use-route"
import { couleurs, faits } from "@/lib/relais"
import { cn } from "@/lib/utils"

const NOMS = { light: "Clair", dark: "Sombre", system: "Système" } as const
const SUIVANT = { light: "dark", dark: "system", system: "light" } as const

export function AppSidebar({ route }: { route: Route }) {
  const { data, reglages, regler, nouveauProjet } = useRelais()
  const { theme, setTheme } = useTheme()
  const { setOpenMobile } = useSidebar()
  const ferme = () => setOpenMobile(false) // sur mobile, la barre se referme après un choix
  const projets = data?.projets.filter((p) => !p.introuvable) ?? []

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild tooltip="Relais">
              <a href={lien.accueil()} onClick={ferme}>
                <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
                  <svg viewBox="0 0 32 32" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M7 16h12M15 10l6 6-6 6M25 9v14" />
                  </svg>
                </span>
                <span className="text-base font-semibold tracking-titre">Relais</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={route.vue === "accueil"} tooltip="Accueil">
                  <a href={lien.accueil()} onClick={ferme}>
                    <HomeIcon />
                    <span>Accueil</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={route.vue === "skills"} tooltip="Skills">
                  <a href={lien.skills()} onClick={ferme}>
                    <PuzzleIcon />
                    <span>Skills</span>
                  </a>
                </SidebarMenuButton>
                {data && <SidebarMenuBadge>{data.skills.length}</SidebarMenuBadge>}
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Projets en cours</SidebarGroupLabel>
          <SidebarGroupAction title="Nouveau projet" onClick={() => (ferme(), nouveauProjet())}>
            <PlusIcon />
            <span className="sr-only">Nouveau projet</span>
          </SidebarGroupAction>
          <SidebarGroupContent>
            <SidebarMenu>
              {projets.map((p) => (
                <SidebarMenuItem key={p.dossier}>
                  <SidebarMenuButton asChild isActive={route.vue === "projet" && route.dossier === p.dossier} tooltip={p.nom}>
                    <a href={lien.projet(p.dossier)} onClick={ferme}>
                      <SparklesIcon />
                      <span className="truncate">{p.nom}</span>
                    </a>
                  </SidebarMenuButton>
                  <SidebarMenuBadge className="tabular-nums">
                    {faits(p)}/{p.etapes.length}
                  </SidebarMenuBadge>
                </SidebarMenuItem>
              ))}
              {data && !projets.length && <p className="px-2 py-1 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">Aucun projet pour l'instant.</p>}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Flux</SidebarGroupLabel>
          <SidebarGroupAction asChild title="Nouveau flux">
            <a href={lien.nouveauFlux()} onClick={ferme}>
              <PlusIcon />
              <span className="sr-only">Nouveau flux</span>
            </a>
          </SidebarGroupAction>
          <SidebarGroupContent>
            <SidebarMenu>
              {data?.flux.map((f) => (
                <SidebarMenuItem key={f.id}>
                  <SidebarMenuButton asChild isActive={route.vue === "flux" && route.id === f.id} tooltip={f.nom}>
                    <a href={lien.flux(f.id)} onClick={ferme} style={couleurs(data.flux, f.id)}>
                      <WorkflowIcon className="text-(--c1)" />
                      <span className="truncate">{f.nom}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Barre repliée : les mêmes réglages en icônes (UX m6). */}
      <SidebarFooter className="hidden group-data-[collapsible=icon]:flex">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip={`Thème : ${NOMS[theme]} (changer)`} onClick={() => setTheme(SUIVANT[theme])}>
              {theme === "light" ? <SunIcon /> : theme === "dark" ? <MoonIcon /> : <MonitorIcon />}
              <span>Thème : {NOMS[theme]}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip={reglages.fond ? "Fond animé : activé" : "Fond animé : désactivé"} aria-pressed={reglages.fond} onClick={() => regler({ fond: !reglages.fond })}>
              <SparklesIcon className={cn(!reglages.fond && "opacity-40")} />
              <span>Fond animé</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarFooter className="gap-3 group-data-[collapsible=icon]:hidden">
        <div className="flex rounded-lg bg-sidebar-accent p-0.5" role="radiogroup" aria-label="Thème">
          {(
            [
              ["light", SunIcon, "Clair"],
              ["dark", MoonIcon, "Sombre"],
              ["system", MonitorIcon, "Système"],
            ] as const
          ).map(([v, Icone, nom]) => (
            <button
              key={v}
              role="radio"
              aria-checked={theme === v}
              onClick={() => setTheme(v)}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-xs text-muted-foreground transition-colors",
                theme === v && "bg-background text-foreground shadow-sm"
              )}
            >
              <Icone className="size-3.5" />
              {nom}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between gap-2 px-1">
          <Label htmlFor="fond" className="text-xs font-normal text-muted-foreground">
            Fond animé
          </Label>
          <Switch id="fond" checked={reglages.fond} onCheckedChange={(v) => regler({ fond: v })} />
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
