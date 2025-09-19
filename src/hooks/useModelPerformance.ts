import { useState, useEffect, useCallback } from 'react'

export interface ModelPerformanceMetrics {
  modelId: string
  averageResponseTime: number // in milliseconds
  totalQueries: number
  successRate: number // percentage
  memoryUsage: number // in MB
  lastUsed: Date
  performanceScore: number // 0-100
  isLoading: boolean
}

export interface PerformanceEntry {
  modelId: string
  responseTime: number
  success: boolean
  timestamp: Date
  queryType: 'search' | 'chat' | 'analysis'
  memoryUsage?: number
}

const LOCAL_STORAGE_KEY = 'model_performance_metrics'

export function useModelPerformance() {
  const [metrics, setMetrics] = useState<Record<string, ModelPerformanceMetrics>>({})
  const [isMonitoring, setIsMonitoring] = useState(false)

  // Load metrics from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        // Convert date strings back to Date objects
        Object.keys(parsed).forEach(modelId => {
          if (parsed[modelId].lastUsed) {
            parsed[modelId].lastUsed = new Date(parsed[modelId].lastUsed)
          }
        })
        setMetrics(parsed)
      }
    } catch (error) {
      console.error('Failed to load performance metrics:', error)
    }
  }, [])

  // Save metrics to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(metrics))
    } catch (error) {
      console.error('Failed to save performance metrics:', error)
    }
  }, [metrics])

  // Record a performance entry
  const recordPerformance = useCallback((entry: PerformanceEntry) => {
    setMetrics(prev => {
      const existing = prev[entry.modelId] || {
        modelId: entry.modelId,
        averageResponseTime: 0,
        totalQueries: 0,
        successRate: 100,
        memoryUsage: 0,
        lastUsed: new Date(),
        performanceScore: 50,
        isLoading: false
      }

      const newTotalQueries = existing.totalQueries + 1
      const successCount = Math.round(existing.successRate * existing.totalQueries / 100) + (entry.success ? 1 : 0)
      const newSuccessRate = (successCount / newTotalQueries) * 100
      
      // Calculate new average response time (weighted)
      const newAverageResponseTime = existing.totalQueries === 0 
        ? entry.responseTime
        : (existing.averageResponseTime * existing.totalQueries + entry.responseTime) / newTotalQueries

      // Update memory usage if provided
      const newMemoryUsage = entry.memoryUsage !== undefined 
        ? entry.memoryUsage 
        : existing.memoryUsage

      // Calculate performance score (0-100)
      // Based on response time (lower is better), success rate (higher is better), and memory efficiency
      const responseTimeScore = Math.max(0, 100 - (newAverageResponseTime / 100)) // 10s = 0 points, <1s = 90+ points
      const successRateScore = newSuccessRate
      const memoryEfficiencyScore = newMemoryUsage > 0 
        ? Math.max(0, 100 - (newMemoryUsage / 50)) // 5GB = 0 points, <500MB = 90+ points
        : 50

      const performanceScore = Math.round(
        (responseTimeScore * 0.4 + successRateScore * 0.4 + memoryEfficiencyScore * 0.2)
      )

      return {
        ...prev,
        [entry.modelId]: {
          modelId: entry.modelId,
          averageResponseTime: newAverageResponseTime,
          totalQueries: newTotalQueries,
          successRate: newSuccessRate,
          memoryUsage: newMemoryUsage,
          lastUsed: entry.timestamp,
          performanceScore,
          isLoading: false
        }
      }
    })
  }, [])

  // Start monitoring a model
  const startMonitoring = useCallback((modelId: string) => {
    setMetrics(prev => ({
      ...prev,
      [modelId]: {
        ...prev[modelId],
        isLoading: true
      }
    }))
    setIsMonitoring(true)
  }, [])

  // Stop monitoring
  const stopMonitoring = useCallback((modelId: string) => {
    setMetrics(prev => ({
      ...prev,
      [modelId]: {
        ...prev[modelId],
        isLoading: false
      }
    }))
    setIsMonitoring(false)
  }, [])

  // Get metrics for a specific model
  const getModelMetrics = useCallback((modelId: string): ModelPerformanceMetrics | null => {
    return metrics[modelId] || null
  }, [metrics])

  // Get performance comparison across models
  const getPerformanceComparison = useCallback(() => {
    const modelIds = Object.keys(metrics)
    if (modelIds.length === 0) return []

    return modelIds
      .map(modelId => metrics[modelId])
      .sort((a, b) => b.performanceScore - a.performanceScore)
  }, [metrics])

  // Get performance recommendations
  const getRecommendations = useCallback(() => {
    const recommendations: string[] = []
    const comparison = getPerformanceComparison()
    
    if (comparison.length === 0) {
      recommendations.push('No performance data available yet')
      return recommendations
    }

    const bestModel = comparison[0]
    const worstModel = comparison[comparison.length - 1]

    if (bestModel.performanceScore > 80) {
      recommendations.push(`${bestModel.modelId} is performing excellently (${bestModel.performanceScore}/100)`)
    }

    if (worstModel.performanceScore < 40) {
      recommendations.push(`Consider switching from ${worstModel.modelId} - low performance (${worstModel.performanceScore}/100)`)
    }

    // Memory usage recommendations
    const highMemoryModels = comparison.filter(m => m.memoryUsage > 2000) // 2GB
    if (highMemoryModels.length > 0) {
      recommendations.push(`High memory usage detected in ${highMemoryModels.map(m => m.modelId).join(', ')}`)
    }

    // Response time recommendations
    const slowModels = comparison.filter(m => m.averageResponseTime > 5000) // 5s
    if (slowModels.length > 0) {
      recommendations.push(`Slow response times in ${slowModels.map(m => m.modelId).join(', ')} - consider lighter models`)
    }

    return recommendations
  }, [getPerformanceComparison])

  // Clear all metrics
  const clearMetrics = useCallback(() => {
    setMetrics({})
    localStorage.removeItem(LOCAL_STORAGE_KEY)
  }, [])

  // Clear metrics for a specific model
  const clearModelMetrics = useCallback((modelId: string) => {
    setMetrics(prev => {
      const updated = { ...prev }
      delete updated[modelId]
      return updated
    })
  }, [])

  return {
    metrics,
    recordPerformance,
    startMonitoring,
    stopMonitoring,
    getModelMetrics,
    getPerformanceComparison,
    getRecommendations,
    clearMetrics,
    clearModelMetrics,
    isMonitoring
  }
}

// Helper function to measure execution time
export function measurePerformance<T>(
  fn: () => Promise<T>,
  onComplete: (entry: Omit<PerformanceEntry, 'timestamp'>) => void,
  modelId: string,
  queryType: 'search' | 'chat' | 'analysis' = 'search'
): Promise<T> {
  const startTime = performance.now()
  const startMemory = (performance as any).memory?.usedJSHeapSize || undefined

  return fn()
    .then(result => {
      const endTime = performance.now()
      const responseTime = endTime - startTime
      const endMemory = (performance as any).memory?.usedJSHeapSize || undefined
      const memoryUsage = startMemory && endMemory 
        ? Math.abs(endMemory - startMemory) / 1024 / 1024 // Convert to MB
        : undefined

      onComplete({
        modelId,
        responseTime,
        success: true,
        queryType,
        memoryUsage
      })

      return result
    })
    .catch(error => {
      const endTime = performance.now()
      const responseTime = endTime - startTime

      onComplete({
        modelId,
        responseTime,
        success: false,
        queryType
      })

      throw error
    })
}