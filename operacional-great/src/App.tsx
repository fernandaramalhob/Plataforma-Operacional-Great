import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { CommercialProvider } from "@/contexts/CommercialContext";
import { OperationalProvider } from "@/contexts/OperationalContext";

import Index from "./pages/Index";
import Login from "./pages/Login";
import Logout from "./pages/Logout";
import NotFound from "./pages/NotFound";
import OperacionalDashboard from "./pages/operacional/Dashboard";
import OperacionalMeuDia from "./pages/operacional/MeuDia";
import OperacionalExecucao from "./pages/operacional/Execucao";
import OperacionalCriativos from "./pages/operacional/Criativos";
import OperacionalExecucaoTrafego from "./pages/operacional/clientes/Trafego";
import OperacionalExecucaoAtendimento from "./pages/operacional/clientes/Atendimento";
import OperacionalExecucaoMarketing from "./pages/operacional/clientes/Marketing";
import OperacionalRituais from "./pages/operacional/Rituais";
import OperacionalInteligencia from "./pages/operacional/Inteligencia";
import OperacionalCRM from "./pages/operacional/CRM";
import OperacionalClienteDetalhes from "./pages/operacional/ClienteDetalhes";
import StartMeetingForm from "./pages/operacional/StartMeetingForm";
import OperacionalRegistroAtividades from "./pages/operacional/RegistroAtividades";
import OperacionalReunioes from "./pages/operacional/Reunioes";
import OperacionalAcompanhamentoClientes from "./pages/operacional/AcompanhamentoClientes";
import MuralAvisos from "./pages/operacional/MuralAvisos";
import AreaEstudo from "./pages/operacional/AreaEstudo";
import EstudoIA from "./pages/operacional/EstudoIA";
import GreatStudyAI from "./pages/operacional/GreatStudyAI";
import ChallengesBoardPage from "./pages/operacional/ChallengesBoard";
import ChampionsGreatLeague from "./pages/operacional/ChampionsGreatLeague";
import AgenteAnalista from "./pages/operacional/AgenteAnalista";
import { AppLayout } from "./components/layout/AppLayout";
import { LogoLoader } from "./components/brand/Logo";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      gcTime: 1000 * 60 * 5,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({
  children,
  allowedModule,
}: {
  children: React.ReactNode;
  allowedModule?: "OPERACIONAL";
}) {
  const { isAuthenticated, isLoading, hasAccess, user } = useAuth();

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

  if (allowedModule && !hasAccess(allowedModule)) {
    return <Navigate to="/operacional/dashboard" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/login" element={<Login />} />
      <Route path="/logout" element={<Logout />} />

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
        <Route
          path="crm/cliente/:clientId/formulario-start"
          element={<StartMeetingForm />}
        />
        <Route path="execucao" element={<OperacionalExecucao />} />
        <Route path="execucao/criativos" element={<OperacionalCriativos />} />
        <Route path="execucao/trafego" element={<OperacionalExecucaoTrafego />} />
        <Route
          path="execucao/atendimento"
          element={<OperacionalExecucaoAtendimento />}
        />
        <Route path="execucao/marketing" element={<OperacionalExecucaoMarketing />} />
        <Route path="execucao/atividades" element={<OperacionalRegistroAtividades />} />
        <Route path="execucao/acompanhamento-clientes" element={<OperacionalAcompanhamentoClientes />} />
        <Route path="reunioes" element={<OperacionalReunioes />} />
        <Route path="mural-avisos" element={<MuralAvisos />} />
        <Route path="area-estudo" element={<Navigate to="area-estudo/conteudos" replace />} />
        <Route path="area-estudo/conteudos" element={<AreaEstudo />} />
        <Route path="area-estudo/ia" element={<GreatStudyAI />} />
        <Route path="great-study-ai" element={<EstudoIA />} />
        <Route path="rituais" element={<OperacionalRituais />} />
        <Route path="inteligencia" element={<OperacionalInteligencia />} />
        <Route path="desafios" element={<ChallengesBoardPage />} />
        <Route path="champions-great-league" element={<ChampionsGreatLeague />} />
        <Route path="ranking" element={<ChampionsGreatLeague />} />
        <Route path="agente-analista" element={<AgenteAnalista />} />
        <Route index element={<Navigate to="dashboard" replace />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <ThemeProvider
    attribute="class"
    defaultTheme="light"
    enableSystem={false}
    themes={["light", "dark"]}
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
