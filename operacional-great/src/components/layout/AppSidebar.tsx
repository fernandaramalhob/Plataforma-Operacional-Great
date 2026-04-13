import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/brand/Logo';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  LayoutDashboard,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Briefcase,
  UserCircle,
  LogOut,
  Shield,
  Sun,
  Layers,
  Palette,
  BookOpen,
  Megaphone,
} from 'lucide-react';

interface SubNavItem {
  label: string;
  href: string;
  icon?: React.ElementType;
  iconColor?: string;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  iconColor?: string;
  roles?: string[];
  subItems?: SubNavItem[];
}

const operacionalNav: NavItem[] = [
  { label: 'Meu Dia', href: '/operacional/meu-dia', icon: Sun, iconColor: 'text-amber-400' },
  { label: 'Dashboard', href: '/operacional/dashboard', icon: LayoutDashboard, iconColor: 'text-blue-500' },
  { label: 'CRM Operacional', href: '/operacional/crm', icon: Briefcase, iconColor: 'text-violet-500' },
  {
    label: 'Execução',
    href: '/operacional/execucao',
    icon: Layers,
    iconColor: 'text-indigo-500',
    subItems: [
      { label: 'Criativos', href: '/operacional/execucao/criativos', icon: Palette, iconColor: 'text-pink-500' },
      { label: 'ClickUp', href: '/operacional/execucao', icon: Layers, iconColor: 'text-indigo-500' },
    ]
  },
  { label: 'Mural de Avisos', href: '/operacional/mural-avisos', icon: Megaphone, iconColor: 'text-orange-500' },
  { label: 'Área de Estudos', href: '/operacional/area-estudo', icon: BookOpen, iconColor: 'text-emerald-500' },
];

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [openSubMenus, setOpenSubMenus] = useState<Record<string, boolean>>({});
  const { user, logout, isAdmin } = useAuth();
  const location = useLocation();

  const filteredNavItems = operacionalNav.filter(item => {
    if (!item.roles) return true;
    if (isAdmin) return true;
    return user && item.roles.includes(user.role);
  });

  const isSubItemActive = (item: NavItem) => {
    if (!item.subItems) return false;
    return item.subItems.some(sub => location.pathname === sub.href);
  };

  const isMenuOpen = (item: NavItem) => {
    if (openSubMenus[item.label] !== undefined) {
      return openSubMenus[item.label];
    }
    return isSubItemActive(item);
  };

  const toggleSubMenu = (label: string) => {
    setOpenSubMenus(prev => ({
      ...prev,
      [label]: !prev[label]
    }));
  };

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen border-r transition-all duration-300 flex flex-col',
        'bg-sidebar-background border-sidebar-border',
        collapsed ? 'w-[72px]' : 'w-[260px]'
      )}
    >
      <div
        className={cn(
          'h-16 flex items-center border-b border-sidebar-border px-4',
          collapsed ? 'justify-center' : 'justify-between'
        )}
      >
        {collapsed ? (
          <Logo variant="mark" size="md" />
        ) : (
          <Logo variant="full" size="md" />
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            'text-muted-foreground hover:text-foreground',
            collapsed && 'absolute -right-3 border rounded-full bg-sidebar-background border-sidebar-border'
          )}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto custom-scrollbar">
        {filteredNavItems.map((item) => {
          const isActive = location.pathname === item.href && !item.subItems;
          const hasSubItems = item.subItems && item.subItems.length > 0;
          const isOpen = isMenuOpen(item);
          const Icon = item.icon;

          if (hasSubItems && !collapsed) {
            return (
              <Collapsible
                key={item.label}
                open={isOpen}
                onOpenChange={() => toggleSubMenu(item.label)}
              >
                <CollapsibleTrigger asChild>
                  <button
                    className={cn(
                      'relative flex items-center gap-3 px-3 py-2.5 rounded-button transition-all duration-200 group w-full',
                      isSubItemActive(item)
                        ? 'bg-primary/5 text-primary'
                        : 'text-muted-foreground hover:bg-surface-2 hover:text-foreground'
                    )}
                  >
                    <Icon className={cn('h-5 w-5 shrink-0', item.iconColor)} />
                    <span className="text-sm truncate flex-1 text-left">{item.label}</span>
                    <ChevronDown className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')} />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pl-4 mt-1 space-y-1">
                  {item.subItems!.map((subItem) => {
                    const isSubActive = location.pathname === subItem.href;
                    const SubIcon = subItem.icon;

                    return (
                      <Link
                        key={subItem.href}
                        to={subItem.href}
                        className={cn(
                          'relative flex items-center gap-3 px-3 py-2 rounded-button transition-all duration-200',
                          isSubActive
                            ? 'bg-primary/10 text-primary font-semibold'
                            : 'text-muted-foreground hover:bg-surface-2 hover:text-foreground'
                        )}
                      >
                        {isSubActive && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary rounded-r-full" />
                        )}
                        {SubIcon && <SubIcon className={cn('h-4 w-4 shrink-0', subItem.iconColor)} />}
                        <span className="text-sm truncate">{subItem.label}</span>
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
              className={cn(
                'relative flex items-center gap-3 px-3 py-2.5 rounded-button transition-all duration-200 group',
                isActive
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'text-muted-foreground hover:bg-surface-2 hover:text-foreground'
              )}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-primary rounded-r-full" />
              )}
              <Icon className={cn('h-5 w-5 shrink-0', item.iconColor, collapsed && 'mx-auto')} />
              {!collapsed && (
                <span className="text-sm truncate">{item.label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      <div
        className={cn(
          'border-t border-border p-3',
          collapsed ? 'flex flex-col items-center gap-2' : ''
        )}
      >
        {!collapsed && user && (
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              {isAdmin ? (
                <Shield className="h-4 w-4 text-primary" />
              ) : (
                <UserCircle className="h-4 w-4 text-primary" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {user.name}
              </p>
              <p className="text-xs text-muted-foreground truncate capitalize">
                {user.role === 'ADMIN' ? 'Administrador' : user.role.replace('_', ' ').toLowerCase()}
              </p>
            </div>
          </div>
        )}

        <Button
          variant="ghost"
          size={collapsed ? 'icon' : 'sm'}
          onClick={logout}
          className={cn(
            'w-full text-muted-foreground hover:text-destructive hover:bg-destructive/10',
            collapsed ? 'justify-center' : 'justify-start gap-2 h-9'
          )}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span className="text-sm">Sair</span>}
        </Button>
      </div>
    </aside>
  );
}
