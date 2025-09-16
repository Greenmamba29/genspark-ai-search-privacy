import { Link, useLocation } from 'react-router-dom'
import { Moon, Sun, Upload, Bell, Search, Files } from 'lucide-react'

interface HeaderProps {
  theme: 'light' | 'dark' | 'system'
  isDark: boolean
  onThemeToggle: () => void
}

export default function Header({ isDark, onThemeToggle }: HeaderProps) {
  const location = useLocation()

  return (
    <header className="sticky top-0 z-50 glass border-b border-white/20 dark:border-secondary-700/50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo and Navigation */}
          <div className="flex items-center space-x-8">
            <Link 
              to="/" 
              className="flex items-center space-x-3 group"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-accent-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                <Search className="w-4 h-4 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">
                Grahmos AI
              </span>
            </Link>

            <nav className="hidden md:flex items-center space-x-6">
              <Link 
                to="/" 
                className={`px-3 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2 ${
                  location.pathname === '/' 
                    ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300' 
                    : 'text-secondary-600 dark:text-secondary-400 hover:text-primary-600 dark:hover:text-primary-400'
                }`}
              >
                <Search className="w-4 h-4" />
                <span>Search</span>
              </Link>
              <Link 
                to="/files" 
                className={`px-3 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2 ${
                  location.pathname === '/files' 
                    ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300' 
                    : 'text-secondary-600 dark:text-secondary-400 hover:text-primary-600 dark:hover:text-primary-400'
                }`}
              >
                <Files className="w-4 h-4" />
                <span>Files</span>
              </Link>
            </nav>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-4">
            {/* Notifications */}
            <button className="relative p-2 rounded-lg text-secondary-600 dark:text-secondary-400 hover:bg-secondary-100 dark:hover:bg-secondary-800 transition-colors duration-200">
              <Bell className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-accent-500 rounded-full animate-glow"></span>
            </button>

            {/* Quick Upload */}
            <button className="btn-primary btn-glow flex items-center space-x-2">
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">Quick Upload</span>
            </button>

            {/* Theme Toggle */}
            <button
              onClick={onThemeToggle}
              className="p-2 rounded-lg text-secondary-600 dark:text-secondary-400 hover:bg-secondary-100 dark:hover:bg-secondary-800 transition-colors duration-200"
              aria-label="Toggle theme"
            >
              {isDark ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}