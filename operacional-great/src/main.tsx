import { createRoot } from "react-dom/client";
import "./index.css";

const rootElement = document.getElementById("root");

function renderConfigError() {
  if (!rootElement) return;

  createRoot(rootElement).render(
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0b0b0d",
        color: "#f5f5f5",
        fontFamily: "Inter, sans-serif",
        padding: "24px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "720px",
          background: "#151519",
          border: "1px solid #2a2a31",
          borderRadius: "16px",
          padding: "24px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
        }}
      >
        <h1 style={{ margin: "0 0 12px", fontSize: "28px" }}>Configuração ausente</h1>
        <p style={{ margin: "0 0 16px", color: "#b9b9c2", lineHeight: 1.6 }}>
          O projeto não conseguiu iniciar porque as variáveis do Supabase não foram definidas no ambiente local.
        </p>
        <p style={{ margin: "0 0 12px", color: "#f5f5f5" }}>
          Crie um arquivo <code>.env.local</code> na raiz do projeto com:
        </p>
        <pre
          style={{
            margin: 0,
            padding: "16px",
            background: "#0f0f13",
            borderRadius: "12px",
            overflowX: "auto",
            color: "#d7d7df",
          }}
        >
{`VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...`}
        </pre>
      </div>
    </div>
  );
}

async function bootstrap() {
  const hasSupabaseConfig =
    Boolean(import.meta.env.VITE_SUPABASE_URL) &&
    Boolean(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);

  if (!hasSupabaseConfig) {
    renderConfigError();
    return;
  }

  const { default: App } = await import("./App.tsx");

  if (rootElement) {
    createRoot(rootElement).render(<App />);
  }
}

void bootstrap();
