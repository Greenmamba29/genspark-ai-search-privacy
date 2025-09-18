import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Upload, Bell, Search, Files } from 'lucide-react'
import { useThemeContext } from '../../contexts/ThemeContext'
import ThemeToggle from '../ui/ThemeToggle'
import QuickUploadModal from '../ui/QuickUploadModal'

export default function Header() {
  const location = useLocation()
  const { isDark: _isDark } = useThemeContext()
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [notifications] = useState(3) // Mock notification count

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/20 dark:border-secondary-700/50 backdrop-blur-xl transition-all duration-300">
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

          {/* Enhanced Actions */}
          <div className="flex items-center space-x-3">
            {/* Notifications with count */}
            <button className="relative p-2 rounded-lg text-secondary-600 dark:text-secondary-400 hover:bg-secondary-100 dark:hover:bg-secondary-800 transition-all duration-200 group">
              <Bell className="w-5 h-5 group-hover:animate-pulse" />
              {notifications > 0 && (
                <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] text-xs font-medium bg-accent-500 text-white rounded-full animate-glow">
                  {notifications > 99 ? '99+' : notifications}
                </span>
              )}
            </button>

            {/* Quick Upload with enhanced glow */}
            <button 
              onClick={() => setShowUploadModal(true)}
              className="btn-primary btn-glow flex items-center space-x-2 hover:scale-105 active:scale-95 transition-all duration-200"
            >
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline font-medium">Quick Upload</span>
            </button>

            {/* Enhanced Theme Toggle */}
            <ThemeToggle />
          </div>
        </div>
      </div>

      {/* Quick Upload Modal */}
      {showUploadModal && (
        <QuickUploadModal 
          onClose={() => setShowUploadModal(false)}
          onUpload={(files) => {
            console.log('Files uploaded:', files)
            setShowUploadModal(false)
            // TODO: Implement actual upload logic
          }}
        />
      )}
    </header>
  )
}
