import type { Metadata } from "next"
import { GeistMono } from "geist/font/mono"
import { GeistSans } from "geist/font/sans"
import Providers from "@/components/providers"
import "./globals.css"

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
    <html lang="pt-BR">
      <body className={`${GeistSans.variable} ${GeistMono.variable} font-sans antialiased`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
