import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { LogoLoader } from '@/components/brand/Logo';

export default function Logout() {
  const { logout } = useAuth();

  useEffect(() => {
    void logout();
  }, [logout]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <LogoLoader className="mb-4" />
        <p className="text-muted-foreground">Saindo da conta...</p>
      </div>
    </div>
  );
}
