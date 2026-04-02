import type { Metadata } from "next"
import { GeistMono } from "geist/font/mono"
import { GeistSans } from "geist/font/sans"
import Providers from "@/components/providers"
import "./globals.css"

const themeInitScript = `
  (() => {
    const storageKey = "greatgo-theme";
    const defaultTheme = "light";

    try {
      const storedTheme = window.localStorage.getItem(storageKey);
      const theme = storedTheme === "dark" || storedTheme === "light" ? storedTheme : defaultTheme;
      const root = document.documentElement;

      root.classList.remove("light", "dark");
      root.classList.add(theme);
      root.dataset.theme = theme;
      root.style.colorScheme = theme;
    } catch {
      document.documentElement.classList.add(defaultTheme);
      document.documentElement.dataset.theme = defaultTheme;
      document.documentElement.style.colorScheme = defaultTheme;
    }
  })();
`

export const metadata: Metadata = {
  title: {
    default: "GreatGo",
    template: "%s | GreatGo",
  },
  applicationName: "GreatGo",
  description: "Plataforma interna para relatórios e operação de performance em META Ads",
  icons: {
    icon: [{ url: "/favicon.png" }],
    shortcut: [{ url: "/favicon.png" }],
    apple: [{ url: "/favicon.png" }],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${GeistSans.variable} ${GeistMono.variable} font-sans antialiased`}>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
