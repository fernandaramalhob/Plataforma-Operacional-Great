"use client"

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
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

function applyTheme(theme: Theme) {
  const root = document.documentElement

  root.classList.remove("light", "dark")
  root.classList.add(theme)
  root.classList.add("theme-ready")
  root.dataset.theme = theme
  root.style.colorScheme = theme
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(DEFAULT_THEME)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY)
    const initialTheme = isTheme(storedTheme) ? storedTheme : DEFAULT_THEME

    setThemeState(initialTheme)
    applyTheme(initialTheme)
    setIsReady(true)
  }, [])

  function setTheme(nextTheme: Theme) {
    setThemeState(nextTheme)
    applyTheme(nextTheme)
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme)
  }

  function toggleTheme() {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  const value = useMemo(
    () => ({
      theme,
      isReady,
      setTheme,
      toggleTheme,
    }),
    [isReady, theme]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)

  if (!context) {
    throw new Error("useTheme deve ser usado dentro de ThemeProvider")
  }

  return context
}
