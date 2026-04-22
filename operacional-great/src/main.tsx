import { createRoot } from "react-dom/client";
import "./index.css";

const rootElement = document.getElementById("root");
let root: ReturnType<typeof createRoot> | null = null;

function getRoot() {
  if (!rootElement) return null;
  if (!root) {
    root = createRoot(rootElement);
  }
  return root;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return {
      title: error.name || "Erro de inicializacao",
      message: error.message || "Erro desconhecido",
      details: error.stack ?? "",
    };
  }

  return {
    title: "Erro de inicializacao",
    message: typeof error === "string" ? error : "Erro desconhecido",
    details: "",
  };
}

function renderFatalError(error: unknown) {
  const appRoot = getRoot();
  if (!appRoot) return;

  const { title, message, details } = getErrorMessage(error);

  appRoot.render(
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
          maxWidth: "900px",
          background: "#151519",
          border: "1px solid #2a2a31",
          borderRadius: "16px",
          padding: "24px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
        }}
      >
        <p style={{ margin: "0 0 8px", color: "#ff8f8f", fontWeight: 700 }}>
          Erro ao carregar a plataforma
        </p>
        <h1 style={{ margin: "0 0 12px", fontSize: "28px" }}>{title}</h1>
        <p style={{ margin: "0 0 16px", color: "#d7d7df", lineHeight: 1.6 }}>{message}</p>
        {details ? (
          <pre
            style={{
              margin: 0,
              padding: "16px",
              background: "#0f0f13",
              borderRadius: "12px",
              overflowX: "auto",
              color: "#d7d7df",
              whiteSpace: "pre-wrap",
            }}
          >
            {details}
          </pre>
        ) : null}
      </div>
    </div>
  );
}

function renderConfigError() {
  const appRoot = getRoot();
  if (!appRoot) return;

  appRoot.render(
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
VITE_SUPABASE_PUBLISHABLE_KEY=...
# ou:
# VITE_SUPABASE_ANON_KEY=...`}
        </pre>
      </div>
    </div>
  );
}

async function bootstrap() {
  window.addEventListener("error", (event) => {
    renderFatalError(event.error ?? event.message);
  });

  window.addEventListener("unhandledrejection", (event) => {
    renderFatalError(event.reason);
  });

  try {
    const { default: App } = await import("./App.tsx");

    const appRoot = getRoot();
    if (appRoot) {
      appRoot.render(<App />);
    }
  } catch (error) {
    console.error("Fatal bootstrap error:", error);
    renderFatalError(error);
  }
}

void bootstrap();
