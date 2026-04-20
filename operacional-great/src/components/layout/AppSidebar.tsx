import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import sidebarLogoWhite from '@/components/brand/assets/sidebar-logo-white.png';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  BarChart3,
  BookOpen,
  Bot,
  BrainCircuit,
  BriefcaseBusiness,
  CalendarRange,
  ChevronDown,
  CircleDollarSign,
  ClipboardList,
  DatabaseZap,
  Gauge,
  Layers3,
  LogOut,
  Megaphone,
  MessageCircleMore,
  Shield,
  Sparkles,
  SunMedium,
  Trophy,
  Video,
  Workflow,
  X,
} from 'lucide-react';
import { useState } from 'react';

interface SubNavItem {
  label: string;
  href: string;
  icon?: React.ElementType;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  subItems?: SubNavItem[];
}

const navByModule: Record<string, NavItem[]> = {
  operacional: [
    { label: 'Meu Dia', href: '/operacional/meu-dia', icon: SunMedium },
    { label: 'Dashboard', href: '/operacional/dashboard', icon: Gauge },
    { label: 'CRM Operacional', href: '/operacional/crm', icon: BriefcaseBusiness },
    { label: 'Ranking', href: '/operacional/champions-great-league', icon: Trophy },
    { label: 'Reuniões', href: '/operacional/reunioes', icon: Video },
    {
      label: 'Execução',
      href: '/operacional/execucao',
      icon: Layers3,
      subItems: [
        { label: 'ClickUp', href: '/operacional/execucao', icon: Workflow },
        { label: 'Criativos', href: '/operacional/execucao/criativos', icon: Sparkles },
      ],
    },
    { label: 'Mural de Avisos', href: '/operacional/mural-avisos', icon: Megaphone },
    {
      label: 'Área de Estudos',
      href: '/operacional/area-estudo',
      icon: BookOpen,
      subItems: [
        { label: 'Conteúdos', href: '/operacional/area-estudo/conteudos', icon: BookOpen },
        { label: 'Great Study AI', href: '/operacional/area-estudo/ia', icon: Bot },
      ],
    },
  ],
  comercial: [
    { label: 'Financeiro', href: '/comercial/financeiro', icon: CircleDollarSign },
    { label: 'Dashboard', href: '/comercial/dashboards', icon: BarChart3 },
    { label: 'Pipeline', href: '/comercial/pipeline', icon: Workflow },
    { label: 'Agenda Great', href: '/comercial/agenda-great', icon: CalendarRange },
    { label: 'Meta Agendamentos', href: '/comercial/meta-agendamentos', icon: Trophy },
    { label: 'WhatsApp', href: '/comercial/whatsapp', icon: MessageCircleMore },
  ],
  ceo: [
    { label: 'Dashboard', href: '/ceo/dashboard', icon: BarChart3 },
    { label: 'Meu Dia', href: '/ceo/meu-dia', icon: SunMedium },
    { label: 'Financeiro', href: '/ceo/financeiro', icon: CircleDollarSign },
    { label: 'Custos', href: '/ceo/custos', icon: ClipboardList },
    { label: 'Comissões', href: '/ceo/comissoes', icon: Trophy },
    { label: 'Agente Analista', href: '/ceo/agente-analista', icon: Bot },
  ],
  tech: [
    { label: 'ERP', href: '/tech/erp', icon: DatabaseZap },
    { label: 'Implantações', href: '/tech/implantacoes', icon: Workflow },
    { label: 'Projetos', href: '/tech/projetos', icon: ClipboardList },
    { label: 'Tarefas', href: '/tech/tarefas', icon: Layers3 },
    { label: 'IA Suporte', href: '/tech/ia-suporte', icon: Bot },
    { label: 'IA Analista', href: '/tech/ia-analista', icon: BrainCircuit },
  ],
};

const moduleLabel: Record<string, string> = {
  operacional: 'Operacional',
  comercial: 'Comercial',
  ceo: 'CEO',
  tech: 'Tech',
};

interface AppSidebarProps {
  mobileOpen?: boolean;
  onClose?: () => void;
}

export function AppSidebar({ mobileOpen = false, onClose }: AppSidebarProps) {
  const [openSubMenus, setOpenSubMenus] = useState<Record<string, boolean>>({});
  const { user, logout, isAdmin } = useAuth();
  const location = useLocation();

  const moduleKey = location.pathname.split('/')[1] || 'operacional';
  const navItems = navByModule[moduleKey] ?? navByModule.operacional;
  const currentModuleLabel = moduleLabel[moduleKey] ?? 'Operacional';

  const isSubItemActive = (item: NavItem) => item.subItems?.some((sub) => location.pathname === sub.href) ?? false;

  const isMenuOpen = (item: NavItem) => {
    if (openSubMenus[item.label] !== undefined) {
      return openSubMenus[item.label];
    }
    return isSubItemActive(item);
  };

  const toggleSubMenu = (label: string) => {
    setOpenSubMenus((prev) => ({
      ...prev,
      [label]: !prev[label],
    }));
  };

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/45 backdrop-blur-sm transition-opacity md:hidden',
          mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={onClose}
      />

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-[296px] p-2.5 transition-transform duration-300 md:translate-x-0 md:p-3',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="sidebar-shell flex h-full flex-col overflow-hidden">
          <div className="sidebar-brand flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="sidebar-brand-mark shrink-0">
                <img
                  src={sidebarLogoWhite}
                  alt="Great logo"
                  className="h-full w-full object-contain"
                />
              </div>
              <div>
                <p className="text-[2.05rem] font-black leading-none tracking-[-0.05em] text-white">Great</p>
                <p className="mt-1 text-sm font-semibold text-white/90">{currentModuleLabel}</p>
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-10 w-10 rounded-2xl bg-white/14 text-white hover:bg-white/24 md:hidden"
            >
              <X className="h-5 w-5" />
              <span className="sr-only">Fechar menu</span>
            </Button>
          </div>

          <nav className="sidebar-nav-area flex-1 space-y-1.5 px-3 pb-3">
            {navItems.map((item) => {
              const isActive = location.pathname === item.href && !item.subItems;
              const hasSubItems = Boolean(item.subItems?.length);
              const menuOpen = isMenuOpen(item);
              const Icon = item.icon;

              if (hasSubItems) {
                return (
                  <Collapsible key={item.label} open={menuOpen} onOpenChange={() => toggleSubMenu(item.label)}>
                    <CollapsibleTrigger asChild>
                      <button
                        className={cn(
                          'sidebar-nav-item w-full justify-between text-left',
                          (location.pathname.startsWith(item.href) || isSubItemActive(item)) && 'sidebar-nav-item-active'
                        )}
                      >
                        <span className="flex items-center gap-3">
                          <Icon className="h-[18px] w-[18px] shrink-0" />
                          <span className="truncate text-[15px]">{item.label}</span>
                        </span>
                        <ChevronDown className={cn('h-4 w-4 transition-transform', menuOpen && 'rotate-180')} />
                      </button>
                    </CollapsibleTrigger>

                    <CollapsibleContent className="mt-1.5 space-y-1.5 pl-4">
                      {item.subItems?.map((subItem) => {
                        const SubIcon = subItem.icon;
                        const isSubActive = location.pathname === subItem.href;

                        return (
                          <Link
                            key={subItem.href}
                            to={subItem.href}
                            onClick={onClose}
                            className={cn('sidebar-nav-subitem', isSubActive && 'sidebar-nav-subitem-active')}
                          >
                            {SubIcon ? <SubIcon className="h-4 w-4 shrink-0" /> : null}
                            <span className="truncate">{subItem.label}</span>
                          </Link>
                        );
                      })}
                    </CollapsibleContent>
                  </Collapsible>
                );
              }

              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={onClose}
                  className={cn('sidebar-nav-item', isActive && 'sidebar-nav-item-active')}
                >
                  <Icon className="h-[18px] w-[18px] shrink-0" />
                  <span className="truncate text-[15px]">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="sidebar-footer mt-auto border-t border-white/18 px-4 pb-4 pt-4">
            {user ? (
              <div className="sidebar-user-card rounded-[24px] bg-white/10 px-4 py-3.5 text-white backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/30 bg-white/12 text-base font-bold">
                    {user.name
                      .split(' ')
                      .slice(0, 2)
                      .map((part) => part[0]?.toUpperCase())
                      .join('')}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{user.name}</p>
                    <p className="truncate text-xs text-white/72">
                      {isAdmin ? 'Administrador' : user.role.replace(/_/g, ' ').toLowerCase()}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            <Button
              type="button"
              variant="ghost"
              onClick={async () => {
                void logout();
                window.location.replace('/login');
              }}
              className="sidebar-logout mt-3 h-11 w-full justify-start gap-3 rounded-2xl px-4 text-sm font-semibold text-white/90 hover:text-white"
            >
              {isAdmin ? <Shield className="h-4 w-4" /> : <LogOut className="h-4 w-4" />}
              <span>Sair</span>
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}
