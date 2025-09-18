import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './contexts/ThemeContext'
import { ModelProvider } from './contexts/ModelContext'
import Header from './components/layout/Header'
import ConsoleSearchInterface from './components/search/ConsoleSearchInterface'
import FileManager from './components/ui/FileManager'

function App() {
  return (
    <ThemeProvider>
      <ModelProvider>
        <Router>
          <div className="min-h-screen bg-white dark:bg-secondary-900 transition-colors duration-300">
            <Header />
            <main className="pt-20"> {/* Account for fixed header */}
              <Routes>
                <Route 
                  path="/" 
                  element={<ConsoleSearchInterface />}
                />
                <Route path="/files" element={<FileManager />} />
              </Routes>
            </main>
          </div>
        </Router>
      </ModelProvider>
    </ThemeProvider>
  )
}

export default App