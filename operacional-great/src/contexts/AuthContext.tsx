import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { User, UserRole, Module, ActivityLog, Team } from '@/types';
import { TEAM_USERS, canEditPlatform } from '@/lib/userMapping';
import { safeGetItem, safeSetItem, safeRemoveItem } from '@/lib/safeStorage';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAdmin: boolean;
  canEdit: boolean;
  hasDualAccess: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  selectedModule: Module | null;
  selectModule: (module: Module) => void;
  getModule: () => Module | null;
  hasAccess: (requiredModule: Module) => boolean;
  users: User[];
  addUser: (user: Omit<User, 'id' | 'createdAt'> & { password: string }) => void;
  updateUser: (id: string, updates: Partial<User>) => void;
  deleteUser: (id: string) => void;
  teams: Team[];
  addTeam: (name: string) => void;
  updateTeam: (id: string, name: string) => void;
  deleteTeam: (id: string) => void;
  activityLogs: ActivityLog[];
  logActivity: (action: string, entity: string, entityId?: string, details?: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const INITIAL_USERS: (User & { password: string })[] = [
  {
    id: 'admin-1',
    name: TEAM_USERS.BRUNO.name,
    email: TEAM_USERS.BRUNO.email,
    password: 'Brunogomes2005!',
    role: 'ADMIN',
    active: true,
    createdAt: new Date(),
  },
  {
    id: 'admin-pedro',
    name: 'Pedro Juan',
    email: 'pedroojuann1@gmail.com',
    password: 'Pedro2024!',
    role: 'ADMIN',
    active: true,
    createdAt: new Date(),
  },
  {
    id: 'brayton-1',
    name: 'Brayton Maycon',
    email: 'braytonmaycon5@gmail.com',
    password: 'Brayton1243',
    role: 'GESTOR',
    active: true,
    createdAt: new Date(),
  },
  {
    id: 'cled-1',
    name: TEAM_USERS.CLED.name,
    email: TEAM_USERS.CLED.email,
    password: 'Cled2001',
    role: 'COORDENADOR_COMERCIAL',
    active: true,
    createdAt: new Date(),
  },
  {
    id: 'hebert-1',
    name: TEAM_USERS.HERBERT.name,
    email: TEAM_USERS.HERBERT.email,
    password: 'josehebert123',
    role: 'CLOSER',
    active: true,
    createdAt: new Date(),
  },
  {
    id: 'miguel-1',
    name: TEAM_USERS.MIGUEL.name,
    email: TEAM_USERS.MIGUEL.email,
    password: 'Miguel24',
    role: 'SDR',
    active: true,
    createdAt: new Date(),
  },
  {
    id: 'felipe-1',
    name: TEAM_USERS.FELIPE.name,
    email: TEAM_USERS.FELIPE.email,
    password: '343802',
    role: 'SDR',
    active: true,
    createdAt: new Date(),
  },
  {
    id: '1',
    name: 'Carlos Silva',
    email: 'comercial@great.com',
    password: 'demo123',
    role: 'SETOR_COMERCIAL',
    active: true,
    createdAt: new Date(),
  },
  {
    id: '2',
    name: 'Ana Santos',
    email: 'gestor@great.com',
    password: 'demo123',
    role: 'GESTOR',
    teamId: 'team-1',
    active: true,
    createdAt: new Date(),
  },
  {
    id: '3',
    name: 'Pedro Costa',
    email: 'atendente@great.com',
    password: 'demo123',
    role: 'ATENDENTE',
    teamId: 'team-1',
    active: true,
    createdAt: new Date(),
  },
  {
    id: '4',
    name: 'Marcos Oliveira',
    email: 'coordenador@great.com',
    password: 'demo123',
    role: 'COORDENADOR_RED',
    active: true,
    createdAt: new Date(),
  },
  {
    id: '5',
    name: 'Julia Mendes',
    email: 'design@great.com',
    password: 'demo123',
    role: 'DESIGN',
    teamId: 'team-2',
    active: true,
    createdAt: new Date(),
  },
  {
    id: '6',
    name: 'Ricardo Alves',
    email: 'editor@great.com',
    password: 'demo123',
    role: 'EDITOR_VIDEO',
    teamId: 'team-2',
    active: true,
    createdAt: new Date(),
  },
  // ── Usuários de teste (Cypress) ───────────────────────────
  {
    id: 'test-user-1',
    name: 'Usuário Teste',
    email: 'user@teste.com',
    password: '123456',
    role: 'ATENDENTE',
    teamId: 'team-1',
    active: true,
    createdAt: new Date(),
  },
  {
    id: 'test-admin-1',
    name: 'Admin Teste',
    email: 'admin@teste.com',
    password: '123456',
    role: 'ADMIN',
    active: true,
    createdAt: new Date(),
  },
];

const ROLE_MODULE_MAP: Record<UserRole, Module | null> = {
  'ADMIN': null,
  'SETOR_COMERCIAL': 'COMERCIAL',
  'ATENDENTE': 'OPERACIONAL',
  'GESTOR': 'OPERACIONAL',
  'COORDENADOR_RED': 'OPERACIONAL',
  'DESIGN': 'OPERACIONAL',
  'EDITOR_VIDEO': 'OPERACIONAL',
  'SDR': 'COMERCIAL',
  'CLOSER': 'COMERCIAL',
  'COORDENADOR_COMERCIAL': 'COMERCIAL',
  'EQUIPE_DESIGN': 'OPERACIONAL',
  'EQUIPE_TECH': null,
};

const INITIAL_TEAMS: Team[] = [
  { id: 'team-1', name: 'Equipe 7', createdAt: new Date() },
  { id: 'team-2', name: 'Tropa de Elite', createdAt: new Date() },
];

function mergeSeedUsers(storedUsers: (User & { password: string })[]) {
  const usersByEmail = new Map<string, User & { password: string }>();

  storedUsers.forEach((user) => {
    const key = user.email.trim().toLowerCase();
    if (key) {
      usersByEmail.set(key, user);
    }
  });

  INITIAL_USERS.forEach((seedUser) => {
    const key = seedUser.email.trim().toLowerCase();
    usersByEmail.set(key, seedUser);
  });

  return Array.from(usersByEmail.values());
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = safeGetItem('great_user');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return null;
      }
    }
    return null;
  });

  const [users, setUsers] = useState<(User & { password: string })[]>(() => {
    const stored = safeGetItem('great_users');
    if (stored) {
      try {
        return mergeSeedUsers(JSON.parse(stored));
      } catch {
        return INITIAL_USERS;
      }
    }
    return INITIAL_USERS;
  });

  const [teams, setTeams] = useState<Team[]>(() => {
    const stored = safeGetItem('great_teams');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return INITIAL_TEAMS;
      }
    }
    return INITIAL_TEAMS;
  });

  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>(() => {
    const stored = safeGetItem('great_activity_logs');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return [];
      }
    }
    return [];
  });

  const [isLoading, setIsLoading] = useState(false);

  const [selectedModule, setSelectedModule] = useState<Module | null>(() => {
    const stored = safeGetItem('great_selected_module');
    return stored as Module | null;
  });

  useEffect(() => {
    safeSetItem('great_users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    safeSetItem('great_teams', JSON.stringify(teams));
  }, [teams]);

  useEffect(() => {
    safeSetItem('great_activity_logs', JSON.stringify(activityLogs));
  }, [activityLogs]);

  const logActivity = useCallback((action: string, entity: string, entityId?: string, details?: string) => {
    if (!user) return;
    const log: ActivityLog = {
      id: crypto.randomUUID(),
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action,
      entity,
      entityId,
      details,
      createdAt: new Date(),
    };
    setActivityLogs(prev => [log, ...prev].slice(0, 500));
  }, [user]);

  const login = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);

    const found = users.find(
      u => u.email.toLowerCase() === email.toLowerCase() && u.password === password && u.active
    );

    if (!found) {
      setIsLoading(false);
      return { success: false, error: 'Email ou senha incorretos.' };
    }

    const { password: _, ...userWithoutPassword } = found;
    const loggedUser: User = { ...userWithoutPassword };

    setUser(loggedUser);
    safeSetItem('great_user', JSON.stringify(loggedUser));

    const log: ActivityLog = {
      id: crypto.randomUUID(),
      userId: loggedUser.id,
      userName: loggedUser.name,
      userRole: loggedUser.role,
      action: 'LOGIN',
      entity: 'Session',
      details: `Login realizado às ${new Date().toLocaleTimeString('pt-BR')}`,
      createdAt: new Date(),
    };
    setActivityLogs(prev => [log, ...prev].slice(0, 500));

    setIsLoading(false);
    return { success: true };
  }, [users]);

  const signUp = useCallback(async (email: string, password: string, name: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);

    const exists = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (exists) {
      setIsLoading(false);
      return { success: false, error: 'Este email já está cadastrado.' };
    }

    const newUser: User & { password: string } = {
      id: crypto.randomUUID(),
      email,
      name,
      password,
      role: 'GESTOR' as UserRole,
      active: true,
      createdAt: new Date(),
    };

    setUsers(prev => [...prev, newUser]);

    const { password: _, ...userWithoutPassword } = newUser;
    setUser(userWithoutPassword);
    safeSetItem('great_user', JSON.stringify(userWithoutPassword));

    setIsLoading(false);
    return { success: true };
  }, [users]);

  const logout = useCallback(async () => {
    if (user) {
      const log: ActivityLog = {
        id: crypto.randomUUID(),
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        action: 'LOGOUT',
        entity: 'Session',
        details: `Logout realizado às ${new Date().toLocaleTimeString('pt-BR')}`,
        createdAt: new Date(),
      };
      setActivityLogs(prev => [log, ...prev].slice(0, 500));
    }

    setUser(null);
    setSelectedModule(null);
    safeRemoveItem('great_user');
    safeRemoveItem('great_selected_module');
    window.location.replace('/login');
  }, [user]);

  const selectModule = useCallback((module: Module) => {
    setSelectedModule(module);
    safeSetItem('great_selected_module', module);

    if (user) {
      const log: ActivityLog = {
        id: crypto.randomUUID(),
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        action: 'MODULE_SWITCH',
        entity: 'Module',
        details: `Acessou módulo ${module}`,
        createdAt: new Date(),
      };
      setActivityLogs(prev => [log, ...prev].slice(0, 500));
    }
  }, [user]);

  const getModule = useCallback((): Module | null => {
    if (!user) return null;
    if (user.role === 'ADMIN') return selectedModule;
    if (user.role === 'EQUIPE_TECH') return selectedModule;
    return ROLE_MODULE_MAP[user.role];
  }, [user, selectedModule]);

  const hasAccess = useCallback((module: Module): boolean => {
    if (!user) return false;
    if (user.role === 'ADMIN') return true;
    if (user.role === 'EQUIPE_TECH' && (module === 'TECH' || module === 'OPERACIONAL')) return true;
    return ROLE_MODULE_MAP[user.role] === module;
  }, [user]);

  const addUser = useCallback((userData: Omit<User, 'id' | 'createdAt'> & { password: string }) => {
    const newUser = {
      ...userData,
      id: crypto.randomUUID(),
      createdAt: new Date(),
    };
    setUsers(prev => [...prev, newUser]);
    logActivity('USER_CREATED', 'User', newUser.id, `Usuário ${newUser.name} (${newUser.email}) criado`);
  }, [logActivity]);

  const updateUser = useCallback((id: string, data: Partial<User>) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...data } : u));
    logActivity('USER_UPDATED', 'User', id, 'Usuário atualizado');
  }, [logActivity]);

  const deleteUser = useCallback((id: string) => {
    const userToDelete = users.find(u => u.id === id);
    setUsers(prev => prev.filter(u => u.id !== id));
    logActivity('USER_DELETED', 'User', id, `Usuário ${userToDelete?.name} removido`);
  }, [users, logActivity]);

  const addTeam = useCallback((name: string) => {
    const newTeam: Team = {
      id: crypto.randomUUID(),
      name,
      createdAt: new Date(),
    };
    setTeams(prev => [...prev, newTeam]);
    logActivity('TEAM_CREATED', 'Team', newTeam.id, `Equipe "${name}" criada`);
  }, [logActivity]);

  const updateTeam = useCallback((id: string, name: string) => {
    setTeams(prev => prev.map(t => t.id === id ? { ...t, name } : t));
    logActivity('TEAM_UPDATED', 'Team', id, `Equipe atualizada para "${name}"`);
  }, [logActivity]);

  const deleteTeam = useCallback((id: string) => {
    const teamToDelete = teams.find(t => t.id === id);
    setTeams(prev => prev.filter(t => t.id !== id));
    setUsers(prev => prev.map(u => u.teamId === id ? { ...u, teamId: undefined } : u));
    logActivity('TEAM_DELETED', 'Team', id, `Equipe "${teamToDelete?.name}" removida`);
  }, [teams, logActivity]);

  const isAuthenticated = !!user;
  const isAdmin = user?.role === 'ADMIN';
  const canEdit = canEditPlatform(user?.email || '', user?.role || '');
  const hasDualAccess = false;

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        isAdmin,
        canEdit,
        hasDualAccess,
        login,
        signUp,
        logout,
        selectedModule,
        selectModule,
        getModule,
        hasAccess,
        users: users.map(({ password, ...u }) => u),
        addUser,
        updateUser,
        deleteUser,
        teams,
        addTeam,
        updateTeam,
        deleteTeam,
        activityLogs,
        logActivity,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function useAuthSafe() {
  const context = useContext(AuthContext);
  return context ?? null;
}
