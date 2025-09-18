import { useState, useRef, useEffect } from 'react'
import { Sun, Moon, Monitor, ChevronDown } from 'lucide-react'
import { useThemeContext, Theme } from '../../contexts/ThemeContext'

const themeIcons = {
  light: Sun,
  dark: Moon,
  system: Monitor
}

const themeLabels = {
  light: 'Light',
  dark: 'Dark',
  system: 'System'
}

export default function ThemeToggle() {
  const { theme, setTheme, toggleTheme, isDark } = useThemeContext()
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleThemeSelect = (selectedTheme: Theme) => {
    setTheme(selectedTheme)
    setShowDropdown(false)
  }

  const CurrentIcon = themeIcons[theme]

  return (
    <div className="relative">
      {/* Quick Toggle Button */}
      <button
        ref={buttonRef}
        onClick={() => setShowDropdown(!showDropdown)}
        onDoubleClick={toggleTheme} // Quick toggle with double-click
        className={`group relative p-2 rounded-lg transition-all duration-200 hover:scale-105 ${
          isDark 
            ? 'text-amber-400 hover:bg-secondary-800/80' 
            : 'text-secondary-600 hover:bg-secondary-100'
        }`}
        aria-label={`Current theme: ${themeLabels[theme]}. Click to open theme menu, double-click to cycle themes.`}
      >
        <div className="relative">
          <CurrentIcon className="w-5 h-5 transition-transform duration-200 group-hover:rotate-12" />
          <ChevronDown className={`absolute -bottom-1 -right-1 w-3 h-3 transition-all duration-200 ${
            showDropdown ? 'rotate-180' : ''
          } ${isDark ? 'text-amber-400/70' : 'text-secondary-400'}`} />
        </div>

        {/* Glow effect for dark mode */}
        {isDark && (
          <div className="absolute inset-0 rounded-lg bg-amber-400/10 blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 -z-10"></div>
        )}
      </button>

      {/* Theme Dropdown */}
      {showDropdown && (
        <div 
          ref={dropdownRef}
          className="absolute right-0 top-full mt-2 w-48 glass rounded-xl border border-white/20 dark:border-secondary-700/50 shadow-lg backdrop-blur-md z-50 animate-slide-down"
        >
          <div className="p-2">
            <div className="text-xs font-medium text-secondary-600 dark:text-secondary-400 px-3 py-2 mb-1">
              Choose Theme
            </div>
            
            {Object.entries(themeLabels).map(([themeKey, label]) => {
              const Icon = themeIcons[themeKey as Theme]
              const isActive = theme === themeKey
              
              return (
                <button
                  key={themeKey}
                  onClick={() => handleThemeSelect(themeKey as Theme)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
                    isActive
                      ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                      : 'text-secondary-700 dark:text-secondary-300 hover:bg-secondary-50 dark:hover:bg-secondary-800/50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${
                    isActive 
                      ? 'text-primary-600 dark:text-primary-400' 
                      : 'text-secondary-500 dark:text-secondary-400'
                  }`} />
                  <span className="flex-1 text-left">{label}</span>
                  
                  {isActive && (
                    <div className="w-2 h-2 bg-primary-500 rounded-full animate-scale-in"></div>
                  )}
                </button>
              )
            })}
          </div>
          
          {/* Theme Preview Hint */}
          <div className="border-t border-secondary-200 dark:border-secondary-700 px-3 py-2">
            <div className="text-xs text-secondary-500 dark:text-secondary-400 flex items-center space-x-1">
              <Monitor className="w-3 h-3" />
              <span>System follows your OS preference</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}