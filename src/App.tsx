import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Search, Moon, Sun, Upload } from 'lucide-react'
import SearchInterface from './components/search/SearchInterface'
import FileManager from './components/ui/FileManager'
import Header from './components/layout/Header'

function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>('system')
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    // Initialize theme based on system preference or saved preference
    const savedTheme = localStorage.getItem('grahmos-theme') as 'light' | 'dark' | null
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches

    if (savedTheme) {
      setTheme(savedTheme)
      setIsDark(savedTheme === 'dark')
    } else {
      setIsDark(systemPrefersDark)
    }
  }, [])

  useEffect(() => {
    // Apply theme to document
    if (isDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [isDark])

  const toggleTheme = () => {
    const newTheme = isDark ? 'light' : 'dark'
    setTheme(newTheme)
    setIsDark(!isDark)
    localStorage.setItem('grahmos-theme', newTheme)
  }

  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-secondary-50 to-secondary-100 dark:from-secondary-950 dark:to-secondary-900 transition-colors duration-300">
        <Header 
          theme={theme}
          isDark={isDark}
          onThemeToggle={toggleTheme}
        />
        
        <main className="container mx-auto px-4 py-8">
          <Routes>
            <Route 
              path="/" 
              element={
                <div className="space-y-8">
                  {/* Hero Section */}
                  <div className="text-center py-12">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary-500 to-accent-500 rounded-2xl mb-6">
                      <Search className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent mb-4">
                      Grahmos AI Search
                    </h1>
                    <p className="text-xl text-secondary-600 dark:text-secondary-400 max-w-2xl mx-auto text-balance">
                      Advanced offline search powered by AI. Find anything, anywhere, without internet.
                    </p>
                  </div>

                  {/* Search Interface */}
                  <SearchInterface />
                </div>
              } 
            />
            <Route path="/files" element={<FileManager />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App