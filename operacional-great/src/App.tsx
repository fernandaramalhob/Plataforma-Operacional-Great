import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { CommercialProvider } from "@/contexts/CommercialContext";
import { OperationalProvider } from "@/contexts/OperationalContext";

import Index from "./pages/Index";
import Login from "./pages/Login";
import ModuleSelector from "./pages/ModuleSelector";
import AdminPanel from "./pages/admin/AdminPanel";
import NotFound from "./pages/NotFound";
import ComercialFinanceiro from "./pages/comercial/Financeiro";
import ComercialDashboards from "./pages/comercial/Dashboards";
import ComercialPipeline from "./pages/comercial/Pipeline";
import ComercialControleAgendamento from "./pages/comercial/ControleAgendamento";
import ComercialMetas from "./pages/comercial/Metas";
import ComercialRanking from "./pages/comercial/Ranking";
import ComercialRelatorios from "./pages/comercial/Relatorios";
import ComercialWhatsApp from "./pages/comercial/WhatsApp";
import ComercialAgendaGreat from "./pages/comercial/AgendaGreat";
import ComercialMetaAgendamentos from "./pages/comercial/MetaAgendamentos";
import ComercialRaioXSDR from "./pages/comercial/RaioXSDR";
import ComercialRaioXCloser from "./pages/comercial/RaioXCloser";
import OperacionalDashboard from "./pages/operacional/Dashboard";
import OperacionalMeuDia from "./pages/operacional/MeuDia";
import OperacionalExecucao from "./pages/operacional/Execucao";
import OperacionalCriativos from "./pages/operacional/Criativos";
import OperacionalExecucaoTrafego from "./pages/operacional/clientes/Trafego";
import OperacionalExecucaoAtendimento from "./pages/operacional/clientes/Atendimento";
import OperacionalExecucaoMarketing from "./pages/operacional/clientes/Marketing";
import OperacionalRituais from "./pages/operacional/Rituais";
import OperacionalInteligencia from "./pages/operacional/Inteligencia";
import ChampionsGreatLeague from "./pages/operacional/ChampionsGreatLeague";
import OperacionalCRM from "./pages/operacional/CRM";
import OperacionalClienteDetalhes from "./pages/operacional/ClienteDetalhes";
import StartMeetingForm from "./pages/operacional/StartMeetingForm";
import OperacionalRegistroAtividades from "./pages/operacional/RegistroAtividades";
import OperacionalReunioes from "./pages/operacional/Reunioes";
import OperacionalAcompanhamentoClientes from "./pages/operacional/AcompanhamentoClientes";
import MuralAvisos from "./pages/operacional/MuralAvisos";
import AreaEstudo from "./pages/operacional/AreaEstudo";
import ChallengesBoardPage from "./pages/operacional/ChallengesBoard";
import AgenteAnalista from "./pages/operacional/AgenteAnalista";
import CEODashboard from "./pages/ceo/CEODashboard";
import CEOMeuDia from "./pages/ceo/CEOMeuDia";
import CEOFinanceiro from "./pages/ceo/CEOFinanceiro";
import CEOSimulador from "./pages/ceo/CEOSimulador";
import CEOCustos from "./pages/ceo/CEOCustos";
import CEOComissoes from "./pages/ceo/CEOComissoes";
import CEOChampionsLeague from "./pages/ceo/CEOChampionsLeague";
// Tech module imports
import TechERP from "./pages/tech/TechERP";
import TechImplantacoes from "./pages/tech/Implantacoes";
import TechProjetos from "./pages/tech/Projetos";
import TechStrategicTasks from "./pages/tech/StrategicTasks";
import AreaCTO from "./pages/tech/AreaCTO";
import IASuporte from "./pages/tech/IASuporte";
import IAAnalista from "./pages/tech/IAAnalista";
import DesafiosTech from "./pages/tech/DesafiosTech";
import { AppLayout } from "./components/layout/AppLayout";
import { LogoLoader } from "./components/brand/Logo";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutes
      gcTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({ 
  children, 
  allowedModule,
  requireAdmin = false,
}: { 
  children: React.ReactNode; 
  allowedModule?: 'COMERCIAL' | 'OPERACIONAL' | 'TECH';
  requireAdmin?: boolean;
}) {
  const { isAuthenticated, isLoading, hasAccess, isAdmin, user } = useAuth();

  // Important: session can exist before the internal `user` is fully synced.
  // If we redirect based on missing `user`, we can create a navigation loop.
  if (isLoading || (isAuthenticated && !user)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LogoLoader />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  if (allowedModule && !hasAccess(allowedModule)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, isAdmin, user } = useAuth();

  if (isLoading || (isAuthenticated && !user)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LogoLoader />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/login" element={<Login />} />
      
      {/* Module Selector for users with multiple module access */}
      <Route 
        path="/select-module" 
        element={
          <ProtectedRoute>
            <ModuleSelector />
          </ProtectedRoute>
        } 
      />

      {/* Admin Panel */}
      <Route 
        path="/admin" 
        element={
          <AdminRoute>
            <AdminPanel />
          </AdminRoute>
        } 
      />
      
      {/* Comercial Routes */}
      <Route 
        path="/comercial" 
        element={
          <ProtectedRoute allowedModule="COMERCIAL">
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="financeiro" element={<ComercialFinanceiro />} />
        <Route path="dashboards" element={<ComercialDashboards />} />
        <Route path="dashboard" element={<Navigate to="/comercial/dashboards" replace />} />
        <Route path="pipeline" element={<ComercialPipeline />} />
        <Route path="controle-agendamento" element={<ComercialControleAgendamento />} />
        <Route path="metas" element={<ComercialMetas />} />
        <Route path="ranking" element={<ComercialRanking />} />
        <Route path="meta-agendamentos" element={<ComercialMetaAgendamentos />} />
        <Route path="relatorios" element={<ComercialRelatorios />} />
        <Route path="agenda-great" element={<ComercialAgendaGreat />} />
        <Route path="whatsapp" element={<ComercialWhatsApp />} />
        <Route path="raio-x-sdr" element={<ComercialRaioXSDR />} />
        <Route path="raio-x-closer" element={<ComercialRaioXCloser />} />
        <Route index element={<Navigate to="financeiro" replace />} />
      </Route>

      {/* Operacional Routes */}
      <Route 
        path="/operacional" 
        element={
          <ProtectedRoute allowedModule="OPERACIONAL">
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<OperacionalDashboard />} />
        <Route path="meu-dia" element={<OperacionalMeuDia />} />
        <Route path="crm" element={<OperacionalCRM />} />
              <Route path="crm/cliente/:clientId" element={<OperacionalClienteDetalhes />} />
              <Route path="crm/cliente/:clientId/formulario-start" element={<StartMeetingForm />} />
        <Route path="execucao" element={<OperacionalExecucao />} />
        <Route path="execucao/criativos" element={<OperacionalCriativos />} />
        <Route path="execucao/trafego" element={<OperacionalExecucaoTrafego />} />
        <Route path="execucao/atendimento" element={<OperacionalExecucaoAtendimento />} />
        <Route path="execucao/marketing" element={<OperacionalExecucaoMarketing />} />
        <Route path="execucao/atividades" element={<OperacionalRegistroAtividades />} />
        <Route path="execucao/acompanhamento-clientes" element={<OperacionalAcompanhamentoClientes />} />
        <Route path="champions-great-league" element={<ChampionsGreatLeague />} />
        <Route path="mural-avisos" element={<MuralAvisos />} />
        <Route path="area-estudo" element={<AreaEstudo />} />
        <Route index element={<Navigate to="meu-dia" replace />} />
      </Route>

      {/* CEO Routes - Admin Only */}
      <Route 
        path="/ceo" 
        element={
          <AdminRoute>
            <AppLayout />
          </AdminRoute>
        }
      >
        <Route path="dashboard" element={<CEODashboard />} />
        <Route path="meu-dia" element={<CEOMeuDia />} />
        <Route path="financeiro" element={<CEOFinanceiro />} />
        <Route path="custos" element={<CEOCustos />} />
        <Route path="simulador" element={<CEOSimulador />} />
        <Route path="comissoes" element={<CEOComissoes />} />
        <Route path="agente-analista" element={<AgenteAnalista />} />
        <Route path="champions-league" element={<CEOChampionsLeague />} />
        <Route index element={<Navigate to="dashboard" replace />} />
      </Route>

      {/* Tech Routes - Admin + EQUIPE_TECH */}
      <Route 
        path="/tech" 
        element={
          <ProtectedRoute allowedModule="TECH">
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="erp" element={<TechERP />} />
        <Route path="implantacoes" element={<TechImplantacoes />} />
        <Route path="projetos" element={<TechProjetos />} />
        <Route path="tarefas" element={<TechStrategicTasks />} />
        <Route path="cto" element={<AdminRoute><AreaCTO /></AdminRoute>} />
        <Route path="ia-suporte" element={<IASuporte />} />
        <Route path="ia-analista" element={<IAAnalista />} />
        <Route path="desafios" element={<DesafiosTech />} />
        <Route index element={<Navigate to="erp" replace />} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <ThemeProvider 
    attribute="class" 
    defaultTheme="light" 
    enableSystem
    storageKey="theme"
    disableTransitionOnChange
  >
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CommercialProvider>
          <OperationalProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <AppRoutes />
              </BrowserRouter>
            </TooltipProvider>
          </OperationalProvider>
        </CommercialProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
