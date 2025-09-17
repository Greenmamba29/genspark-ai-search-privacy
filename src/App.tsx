import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import EnhancedSearchInterface from './components/search/EnhancedSearchInterface'
import FileManager from './components/ui/FileManager'

function App() {

  return (
    <Router>
      <div className="min-h-screen">
        <main>
          <Routes>
            <Route 
              path="/" 
              element={<EnhancedSearchInterface />} 
            />
            <Route path="/files" element={<FileManager />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App