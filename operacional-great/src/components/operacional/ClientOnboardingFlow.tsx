import { useState } from 'react';
import { ArrowLeft, Crown, Users2, Edit2, Check, X } from 'lucide-react';
import { ChevronRight, FileText, Users, Palette, Megaphone, Headphones, Loader2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

export type OnboardingStage = 
  | 'CONTRATO' 
  | 'BRIEFING' 
  | 'ONBOARDING' 
  | 'MARKETING' 
  | 'TRAFEGO' 
  | 'ATENDIMENTO' 
  | 'CONCLUIDO';

interface StageConfig {
  key: OnboardingStage;
  label: string;
  description: string;
  icon: React.ReactNode;
  action: string;
}

const STAGES: StageConfig[] = [
  { 
    key: 'CONTRATO', 
    label: 'Contrato', 
    description: 'Cliente fechou o contrato',
    icon: <FileText className="h-4 w-4" />,
    action: 'Iniciar Briefing'
  },
  { 
    key: 'BRIEFING', 
    label: 'Briefing', 
    description: 'Responder briefing do cliente',
    icon: <FileText className="h-4 w-4" />,
    action: 'Agendar Onboarding'
  },
  { 
    key: 'ONBOARDING', 
    label: 'Onboarding', 
    description: 'Reunião de chegada',
    icon: <Users className="h-4 w-4" />,
    action: 'Produzir Artes'
  },
  { 
    key: 'MARKETING', 
    label: 'Marketing', 
    description: 'Produzir artes (marketing digital)',
    icon: <Palette className="h-4 w-4" />,
    action: 'Criar Campanhas'
  },
  { 
    key: 'TRAFEGO', 
    label: 'Tráfego', 
    description: 'Produzir campanhas (tráfego pago)',
    icon: <Megaphone className="h-4 w-4" />,
    action: 'Iniciar Atendimento'
  },
  { 
    key: 'ATENDIMENTO', 
    label: 'Atendimento', 
    description: 'Seguir para o atendimento',
    icon: <Headphones className="h-4 w-4" />,
    action: 'Concluir Ativação'
  },
];

interface ClientOnboardingFlowProps {
  client: {
    id: string;
    clientName: string;
    clinicName?: string;
    onboardingStage: OnboardingStage;
    clientTier?: 'PREMIUM' | 'POPULAR' | null;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ClientOnboardingFlow({ client, open, onOpenChange }: ClientOnboardingFlowProps) {
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [notes, setNotes] = useState('');
  const [showTierSelection, setShowTierSelection] = useState(false);
  const [selectedTier, setSelectedTier] = useState<'PREMIUM' | 'POPULAR' | null>(client.clientTier || null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [clientNameInput, setClientNameInput] = useState(client.clientName);
  const [isUpdatingName, setIsUpdatingName] = useState(false);
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const handleUpdateClientName = async () => {
    if (!clientNameInput.trim() || clientNameInput.trim() === client.clientName) {
      setIsEditingName(false);
      return;
    }
    setIsUpdatingName(true);
    try {
      const { error } = await supabase
        .from('operational_clients')
        .update({ client_name: clientNameInput.trim() })
        .eq('id', client.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['operational-clients'] });
      toast.success('Nome do cliente atualizado');
      setIsEditingName(false);
    } catch (error) {
      console.error('Error updating client name:', error);
      toast.error('Erro ao atualizar nome');
    } finally {
      setIsUpdatingName(false);
    }
  };

  const currentStageIndex = STAGES.findIndex(s => s.key === client.onboardingStage);
  const currentStage = STAGES[currentStageIndex];
  const isComplete = client.onboardingStage === 'CONCLUIDO';

  const handleAdvanceStage = async () => {
    if (currentStageIndex >= STAGES.length - 1) {
      // Complete the onboarding
      setIsAdvancing(true);
      try {
        const { error } = await supabase
          .from('operational_clients')
          .update({ 
            onboarding_stage: 'CONCLUIDO',
            status_operacional: 'ATIVO',
            activated_at: new Date().toISOString(),
          })
          .eq('id', client.id);

        if (error) throw error;

        queryClient.invalidateQueries({ queryKey: ['operational-clients'] });
        toast.success('🎉 Cliente ativado com sucesso!', {
          description: `${client.clientName} está pronto para operar!`,
        });
        onOpenChange(false);
      } catch (error) {
        console.error('Error completing onboarding:', error);
        toast.error('Erro ao concluir ativação');
      } finally {
        setIsAdvancing(false);
      }
      return;
    }

    const nextStage = STAGES[currentStageIndex + 1];
    
    // Check if advancing to MARKETING and tier not set - show tier selection first
    if (nextStage.key === 'MARKETING' && !client.clientTier && !selectedTier) {
      setShowTierSelection(true);
      return;
    }
    
    setIsAdvancing(true);

    try {
      const updateData: Record<string, any> = {
        onboarding_stage: nextStage.key,
      };

      // Set specific timestamps based on stage
      if (nextStage.key === 'BRIEFING') {
        updateData.status_operacional = 'ONBOARDING';
      }
      if (nextStage.key === 'ONBOARDING') {
        updateData.briefing_completed_at = new Date().toISOString();
        updateData.onboarding_start_at = new Date().toISOString();
        
        // Create onboarding meeting automatically assigned to Isaque
        if (user) {
          // Find Isaque's user ID
          const { data: isaqueProfile } = await supabase
            .from('profiles')
            .select('id')
            .ilike('full_name', '%isaque%')
            .maybeSingle();
          
          // Create meeting for tomorrow at 10:00
          const meetingStart = new Date();
          meetingStart.setDate(meetingStart.getDate() + 1);
          meetingStart.setHours(10, 0, 0, 0);
          
          const meetingEnd = new Date(meetingStart);
          meetingEnd.setHours(11, 0, 0, 0);
          
          const { error: meetingError } = await supabase
            .from('meetings')
            .insert({
              title: `Reunião de Onboarding: ${client.clientName}`,
              datetime_start: meetingStart.toISOString(),
              datetime_end: meetingEnd.toISOString(),
              created_by_user_id: user.id,
              scope: 'ONBOARDING',
              agenda: `Reunião de chegada com o cliente ${client.clientName}.\n\nResponsável: Isaque`,
              participants: isaqueProfile ? [{ user_id: isaqueProfile.id, name: 'Isaque' }] : null,
            });
          
          if (meetingError) {
            console.error('Error creating meeting:', meetingError);
          } else {
            toast.success('Reunião de Onboarding criada!', {
              description: 'Atribuída ao Isaque',
            });
          }
        }
      }
      if (nextStage.key === 'MARKETING') {
        updateData.onboarding_done_at = new Date().toISOString();
        updateData.stage_marketing = 'EM_ANDAMENTO';
        // Set client tier if selected
        if (selectedTier) {
          updateData.client_tier = selectedTier;
        }
      }
      if (nextStage.key === 'TRAFEGO') {
        updateData.stage_marketing = 'OK';
        updateData.stage_trafego = 'EM_ANDAMENTO';
      }
      if (nextStage.key === 'ATENDIMENTO') {
        updateData.stage_trafego = 'OK';
        updateData.stage_atendimento = 'EM_ANDAMENTO';
      }

      const { error } = await supabase
        .from('operational_clients')
        .update(updateData)
        .eq('id', client.id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['operational-clients'] });
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      queryClient.invalidateQueries({ queryKey: ['upcoming-meetings'] });
      toast.success(`Etapa concluída!`, {
        description: `Avançando para: ${nextStage.label}`,
      });
      setNotes('');
    } catch (error) {
      console.error('Error advancing stage:', error);
      toast.error('Erro ao avançar etapa');
    } finally {
      setIsAdvancing(false);
    }
  };

  const handleGoBackStage = async () => {
    if (currentStageIndex <= 0) return;

    const previousStage = STAGES[currentStageIndex - 1];
    setIsAdvancing(true);

    try {
      const updateData: Record<string, any> = {
        onboarding_stage: previousStage.key,
      };

      // Reset stage-specific data when going back
      if (client.onboardingStage === 'BRIEFING') {
        updateData.status_operacional = 'NOVO_CLIENTE';
      }
      if (client.onboardingStage === 'ONBOARDING') {
        updateData.briefing_completed_at = null;
        updateData.onboarding_start_at = null;
        updateData.client_tier = null; // Reset tier when going back from Onboarding (before Marketing)
      }
      if (client.onboardingStage === 'MARKETING') {
        updateData.onboarding_done_at = null;
        updateData.stage_marketing = 'NAO_INICIADO';
        updateData.client_tier = null; // Reset tier when going back from Marketing
      }
      if (client.onboardingStage === 'TRAFEGO') {
        updateData.stage_marketing = 'EM_ANDAMENTO';
        updateData.stage_trafego = 'NAO_INICIADO';
      }
      if (client.onboardingStage === 'ATENDIMENTO') {
        updateData.stage_trafego = 'EM_ANDAMENTO';
        updateData.stage_atendimento = 'NAO_INICIADO';
      }

      const { error } = await supabase
        .from('operational_clients')
        .update(updateData)
        .eq('id', client.id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['operational-clients'] });
      toast.success(`Etapa revertida!`, {
        description: `Voltando para: ${previousStage.label}`,
      });
      setNotes('');
    } catch (error) {
      console.error('Error going back stage:', error);
      toast.error('Erro ao voltar etapa');
    } finally {
      setIsAdvancing(false);
    }
  };

  // Handle tier selection confirm
  const handleConfirmTier = () => {
    if (!selectedTier) {
      toast.error('Selecione o tipo do cliente');
      return;
    }
    setShowTierSelection(false);
    // Now proceed with advancing the stage
    handleAdvanceStage();
  };

  return (
    <>
      {/* Tier Selection Dialog */}
      <Dialog open={showTierSelection} onOpenChange={setShowTierSelection}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-xl">Definir Tipo do Cliente</DialogTitle>
            <DialogDescription>
              Selecione se {client.clientName} é um cliente Premium ou Popular. 
              Esta definição ficará fixa no registro do cliente.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <RadioGroup
              value={selectedTier || ''}
              onValueChange={(value) => setSelectedTier(value as 'PREMIUM' | 'POPULAR')}
              className="space-y-3"
            >
              <label
                htmlFor="tier-premium"
                className={cn(
                  "flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all",
                  selectedTier === 'PREMIUM' 
                    ? "border-amber-500 bg-amber-50 dark:bg-amber-900/20" 
                    : "border-border hover:border-amber-300"
                )}
              >
                <RadioGroupItem value="PREMIUM" id="tier-premium" className="sr-only" />
                <div className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full",
                  selectedTier === 'PREMIUM' 
                    ? "bg-amber-500 text-white" 
                    : "bg-amber-100 text-amber-600 dark:bg-amber-900/30"
                )}>
                  <Crown className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">Premium</p>
                  <p className="text-sm text-muted-foreground">
                    Cliente de alto valor, atendimento prioritário
                  </p>
                </div>
                {selectedTier === 'PREMIUM' && (
                  <Check className="h-5 w-5 text-amber-500" />
                )}
              </label>

              <label
                htmlFor="tier-popular"
                className={cn(
                  "flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all",
                  selectedTier === 'POPULAR' 
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" 
                    : "border-border hover:border-blue-300"
                )}
              >
                <RadioGroupItem value="POPULAR" id="tier-popular" className="sr-only" />
                <div className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full",
                  selectedTier === 'POPULAR' 
                    ? "bg-blue-500 text-white" 
                    : "bg-blue-100 text-blue-600 dark:bg-blue-900/30"
                )}>
                  <Users2 className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">Popular</p>
                  <p className="text-sm text-muted-foreground">
                    Cliente padrão, atendimento regular
                  </p>
                </div>
                {selectedTier === 'POPULAR' && (
                  <Check className="h-5 w-5 text-blue-500" />
                )}
              </label>
            </RadioGroup>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTierSelection(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmTier} disabled={!selectedTier}>
              Confirmar e Avançar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Main Onboarding Dialog */}
      <Dialog open={open && !showTierSelection} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              Fluxo de Ativação
              {client.clientTier && (
                <ClientTierBadge tier={client.clientTier} size="sm" />
              )}
            </DialogTitle>
            <DialogDescription className="flex items-center gap-2">
              {isEditingName ? (
                <div className="flex items-center gap-1 flex-1">
                  <Input
                    value={clientNameInput}
                    onChange={(e) => setClientNameInput(e.target.value)}
                    className="h-7 text-sm"
                    autoFocus
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleUpdateClientName}
                    disabled={isUpdatingName}
                    className="h-6 w-6 p-0 text-success hover:text-success"
                  >
                    {isUpdatingName ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setClientNameInput(client.clientName);
                      setIsEditingName(false);
                    }}
                    className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <>
                  <span>{client.clientName}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditingName(true)}
                    className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                  {client.clinicName && <span>• {client.clinicName}</span>}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {/* Progress Steps */}
            <div className="relative">
              {/* Progress Line */}
              <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />
              <div 
                className="absolute left-6 top-0 w-0.5 bg-primary transition-all duration-500"
                style={{ 
                  height: isComplete 
                    ? '100%' 
                    : `${(currentStageIndex / (STAGES.length - 1)) * 100}%` 
                }}
              />

              {/* Steps */}
              <div className="space-y-4 relative">
                {STAGES.map((stage, index) => {
                  const isPast = index < currentStageIndex;
                  const isCurrent = index === currentStageIndex && !isComplete;
                  const isFuture = index > currentStageIndex && !isComplete;

                  return (
                    <div 
                      key={stage.key}
                      className={cn(
                        "flex items-start gap-4 pl-2",
                        isFuture && "opacity-50"
                      )}
                    >
                      {/* Icon */}
                      <div 
                        className={cn(
                          "relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all",
                          isPast && "bg-primary border-primary text-primary-foreground",
                          isCurrent && "bg-background border-primary text-primary ring-4 ring-primary/20",
                          isFuture && "bg-background border-border text-muted-foreground",
                          isComplete && "bg-primary border-primary text-primary-foreground"
                        )}
                      >
                        {isPast || isComplete ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          stage.icon
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 pb-4">
                        <div className="flex items-center gap-2">
                          <h4 className={cn(
                            "font-medium",
                            isCurrent && "text-primary",
                            isFuture && "text-muted-foreground"
                          )}>
                            {stage.label}
                          </h4>
                          {isCurrent && (
                            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                              Atual
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {stage.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Notes for current stage */}
            {!isComplete && (
              <div className="mt-6 pt-4 border-t">
                <Label htmlFor="notes" className="text-sm font-medium">
                  Observações (opcional)
                </Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={`Adicione notas sobre a etapa de ${currentStage?.label}...`}
                  className="mt-2"
                  rows={3}
                />
              </div>
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
            {!isComplete && currentStageIndex > 0 && (
              <Button 
                variant="ghost"
                onClick={handleGoBackStage}
                disabled={isAdvancing}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar Etapa
              </Button>
            )}
            {!isComplete && (
              <Button 
                onClick={handleAdvanceStage}
                disabled={isAdvancing}
                className="gap-2"
              >
                {isAdvancing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4" />
                )}
                {currentStage?.action || 'Avançar'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Client Tier Badge Component
interface ClientTierBadgeProps {
  tier: 'PREMIUM' | 'POPULAR';
  size?: 'sm' | 'md';
}

export function ClientTierBadge({ tier, size = 'md' }: ClientTierBadgeProps) {
  const isPremium = tier === 'PREMIUM';
  
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-medium",
        size === 'sm' ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs",
        isPremium 
          ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
          : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
      )}
    >
      {isPremium ? (
        <Crown className={cn(size === 'sm' ? "h-3 w-3" : "h-3.5 w-3.5")} />
      ) : (
        <Users2 className={cn(size === 'sm' ? "h-3 w-3" : "h-3.5 w-3.5")} />
      )}
      {tier}
    </span>
  );
}

// Mini version for inline display
interface OnboardingProgressProps {
  stage: OnboardingStage;
  onClick?: () => void;
}

export function OnboardingProgress({ stage, onClick }: OnboardingProgressProps) {
  const stageIndex = STAGES.findIndex(s => s.key === stage);
  const progress = stage === 'CONCLUIDO' ? 100 : ((stageIndex + 1) / STAGES.length) * 100;
  const currentStage = STAGES.find(s => s.key === stage);

  return (
    <button
      onClick={onClick}
      className="w-full text-left p-3 rounded-lg bg-surface-2 hover:bg-surface-3 transition-colors group"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-foreground">
          {stage === 'CONCLUIDO' ? '✓ Ativação Concluída' : currentStage?.label}
        </span>
        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
      </div>
      <div className="h-2 bg-border rounded-full overflow-hidden">
        <div 
          className="h-full bg-primary transition-all duration-500 rounded-full"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground mt-1">
        {stage === 'CONCLUIDO' ? '6/6 etapas' : `${stageIndex + 1}/6 etapas`}
      </p>
    </button>
  );
}
