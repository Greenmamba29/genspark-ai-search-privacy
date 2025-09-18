import { useState, useEffect } from 'react'
import { X, Download, Check, AlertTriangle, HardDrive, Cpu, Zap } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface ModelInfo {
  id: string
  name: string
  displayName: string
  size: string
  description: string
  capabilities: string[]
  downloadUrl?: string
  status: 'available' | 'downloading' | 'installed' | 'error'
  downloadProgress?: number
  warning?: string
  icon: string
}

interface ModelDownloadModalProps {
  isOpen: boolean
  onClose: () => void
  onModelSelect?: (modelId: string) => void
  installedModels?: string[]
  currentModel?: string
}

const AVAILABLE_MODELS: ModelInfo[] = [
  {
    id: 'gpt-oss-20b',
    name: 'gpt-oss:20b',
    displayName: 'GPT-OSS 20B',
    size: '14GB',
    description: "OpenAI's open-weight models designed for powerful reasoning, agentic tasks, and versatile developer use cases.",
    capabilities: ['Reasoning', 'Code Generation', 'Analysis'],
    status: 'available',
    warning: 'Stretch, may run slow',
    icon: 'brain'
  },
  {
    id: 'llama31-8b',
    name: 'llama3.1:8b',
    displayName: 'Llama 3.1 8B',
    size: '4.9GB',
    description: 'Llama 3.1 is a new state-of-the-art model from Meta available in 8B, 70B and 405B parameter sizes.',
    capabilities: ['Natural Language', 'Reasoning', 'Multilingual'],
    status: 'available',
    icon: 'zap'
  },
  {
    id: 'llama3-8b',
    name: 'llama3:8b',
    displayName: 'Llama 3 8B',
    size: '4.7GB',
    description: 'Meta Llama 3: The most capable openly available LLM to date',
    capabilities: ['Natural Language', 'Conversation', 'Analysis'],
    status: 'available',
    warning: 'Stretch, may run slow',
    icon: 'cpu'
  },
  {
    id: 'mistral-7b',
    name: 'mistral:7b',
    displayName: 'Mistral 7B',
    size: '4.4GB',
    description: 'The 7B model released by Mistral AI, updated to version 0.3.',
    capabilities: ['Efficiency', 'Speed', 'Reasoning'],
    status: 'available',
    warning: 'Stretch, may run slow',
    icon: 'zap'
  },
  {
    id: 'llava-7b',
    name: 'llava:7b',
    displayName: 'LLaVA 7B',
    size: '4.7GB',
    description: '🌋 LLaVA is a novel end-to-end trained large multimodal model that combines a vision encoder and Vicuna for general-purpose visual and language understanding. Updated to version 1.6.',
    capabilities: ['Vision', 'Multimodal', 'Image Analysis'],
    status: 'available',
    warning: 'Stretch, may run slow',
    icon: 'eye'
  },
  {
    id: 'phi3-3.8b',
    name: 'phi3:3.8b',
    displayName: 'Phi-3 3.8B',
    size: '2.2GB',
    description: 'Phi-3 is a family of lightweight 3B (Mini) and 14B (Medium) state-of-the-art open models by Microsoft.',
    capabilities: ['Lightweight', 'Efficient', 'Fast'],
    status: 'available',
    warning: 'Stretch, may run slow',
    icon: 'zap'
  }
]

export default function ModelDownloadModal({ 
  isOpen, 
  onClose, 
  onModelSelect,
  installedModels = [],
  currentModel 
}: ModelDownloadModalProps) {
  const [models, setModels] = useState<ModelInfo[]>(AVAILABLE_MODELS)
  const [selectedTab, setSelectedTab] = useState<'recommended' | 'all' | 'installed'>('recommended')

  // Update model statuses based on installed models
  useEffect(() => {
    setModels(prevModels => 
      prevModels.map(model => ({
        ...model,
        status: installedModels.includes(model.id) ? 'installed' : 'available'
      }))
    )
  }, [installedModels])

  // Simulate model download
  const handleDownload = async (modelId: string) => {
    
    setModels(prevModels =>
      prevModels.map(model =>
        model.id === modelId 
          ? { ...model, status: 'downloading', downloadProgress: 0 }
          : model
      )
    )

    // Simulate download progress
    for (let progress = 0; progress <= 100; progress += 10) {
      await new Promise(resolve => setTimeout(resolve, 200))
      setModels(prevModels =>
        prevModels.map(model =>
          model.id === modelId 
            ? { ...model, downloadProgress: progress }
            : model
        )
      )
    }

    // Mark as installed
    setModels(prevModels =>
      prevModels.map(model =>
        model.id === modelId 
          ? { ...model, status: 'installed', downloadProgress: 100 }
          : model
      )
    )

    // Simulate adding to installed models
    if (onModelSelect) {
      setTimeout(() => onModelSelect(modelId), 500)
    }
  }

  const getModelIcon = (icon: string) => {
    switch (icon) {
      case 'brain': return <Cpu className="w-5 h-5" />
      case 'cpu': return <Cpu className="w-5 h-5" />
      case 'zap': return <Zap className="w-5 h-5" />
      case 'eye': return <HardDrive className="w-5 h-5" />
      default: return <HardDrive className="w-5 h-5" />
    }
  }

  const getStatusButton = (model: ModelInfo) => {
    switch (model.status) {
      case 'downloading':
        return (
          <div className="flex items-center space-x-2">
            <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${model.downloadProgress || 0}%` }}
              />
            </div>
            <span className="text-sm text-blue-600 dark:text-blue-400">
              {model.downloadProgress}%
            </span>
          </div>
        )
      case 'installed':
        return (
          <div className="flex items-center space-x-2">
            <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
            <span className="text-sm text-green-600 dark:text-green-400">Installed</span>
            {currentModel === model.id && (
              <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-1 rounded-full">
                Active
              </span>
            )}
          </div>
        )
      case 'error':
        return (
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
            <span className="text-sm text-red-600 dark:text-red-400">Error</span>
          </div>
        )
      default:
        return (
          <button
            onClick={() => handleDownload(model.id)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Download</span>
          </button>
        )
    }
  }

  const filteredModels = models.filter(model => {
    switch (selectedTab) {
      case 'recommended':
        return ['llama31-8b', 'phi3-3.8b'].includes(model.id)
      case 'installed':
        return model.status === 'installed'
      case 'all':
      default:
        return true
    }
  })

  const recommendedCount = models.filter(m => ['llama31-8b', 'phi3-3.8b'].includes(m.id)).length
  const allCount = models.length
  const installedCount = models.filter(m => m.status === 'installed').length

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Download Model</h2>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Based on a rough calculation, your device can run models up to 1.5b parameters.
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <X className="w-6 h-6 text-gray-500" />
            </button>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 dark:border-gray-700">
            <div className="flex space-x-8 px-6">
              <button
                onClick={() => setSelectedTab('recommended')}
                className={`py-4 border-b-2 font-medium text-sm transition-colors ${
                  selectedTab === 'recommended'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                Recommended ({recommendedCount})
              </button>
              <button
                onClick={() => setSelectedTab('all')}
                className={`py-4 border-b-2 font-medium text-sm transition-colors ${
                  selectedTab === 'all'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                All Models ({allCount})
              </button>
              <button
                onClick={() => setSelectedTab('installed')}
                className={`py-4 border-b-2 font-medium text-sm transition-colors ${
                  selectedTab === 'installed'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                Installed ({installedCount})
              </button>
            </div>
          </div>

          {/* Model List */}
          <div className="p-6 max-h-96 overflow-y-auto">
            <div className="grid gap-4">
              {filteredModels.map((model) => (
                <div
                  key={model.id}
                  className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-300 dark:hover:border-blue-600 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                        {getModelIcon(model.icon)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {model.displayName}
                          </h3>
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {model.size}
                          </span>
                          {model.warning && (
                            <div className="flex items-center space-x-1">
                              <AlertTriangle className="w-4 h-4 text-orange-500" />
                              <span className="text-sm text-orange-600 dark:text-orange-400">
                                {model.warning}
                              </span>
                            </div>
                          )}
                        </div>
                        
                        <p className="text-gray-600 dark:text-gray-400 text-sm mb-3 leading-relaxed">
                          {model.description}
                        </p>
                        
                        <div className="flex flex-wrap gap-2">
                          {model.capabilities.map((capability) => (
                            <span
                              key={capability}
                              className="px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs rounded-full"
                            >
                              {capability}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    <div className="ml-4 flex-shrink-0">
                      {getStatusButton(model)}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filteredModels.length === 0 && (
              <div className="text-center py-8">
                <HardDrive className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No models found
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {selectedTab === 'installed' 
                    ? 'You haven\'t installed any models yet.'
                    : 'No models match your current filter.'
                  }
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}