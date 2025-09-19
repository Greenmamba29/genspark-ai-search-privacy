import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Cpu, Check, Download, AlertTriangle, Zap, HardDrive, Gauge, TrendingUp } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useModels } from '../../contexts/ModelContext'
import { useModelPerformance } from '../../hooks/useModelPerformance'

interface ModelSelectorProps {
  compact?: boolean
  showDownloadAction?: boolean
  onModelDownloadClick?: () => void
}

export default function ModelSelector({ 
  compact = false, 
  showDownloadAction = true,
  onModelDownloadClick 
}: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  const {
    getCurrentModelInfo,
    getInstalledModels,
    getAllModels,
    setCurrentModel,
    state: modelState
  } = useModels()

  const { getModelMetrics } = useModelPerformance()

  const currentModel = getCurrentModelInfo()
  const installedModels = getInstalledModels()
  const allModels = getAllModels()

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const getModelIcon = (model: any) => {
    switch (model?.icon) {
      case 'brain': return <Cpu className="w-4 h-4" />
      case 'cpu': return <Cpu className="w-4 h-4" />
      case 'zap': return <Zap className="w-4 h-4" />
      case 'eye': return <HardDrive className="w-4 h-4" />
      default: return <HardDrive className="w-4 h-4" />
    }
  }

  const handleModelSelect = (modelId: string) => {
    setCurrentModel(modelId)
    setIsOpen(false)
  }

  if (compact) {
    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center space-x-2 px-3 py-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <div className="flex items-center space-x-1">
            {getModelIcon(currentModel)}
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {currentModel?.name || 'gpt-oss:20b'}
            </span>
          </div>
          <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-xl z-50 min-w-64"
            >
              <div className="p-2">
                <div className="text-xs font-medium text-gray-600 dark:text-gray-400 px-3 py-2 border-b border-gray-100 dark:border-gray-700">
                  Select AI Model
                </div>
                
                {installedModels.map((model) => (
                  <button
                    key={model.id}
                    onClick={() => handleModelSelect(model.id)}
                    className={`w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md transition-colors ${
                      modelState.currentModel === model.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${
                        modelState.currentModel === model.id 
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' 
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                      }`}>
                        {getModelIcon(model)}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white text-sm">
                          {model.displayName}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {model.size} • {model.capabilities.slice(0, 2).join(', ')}
                          {(() => {
                            const metrics = getModelMetrics(model.id)
                            if (metrics && metrics.totalQueries > 0) {
                              return (
                                <>
                                  <span> • </span>
                                  <span className={`inline-flex items-center space-x-1 ${
                                    metrics.performanceScore >= 80 ? 'text-green-600 dark:text-green-400' :
                                    metrics.performanceScore >= 60 ? 'text-blue-600 dark:text-blue-400' :
                                    metrics.performanceScore >= 40 ? 'text-yellow-600 dark:text-yellow-400' :
                                    'text-red-600 dark:text-red-400'
                                  }`}>
                                    <Gauge className="w-3 h-3" />
                                    <span>{metrics.performanceScore}/100</span>
                                  </span>
                                </>
                              )
                            }
                            return null
                          })()} 
                        </div>
                      </div>
                    </div>
                    
                    {modelState.currentModel === model.id && (
                      <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    )}
                  </button>
                ))}

                {showDownloadAction && (
                  <div className="border-t border-gray-100 dark:border-gray-700 mt-2 pt-2">
                    <button
                      onClick={() => {
                        setIsOpen(false)
                        onModelDownloadClick?.()
                      }}
                      className="w-full flex items-center space-x-3 p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md transition-colors"
                    >
                      <div className="p-2 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg">
                        <Download className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white text-sm">
                          Download More Models
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {allModels.filter(m => m.status !== 'installed').length} available
                        </div>
                      </div>
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  // Full-width version for settings panels
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl hover:border-blue-300 dark:hover:border-blue-600 transition-all group"
      >
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg group-hover:scale-105 transition-transform">
            {getModelIcon(currentModel)}
          </div>
          <div className="text-left">
            <div className="font-semibold text-gray-900 dark:text-white">
              {currentModel?.displayName || 'GPT-OSS 20B'}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {currentModel?.size || '14GB'} • {currentModel?.capabilities.slice(0, 2).join(', ') || 'Reasoning, Analysis'}
            </div>
            {currentModel?.warning && (
              <div className="flex items-center space-x-1 mt-1">
                <AlertTriangle className="w-3 h-3 text-orange-500" />
                <span className="text-xs text-orange-600 dark:text-orange-400">
                  {currentModel.warning}
                </span>
              </div>
            )}
          </div>
        </div>
        <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-xl z-50 max-h-80 overflow-y-auto"
          >
            <div className="p-3">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300 px-3 py-2 border-b border-gray-100 dark:border-gray-700 mb-2">
                Installed Models ({installedModels.length})
              </div>
              
              {installedModels.map((model) => (
                <button
                  key={model.id}
                  onClick={() => handleModelSelect(model.id)}
                  className={`w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors mb-1 ${
                    modelState.currentModel === model.id ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800' : ''
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${
                      modelState.currentModel === model.id 
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' 
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                    }`}>
                      {getModelIcon(model)}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {model.displayName}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
                        <div>
                          {model.size} • {model.capabilities.join(', ')}
                        </div>
                        {(() => {
                          const metrics = getModelMetrics(model.id)
                          if (metrics && metrics.totalQueries > 0) {
                            return (
                              <div className="flex items-center space-x-4 text-xs">
                                <span className={`inline-flex items-center space-x-1 ${
                                  metrics.performanceScore >= 80 ? 'text-green-600 dark:text-green-400' :
                                  metrics.performanceScore >= 60 ? 'text-blue-600 dark:text-blue-400' :
                                  metrics.performanceScore >= 40 ? 'text-yellow-600 dark:text-yellow-400' :
                                  'text-red-600 dark:text-red-400'
                                }`}>
                                  <Gauge className="w-3 h-3" />
                                  <span>Performance: {metrics.performanceScore}/100</span>
                                </span>
                                <span className="inline-flex items-center space-x-1 text-gray-500 dark:text-gray-400">
                                  <TrendingUp className="w-3 h-3" />
                                  <span>{Math.round(metrics.averageResponseTime)}ms avg</span>
                                </span>
                                <span className="text-gray-500 dark:text-gray-400">
                                  {metrics.totalQueries} queries
                                </span>
                              </div>
                            )
                          }
                          return null
                        })()} 
                      </div>
                      {model.warning && (
                        <div className="flex items-center space-x-1 mt-1">
                          <AlertTriangle className="w-3 h-3 text-orange-500" />
                          <span className="text-xs text-orange-600 dark:text-orange-400">
                            {model.warning}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {modelState.currentModel === model.id && (
                    <div className="flex items-center space-x-2">
                      <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-1 rounded-full font-medium">
                        Active
                      </span>
                      <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                  )}
                </button>
              ))}

              {showDownloadAction && (
                <>
                  <div className="border-t border-gray-100 dark:border-gray-700 my-3"></div>
                  <button
                    onClick={() => {
                      setIsOpen(false)
                      onModelDownloadClick?.()
                    }}
                    className="w-full flex items-center space-x-3 p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <div className="p-2 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg">
                      <Download className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 dark:text-white">
                        Download More Models
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {allModels.filter(m => m.status !== 'installed').length} models available for download
                      </div>
                    </div>
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}