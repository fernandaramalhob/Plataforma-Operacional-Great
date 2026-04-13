import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Logo } from '@/components/brand/Logo';
import { Card, CardContent } from '@/components/ui/card';
import { Users, ArrowRight, ClipboardList } from 'lucide-react';

export default function ModuleSelector() {
  const { user, selectModule } = useAuth();
  const navigate = useNavigate();

  const handleSelectModule = () => {
    selectModule('OPERACIONAL');
    navigate('/operacional/dashboard');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-12">
          <Logo variant="full" size="lg" className="justify-center mb-6" />
          <h1 className="text-3xl font-bold mb-2">
            Bem-vindo, {user?.name?.split(' ')[0]}!
          </h1>
          <p className="text-muted-foreground">
            Acesse o setor operacional
          </p>
        </div>

        <Card
          className="cursor-pointer transition-all duration-300 hover:scale-[1.02] border-border hover:border-success/50 bg-gradient-to-br from-card to-success/5"
          onClick={handleSelectModule}
        >
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="h-12 w-12 rounded-2xl bg-success/20 flex items-center justify-center">
                <Users className="h-6 w-6 text-success" />
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-bold mb-2">Operacional</h2>
            <p className="text-muted-foreground text-sm mb-4">
              Gestão de clientes, execução e rotina operacional.
            </p>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Users className="h-3.5 w-3.5 text-success" />
                <span>CRM operacional</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <ClipboardList className="h-3.5 w-3.5 text-success" />
                <span>Execução e tarefas</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
