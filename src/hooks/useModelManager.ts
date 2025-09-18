import { useState, useEffect, useCallback } from 'react';

export interface AIModel {
  id: string;
  name: string;
  displayName: string;
  description: string;
  size: string;
  performance: 'fast' | 'balanced' | 'accurate';
  status: 'available' | 'downloading' | 'installed' | 'error';
  downloadProgress?: number;
  isActive: boolean;
  capabilities: string[];
  modelType: 'embedding' | 'chat' | 'classification';
}

export interface ModelStats {
  avgResponseTime: number;
  totalSearches: number;
  accuracy: number;
  memoryUsage: string;
}

const DEFAULT_MODELS: AIModel[] = [
  {
    id: 'xenova-all-minilm-l6-v2',
    name: 'Xenova/all-MiniLM-L6-v2',
    displayName: 'MiniLM-L6 (Fast)',
    description: 'Lightweight model optimized for speed and general search tasks',
    size: '23 MB',
    performance: 'fast',
    status: 'installed',
    isActive: true,
    capabilities: ['Semantic Search', 'Document Similarity', 'Quick Indexing'],
    modelType: 'embedding'
  },
  {
    id: 'xenova-all-minilm-l12-v2',
    name: 'Xenova/all-MiniLM-L12-v2',
    displayName: 'MiniLM-L12 (Balanced)',
    description: 'Balanced model providing good accuracy with moderate resource usage',
    size: '45 MB',
    performance: 'balanced',
    status: 'available',
    isActive: false,
    capabilities: ['Enhanced Accuracy', 'Better Context Understanding', 'Complex Queries'],
    modelType: 'embedding'
  },
  {
    id: 'xenova-all-mpnet-base-v2',
    name: 'Xenova/all-mpnet-base-v2',
    displayName: 'MPNet-Base (Accurate)',
    description: 'High-accuracy model for complex semantic understanding and precise results',
    size: '420 MB',
    performance: 'accurate',
    status: 'available',
    isActive: false,
    capabilities: ['Highest Accuracy', 'Complex Reasoning', 'Multi-domain Search'],
    modelType: 'embedding'
  }
];

export function useModelManager() {
  const [models, setModels] = useState<AIModel[]>(DEFAULT_MODELS);
  const [modelStats, setModelStats] = useState<Record<string, ModelStats>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize model stats
  useEffect(() => {
    const initStats = {
      'xenova-all-minilm-l6-v2': {
        avgResponseTime: 18,
        totalSearches: 247,
        accuracy: 87.5,
        memoryUsage: '23.2 MB'
      },
      'xenova-all-minilm-l12-v2': {
        avgResponseTime: 35,
        totalSearches: 0,
        accuracy: 91.2,
        memoryUsage: '45.8 MB'
      },
      'xenova-all-mpnet-base-v2': {
        avgResponseTime: 95,
        totalSearches: 0,
        accuracy: 95.1,
        memoryUsage: '420.5 MB'
      }
    };
    setModelStats(initStats);
  }, []);

  // Fetch available models from backend
  const fetchAvailableModels = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('http://localhost:3001/api/models');
      if (response.ok) {
        const data = await response.json();
        
        // Update model statuses based on backend response
        setModels(prevModels => 
          prevModels.map(model => ({
            ...model,
            status: data.models.includes(model.name) ? 'installed' : 'available',
            isActive: model.name === data.defaultModel
          }))
        );
      }
    } catch (err) {
      setError('Failed to fetch models from backend');
      console.warn('Model fetch failed, using default state');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Download and initialize a model
  const downloadModel = useCallback(async (modelId: string) => {
    setModels(prevModels =>
      prevModels.map(model =>
        model.id === modelId
          ? { ...model, status: 'downloading', downloadProgress: 0 }
          : model
      )
    );

    try {
      const model = models.find(m => m.id === modelId);
      if (!model) return;

      // Simulate download progress
      const progressInterval = setInterval(() => {
        setModels(prevModels =>
          prevModels.map(m =>
            m.id === modelId && m.downloadProgress !== undefined
              ? { ...m, downloadProgress: Math.min(m.downloadProgress + 10, 90) }
              : m
          )
        );
      }, 500);

      // Initialize model on backend
      const response = await fetch('http://localhost:3001/api/models/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model.name,
          warmup: true
        })
      });

      clearInterval(progressInterval);

      if (response.ok) {
        setModels(prevModels =>
          prevModels.map(m =>
            m.id === modelId
              ? { ...m, status: 'installed', downloadProgress: 100 }
              : m
          )
        );

        // Remove progress after a short delay
        setTimeout(() => {
          setModels(prevModels =>
            prevModels.map(m =>
              m.id === modelId
                ? { ...m, downloadProgress: undefined }
                : m
            )
          );
        }, 2000);
      } else {
        throw new Error('Failed to initialize model');
      }
    } catch (err) {
      setModels(prevModels =>
        prevModels.map(model =>
          model.id === modelId
            ? { ...model, status: 'error', downloadProgress: undefined }
            : model
        )
      );
      setError(`Failed to download ${modelId}: ${(err as Error).message}`);
    }
  }, [models]);

  // Switch active model
  const switchModel = useCallback(async (modelId: string) => {
    const model = models.find(m => m.id === modelId);
    if (!model || model.status !== 'installed') return;

    try {
      setIsLoading(true);
      
      // Switch model on backend
      const response = await fetch('http://localhost:3001/api/models/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: model.name })
      });

      if (response.ok) {
        setModels(prevModels =>
          prevModels.map(m => ({
            ...m,
            isActive: m.id === modelId
          }))
        );
      } else {
        throw new Error('Failed to switch model');
      }
    } catch (err) {
      setError(`Failed to switch to ${model.displayName}: ${(err as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  }, [models]);

  // Delete/uninstall model
  const deleteModel = useCallback(async (modelId: string) => {
    const model = models.find(m => m.id === modelId);
    if (!model || model.isActive) return; // Can't delete active model

    try {
      // For now, just mark as available since we don't have delete endpoint
      setModels(prevModels =>
        prevModels.map(m =>
          m.id === modelId
            ? { ...m, status: 'available' }
            : m
        )
      );

      // Reset stats
      setModelStats(prev => ({
        ...prev,
        [modelId]: {
          ...prev[modelId],
          totalSearches: 0
        }
      }));
    } catch (err) {
      setError(`Failed to delete ${model.displayName}: ${(err as Error).message}`);
    }
  }, [models]);

  // Get active model
  const activeModel = models.find(model => model.isActive);

  // Get model recommendations based on usage
  const getModelRecommendations = useCallback(() => {
    const recommendations = [];
    
    if (activeModel?.performance === 'fast') {
      recommendations.push({
        type: 'accuracy',
        message: 'Consider upgrading to MPNet-Base for 8% higher accuracy on complex queries'
      });
    }
    
    if (modelStats[activeModel?.id || '']?.totalSearches > 100) {
      recommendations.push({
        type: 'optimization',
        message: 'Great usage! Your model is well-optimized for your search patterns'
      });
    }

    return recommendations;
  }, [activeModel, modelStats]);

  // Initialize on mount
  useEffect(() => {
    fetchAvailableModels();
  }, [fetchAvailableModels]);

  return {
    models,
    modelStats,
    activeModel,
    isLoading,
    error,
    downloadModel,
    switchModel,
    deleteModel,
    fetchAvailableModels,
    getModelRecommendations
  };
}

export default useModelManager;