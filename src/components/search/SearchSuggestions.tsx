import { useState, useEffect, useRef, KeyboardEvent } from 'react'
import { Search, Clock, TrendingUp, Sparkles, ChevronRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface SearchSuggestionsProps {
  isVisible: boolean
  searchQuery: string
  onSelect: (suggestion: string) => void
  model: string
  isBackendConnected: boolean
}

interface Suggestion {
  id: string
  text: string
  type: 'recent' | 'trending' | 'ai' | 'completion'
  icon: React.ReactNode
}

export default function SearchSuggestions({
  isVisible,
  searchQuery,
  onSelect,
  model,
  isBackendConnected
}: SearchSuggestionsProps) {
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const containerRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Generate suggestions based on query
  useEffect(() => {
    const generateSuggestions = () => {
      if (!searchQuery.trim()) {
        // Default suggestions when no query
        return [
          {
            id: 'ai-1',
            text: 'Find all PDF documents about machine learning',
            type: 'ai' as const,
            icon: <Sparkles className="w-4 h-4 text-purple-500" />
          },
          {
            id: 'ai-2', 
            text: 'Show me code files containing authentication',
            type: 'ai' as const,
            icon: <Sparkles className="w-4 h-4 text-purple-500" />
          },
          {
            id: 'ai-3',
            text: 'Search for recent presentations and documents',
            type: 'ai' as const,
            icon: <Sparkles className="w-4 h-4 text-purple-500" />
          },
          {
            id: 'trending-1',
            text: 'neural networks deep learning',
            type: 'trending' as const,
            icon: <TrendingUp className="w-4 h-4 text-orange-500" />
          },
          {
            id: 'trending-2',
            text: 'vector embeddings semantic search',
            type: 'trending' as const,
            icon: <TrendingUp className="w-4 h-4 text-orange-500" />
          }
        ]
      }

      // Query-based suggestions
      const baseQuery = searchQuery.toLowerCase()
      const completions = [
        `${baseQuery} algorithms`,
        `${baseQuery} tutorial`, 
        `${baseQuery} examples`,
        `${baseQuery} documentation`,
        `${baseQuery} implementation`
      ].filter((_, index) => index < 3)

      const recentSearches = [
        'machine learning fundamentals',
        'neural network architectures', 
        'data processing pipeline'
      ].filter(search => search.includes(baseQuery))

      return [
        ...completions.map((completion, index) => ({
          id: `completion-${index}`,
          text: completion,
          type: 'completion' as const,
          icon: <Search className="w-4 h-4 text-blue-500" />
        })),
        ...recentSearches.map((recent, index) => ({
          id: `recent-${index}`,
          text: recent,
          type: 'recent' as const,
          icon: <Clock className="w-4 h-4 text-gray-500" />
        }))
      ]
    }

    setSuggestions(generateSuggestions())
    setSelectedIndex(-1)
  }, [searchQuery])

  // Handle keyboard navigation
  const handleKeyDown = (event: Event) => {
    const keyboardEvent = event as unknown as KeyboardEvent
    if (!isVisible || suggestions.length === 0) return

    switch (keyboardEvent.key) {
      case 'ArrowDown':
        keyboardEvent.preventDefault()
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        )
        break
      case 'ArrowUp':
        keyboardEvent.preventDefault()
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        )
        break
      case 'Enter':
        if (selectedIndex >= 0) {
          keyboardEvent.preventDefault()
          onSelect(suggestions[selectedIndex].text)
        }
        break
      case 'Escape':
        setSelectedIndex(-1)
        break
    }
  }

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && listRef.current) {
      const selectedElement = listRef.current.children[selectedIndex] as HTMLElement
      if (selectedElement) {
        selectedElement.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest'
        })
      }
    }
  }, [selectedIndex])

  // Add keyboard event listener
  useEffect(() => {
    if (isVisible) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isVisible, selectedIndex, suggestions])

  if (!isVisible) return null

  return (
    <AnimatePresence>
      <motion.div
        ref={containerRef}
        initial={{ opacity: 0, y: -10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.95 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 shadow-2xl z-50 overflow-hidden"
        style={{ 
          backdropFilter: 'blur(10px)',
          background: 'rgba(255, 255, 255, 0.95)',
        }}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-secondary-100 dark:border-secondary-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-sm text-secondary-600 dark:text-secondary-400">
              <Sparkles className="w-4 h-4" />
              <span>AI-powered suggestions with {model.split('/').pop()}</span>
            </div>
            <div className="text-xs text-secondary-500 dark:text-secondary-500">
              {isBackendConnected ? 'Local AI' : 'Demo Mode'}
            </div>
          </div>
        </div>

        {/* Suggestions List */}
        <div 
          ref={listRef}
          className="max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-secondary-300 dark:scrollbar-thumb-secondary-600 scrollbar-track-transparent"
        >
          {suggestions.map((suggestion, index) => (
            <motion.div
              key={suggestion.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.03 }}
              className={`
                flex items-center space-x-3 px-4 py-3 cursor-pointer transition-all duration-150
                ${index === selectedIndex 
                  ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 shadow-sm' 
                  : 'hover:bg-secondary-50 dark:hover:bg-secondary-700/50'
                }
              `}
              onClick={() => onSelect(suggestion.text)}
            >
              <div className="flex-shrink-0">
                {suggestion.icon}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span 
                    className={`
                      text-sm truncate
                      ${index === selectedIndex 
                        ? 'text-blue-700 dark:text-blue-300 font-medium' 
                        : 'text-secondary-700 dark:text-secondary-300'
                      }
                    `}
                  >
                    {suggestion.text}
                  </span>
                  
                  <div className="flex items-center space-x-2 ml-2 flex-shrink-0">
                    {suggestion.type === 'recent' && (
                      <span className="text-xs text-secondary-500 dark:text-secondary-500">Recent</span>
                    )}
                    {suggestion.type === 'trending' && (
                      <span className="text-xs text-orange-500">Trending</span>
                    )}
                    {suggestion.type === 'ai' && (
                      <span className="text-xs text-purple-500">AI</span>
                    )}
                    <ChevronRight className={`
                      w-4 h-4 transition-transform duration-150
                      ${index === selectedIndex 
                        ? 'text-blue-500 transform translate-x-1' 
                        : 'text-secondary-400'
                      }
                    `} />
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 bg-secondary-50 dark:bg-secondary-800 border-t border-secondary-100 dark:border-secondary-700">
          <div className="flex items-center justify-between text-xs text-secondary-500 dark:text-secondary-500">
            <span>Use ↑↓ to navigate, Enter to select</span>
            <span>Powered by Grahmos AI</span>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}