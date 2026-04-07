"use client"

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"

export type Theme = "light" | "dark"

type ThemeContextValue = {
  theme: Theme
  isReady: boolean
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

const THEME_STORAGE_KEY = "greatgo-theme"
const DEFAULT_THEME: Theme = "light"

const ThemeContext = createContext<ThemeContextValue | null>(null)

function isTheme(value: string | null): value is Theme {
  return value === "light" || value === "dark"
}

function resolveThemeFromDom(): Theme | null {
  if (typeof document === "undefined") {
    return null
  }

  const root = document.documentElement
  const dataTheme = root.dataset.theme ?? null

  if (isTheme(dataTheme)) {
    return dataTheme
  }

  if (root.classList.contains("dark")) {
    return "dark" satisfies Theme
  }

  if (root.classList.contains("light")) {
    return "light" satisfies Theme
  }

  return null
}

function getInitialTheme(): Theme {
  if (typeof window === "undefined") {
    return DEFAULT_THEME
  }

  const domTheme = resolveThemeFromDom()
  if (domTheme) {
    return domTheme
  }

  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY)
  return isTheme(storedTheme) ? storedTheme : DEFAULT_THEME
}

function applyTheme(theme: Theme) {
  const root = document.documentElement

  root.classList.remove("light", "dark")
  root.classList.add(theme)
  root.classList.add("theme-ready")
  root.dataset.theme = theme
  root.style.colorScheme = theme
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme)
  const isReady = true

  useEffect(() => {
    applyTheme(theme)
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
  }, [theme])

  function setTheme(nextTheme: Theme) {
    setThemeState(nextTheme)
  }

  function toggleTheme() {
    setThemeState((currentTheme) => (
      currentTheme === "dark" ? "light" : "dark"
    ))
  }

  const value = {
    theme,
    isReady,
    setTheme,
    toggleTheme,
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)

  if (!context) {
    throw new Error("useTheme deve ser usado dentro de ThemeProvider")
  }

  return context
}
