import { createContext, useContext, useReducer, useEffect, ReactNode } from 'react'

export interface ModelInfo {
  id: string
  name: string
  displayName: string
  size: string
  description: string
  capabilities: string[]
  status: 'available' | 'downloading' | 'installed' | 'error'
  downloadProgress?: number
  warning?: string
  icon: string
}

interface ModelState {
  installedModels: string[]
  currentModel: string
  downloadingModels: Set<string>
  models: ModelInfo[]
  isLoading: boolean
}

type ModelAction = 
  | { type: 'SET_CURRENT_MODEL'; payload: string }
  | { type: 'ADD_INSTALLED_MODEL'; payload: string }
  | { type: 'REMOVE_INSTALLED_MODEL'; payload: string }
  | { type: 'START_DOWNLOAD'; payload: string }
  | { type: 'FINISH_DOWNLOAD'; payload: string }
  | { type: 'UPDATE_DOWNLOAD_PROGRESS'; payload: { modelId: string; progress: number } }
  | { type: 'SET_MODEL_STATUS'; payload: { modelId: string; status: ModelInfo['status'] } }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'INITIALIZE_MODELS'; payload: ModelInfo[] }

interface ModelContextType {
  state: ModelState
  setCurrentModel: (modelId: string) => void
  downloadModel: (modelId: string) => Promise<void>
  isModelInstalled: (modelId: string) => boolean
  getCurrentModelInfo: () => ModelInfo | undefined
  getInstalledModels: () => ModelInfo[]
  getAllModels: () => ModelInfo[]
}

const ModelContext = createContext<ModelContextType | undefined>(undefined)

const AVAILABLE_MODELS: ModelInfo[] = [
  {
    id: 'all-minilm-l6-v2',
    name: 'all-MiniLM-L6-v2',
    displayName: 'MiniLM L6 v2 (Default)',
    size: '80MB',
    description: 'Lightweight sentence transformer model for semantic similarity and search. Currently active for search operations.',
    capabilities: ['Semantic Search', 'Fast', 'Lightweight'],
    status: 'installed', // Default installed and active model
    icon: 'zap'
  },
  {
    id: 'gpt-oss-20b',
    name: 'gpt-oss:20b',
    displayName: 'GPT-OSS 20B',
    size: '14GB',
    description: "OpenAI's open-weight models designed for powerful reasoning, agentic tasks, and versatile developer use cases.",
    capabilities: ['Reasoning', 'Code Generation', 'Analysis'],
    status: 'available',
    warning: 'Requires significant RAM, may run slow',
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
    warning: 'Requires significant RAM',
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
    warning: 'Requires significant RAM',
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
    warning: 'Requires significant RAM',
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
    warning: 'Requires significant RAM',
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
    warning: 'Moderate RAM requirements',
    icon: 'zap'
  }
]

const LOCAL_STORAGE_KEY = 'genspark_model_preferences'

function modelReducer(state: ModelState, action: ModelAction): ModelState {
  switch (action.type) {
    case 'SET_CURRENT_MODEL':
      return {
        ...state,
        currentModel: action.payload
      }
    
    case 'ADD_INSTALLED_MODEL':
      return {
        ...state,
        installedModels: [...state.installedModels, action.payload],
        models: state.models.map(model =>
          model.id === action.payload 
            ? { ...model, status: 'installed' as const }
            : model
        )
      }
    
    case 'REMOVE_INSTALLED_MODEL':
      return {
        ...state,
        installedModels: state.installedModels.filter(id => id !== action.payload),
        models: state.models.map(model =>
          model.id === action.payload 
            ? { ...model, status: 'available' as const }
            : model
        )
      }
    
    case 'START_DOWNLOAD':
      const newDownloading = new Set(state.downloadingModels)
      newDownloading.add(action.payload)
      return {
        ...state,
        downloadingModels: newDownloading,
        models: state.models.map(model =>
          model.id === action.payload 
            ? { ...model, status: 'downloading' as const, downloadProgress: 0 }
            : model
        )
      }
    
    case 'FINISH_DOWNLOAD':
      const finishedDownloading = new Set(state.downloadingModels)
      finishedDownloading.delete(action.payload)
      return {
        ...state,
        downloadingModels: finishedDownloading,
        installedModels: [...state.installedModels, action.payload],
        models: state.models.map(model =>
          model.id === action.payload 
            ? { ...model, status: 'installed' as const, downloadProgress: 100 }
            : model
        )
      }
    
    case 'UPDATE_DOWNLOAD_PROGRESS':
      return {
        ...state,
        models: state.models.map(model =>
          model.id === action.payload.modelId 
            ? { ...model, downloadProgress: action.payload.progress }
            : model
        )
      }
    
    case 'SET_MODEL_STATUS':
      return {
        ...state,
        models: state.models.map(model =>
          model.id === action.payload.modelId 
            ? { ...model, status: action.payload.status }
            : model
        )
      }
    
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload
      }
    
    case 'INITIALIZE_MODELS':
      return {
        ...state,
        models: action.payload
      }
    
    default:
      return state
  }
}

export function ModelProvider({ children }: { children: ReactNode }) {
  const initialState: ModelState = {
    installedModels: ['all-minilm-l6-v2'], // Default lightweight model is installed
    currentModel: 'all-minilm-l6-v2', // Default active model
    downloadingModels: new Set(),
    models: AVAILABLE_MODELS,
    isLoading: false
  }

  const [state, dispatch] = useReducer(modelReducer, initialState)

  // Load saved preferences from localStorage on initial mount only
  useEffect(() => {
    const loadPreferences = () => {
      try {
        const saved = localStorage.getItem(LOCAL_STORAGE_KEY)
        if (saved) {
          const preferences = JSON.parse(saved)
          
          // Load installed models first
          if (preferences.installedModels && Array.isArray(preferences.installedModels)) {
            preferences.installedModels.forEach((modelId: string) => {
              // Only add if it's not already in the initial state
              if (!initialState.installedModels.includes(modelId)) {
                dispatch({ type: 'ADD_INSTALLED_MODEL', payload: modelId })
              }
            })
          }
          
          // Then set current model if it exists and is installed
          if (preferences.currentModel) {
            const allInstalled = [...initialState.installedModels, ...(preferences.installedModels || [])]
            if (allInstalled.includes(preferences.currentModel)) {
              dispatch({ type: 'SET_CURRENT_MODEL', payload: preferences.currentModel })
            }
          }
        }
      } catch (error) {
        console.error('Failed to load model preferences:', error)
        // Clear corrupted data
        try {
          localStorage.removeItem(LOCAL_STORAGE_KEY)
        } catch (clearError) {
          console.error('Failed to clear corrupted preferences:', clearError)
        }
      }
    }
    
    loadPreferences()
  }, []) // Empty dependency array - only run on mount

  // Save preferences to localStorage with debouncing
  useEffect(() => {
    const savePreferences = () => {
      try {
        const preferences = {
          currentModel: state.currentModel,
          installedModels: state.installedModels
        }
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(preferences))
      } catch (error) {
        console.error('Failed to save model preferences:', error)
        // Could implement fallback storage or user notification here
      }
    }
    
    // Debounce saves to avoid excessive localStorage writes
    const timeoutId = setTimeout(savePreferences, 100)
    return () => clearTimeout(timeoutId)
  }, [state.currentModel, state.installedModels])

  const setCurrentModel = (modelId: string) => {
    if (state.installedModels.includes(modelId)) {
      dispatch({ type: 'SET_CURRENT_MODEL', payload: modelId })
    }
  }

  const downloadModel = async (modelId: string): Promise<void> => {
    if (state.installedModels.includes(modelId) || state.downloadingModels.has(modelId)) {
      console.warn(`Model ${modelId} is already installed or downloading`)
      return
    }

    const model = state.models.find(m => m.id === modelId)
    if (!model) {
      console.error(`Model ${modelId} not found`)
      return
    }

    dispatch({ type: 'START_DOWNLOAD', payload: modelId })

    try {
      console.log(`Starting download of ${model.displayName}...`)
      
      // Simulate more realistic download progress with variable timing
      const progressSteps = [0, 15, 30, 45, 60, 75, 90, 100]
      for (const progress of progressSteps) {
        // Variable delay based on model size (larger models = slower download)
        const delay = progress === 100 ? 500 : 
                     model.size.includes('GB') ? 300 + Math.random() * 400 : 
                     150 + Math.random() * 200
                     
        await new Promise(resolve => setTimeout(resolve, delay))
        
        // Check if download was cancelled during delay
        if (!state.downloadingModels.has(modelId)) {
          return // Download was cancelled
        }
        
        dispatch({ 
          type: 'UPDATE_DOWNLOAD_PROGRESS', 
          payload: { modelId, progress } 
        })
      }

      // Mark as completed
      dispatch({ type: 'FINISH_DOWNLOAD', payload: modelId })
      console.log(`Successfully downloaded ${model.displayName}`)
      
      // Auto-select downloaded model if it's the first one or default is still active
      if (state.currentModel === 'all-minilm-l6-v2' && modelId !== 'all-minilm-l6-v2') {
        dispatch({ type: 'SET_CURRENT_MODEL', payload: modelId })
        console.log(`Switched to new model: ${model.displayName}`)
      }

    } catch (error) {
      console.error(`Failed to download model ${model.displayName}:`, error)
      dispatch({ 
        type: 'SET_MODEL_STATUS', 
        payload: { modelId, status: 'error' } 
      })
      
      // Remove from downloading set on error
      const newDownloading = new Set(state.downloadingModels)
      newDownloading.delete(modelId)
      dispatch({ type: 'START_DOWNLOAD', payload: '' }) // This will clean up the set
    }
  }

  const isModelInstalled = (modelId: string) => {
    return state.installedModels.includes(modelId)
  }

  const getCurrentModelInfo = () => {
    return state.models.find(model => model.id === state.currentModel)
  }

  const getInstalledModels = () => {
    return state.models.filter(model => state.installedModels.includes(model.id))
  }

  const getAllModels = () => {
    return state.models
  }

  const contextValue: ModelContextType = {
    state,
    setCurrentModel,
    downloadModel,
    isModelInstalled,
    getCurrentModelInfo,
    getInstalledModels,
    getAllModels
  }

  return (
    <ModelContext.Provider value={contextValue}>
      {children}
    </ModelContext.Provider>
  )
}

export function useModels() {
  const context = useContext(ModelContext)
  if (context === undefined) {
    throw new Error('useModels must be used within a ModelProvider')
  }
  return context
}

export default ModelContext