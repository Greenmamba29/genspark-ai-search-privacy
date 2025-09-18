import { createContext, useContext, ReactNode } from 'react'
import { useTheme, Theme, ResolvedTheme } from '../hooks/useTheme'

interface ThemeContextType {
  theme: Theme
  resolvedTheme: ResolvedTheme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  systemTheme: ResolvedTheme
  isDark: boolean
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

interface ThemeProviderProps {
  children: ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const themeHook = useTheme()
  
  const contextValue: ThemeContextType = {
    ...themeHook,
    isDark: themeHook.resolvedTheme === 'dark'
  }

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useThemeContext(): ThemeContextType {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useThemeContext must be used within a ThemeProvider')
  }
  return context
}

// Export theme utilities
export type { Theme, ResolvedTheme }
