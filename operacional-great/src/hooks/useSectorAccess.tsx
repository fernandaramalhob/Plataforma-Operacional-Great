import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types';
import { ShieldX } from 'lucide-react';

export type Sector = 'trafego' | 'atendimento' | 'marketing';

// Roles that have universal access to all sectors
const UNIVERSAL_ACCESS_ROLES: UserRole[] = ['ADMIN', 'COORDENADOR_RED', 'GESTOR'];

// Sector-specific access mapping
const SECTOR_ACCESS: Record<Sector, UserRole[]> = {
  trafego: ['ADMIN', 'COORDENADOR_RED', 'GESTOR'],
  atendimento: ['ADMIN', 'COORDENADOR_RED', 'GESTOR', 'ATENDENTE'],
  marketing: ['ADMIN', 'COORDENADOR_RED', 'GESTOR', 'DESIGN', 'EDITOR_VIDEO', 'EQUIPE_DESIGN'],
};

// Roles that can access the "Controle - Artes" page
const CONTROLE_ARTES_ACCESS_ROLES: UserRole[] = ['ADMIN', 'COORDENADOR_RED', 'EQUIPE_DESIGN', 'DESIGN'];

export function useSectorAccess() {
  const { user, isAdmin } = useAuth();

  const hasAccessToSector = (sector: Sector): boolean => {
    if (!user) return false;
    if (isAdmin) return true;
    
    const role = user.role as UserRole;
    
    // Universal access roles
    if (UNIVERSAL_ACCESS_ROLES.includes(role)) return true;
    
    // Sector-specific access
    return SECTOR_ACCESS[sector]?.includes(role) ?? false;
  };

  const getAccessibleSectors = (): Sector[] => {
    if (!user) return [];
    if (isAdmin) return ['trafego', 'atendimento', 'marketing'];
    
    const role = user.role as UserRole;
    
    // Universal access roles
    if (UNIVERSAL_ACCESS_ROLES.includes(role)) {
      return ['trafego', 'atendimento', 'marketing'];
    }
    
    // Filter sectors based on role
    const sectors: Sector[] = [];
    if (SECTOR_ACCESS.trafego.includes(role)) sectors.push('trafego');
    if (SECTOR_ACCESS.atendimento.includes(role)) sectors.push('atendimento');
    if (SECTOR_ACCESS.marketing.includes(role)) sectors.push('marketing');
    
    return sectors;
  };

  const getDefaultSector = (): Sector | null => {
    const accessible = getAccessibleSectors();
    return accessible.length > 0 ? accessible[0] : null;
  };

  const getSectorLabel = (sector: Sector): string => {
    const labels: Record<Sector, string> = {
      trafego: 'Tráfego',
      atendimento: 'Atendimento',
      marketing: 'Marketing Digital',
    };
    return labels[sector];
  };

  const canAccessControleArtes = (): boolean => {
    if (!user) return false;
    if (isAdmin) return true;
    
    const role = user.role as UserRole;
    return CONTROLE_ARTES_ACCESS_ROLES.includes(role);
  };

  return {
    hasAccessToSector,
    getAccessibleSectors,
    getDefaultSector,
    getSectorLabel,
    canAccessControleArtes,
    userRole: user?.role,
    isUniversalAccess: user ? UNIVERSAL_ACCESS_ROLES.includes(user.role as UserRole) || isAdmin : false,
  };
}

// Component for access denied state
export function AccessDeniedMessage({ sector }: { sector: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
        <ShieldX className="h-8 w-8 text-destructive" />
      </div>
      <h2 className="text-h2 text-foreground mb-2">Acesso Restrito</h2>
      <p className="text-body text-muted-foreground max-w-md">
        Você não tem permissão para acessar a área de <strong>{sector}</strong>. 
        Entre em contato com o coordenador se precisar de acesso.
      </p>
    </div>
  );
}
