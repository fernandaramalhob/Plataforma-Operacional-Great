import TechDeploymentsBoard from '@/components/tech/TechDeploymentsBoard';

export default function Implantacoes() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Implantações</h1>
        <p className="text-muted-foreground">Gerencie as implantações de clientes</p>
      </div>
      
      <TechDeploymentsBoard />
    </div>
  );
}
