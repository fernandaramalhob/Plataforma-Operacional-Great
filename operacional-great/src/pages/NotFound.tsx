import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-6">
      <div className="max-w-md rounded-2xl border border-border bg-background px-8 py-10 text-center shadow-sm">
        <h1 className="mb-3 text-5xl font-bold text-foreground">404</h1>
        <p className="mb-2 text-xl font-semibold text-foreground">Página não encontrada</p>
        <p className="mb-6 text-sm text-muted-foreground">
          O endereço acessado não existe ou foi movido.
        </p>
        <a href="/" className="text-primary underline underline-offset-4 hover:text-primary/90">
          Voltar para a página inicial
        </a>
      </div>
    </div>
  );
};

export default NotFound;
