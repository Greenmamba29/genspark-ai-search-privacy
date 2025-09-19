// Device capability detection for AI model recommendations

export interface DeviceCapabilities {
  totalMemory: number // in GB
  availableMemory: number // in GB  
  estimatedVRAM: number // in GB
  deviceType: 'mobile' | 'tablet' | 'laptop' | 'desktop' | 'workstation'
  networkSpeed: 'slow' | 'medium' | 'fast'
  processingPower: 'low' | 'medium' | 'high' | 'very-high'
  recommendedModelSize: 'small' | 'medium' | 'large'
}

export interface ModelRequirements {
  minMemory: number // in GB
  recommendedMemory: number // in GB
  processingIntensity: 'low' | 'medium' | 'high' | 'very-high'
  diskSpace: number // in GB
  estimatedLoadTime: number // in seconds
}

// Model requirements database
export const MODEL_REQUIREMENTS: Record<string, ModelRequirements> = {
  'gpt-oss-20b': {
    minMemory: 12,
    recommendedMemory: 24,
    processingIntensity: 'very-high',
    diskSpace: 14,
    estimatedLoadTime: 30
  },
  'llama31-8b': {
    minMemory: 6,
    recommendedMemory: 12,
    processingIntensity: 'high',
    diskSpace: 4.9,
    estimatedLoadTime: 15
  },
  'llama3-8b': {
    minMemory: 6,
    recommendedMemory: 12,
    processingIntensity: 'high',
    diskSpace: 4.7,
    estimatedLoadTime: 15
  },
  'mistral-7b': {
    minMemory: 5,
    recommendedMemory: 10,
    processingIntensity: 'medium',
    diskSpace: 4.4,
    estimatedLoadTime: 12
  },
  'llava-7b': {
    minMemory: 6,
    recommendedMemory: 12,
    processingIntensity: 'high',
    diskSpace: 4.7,
    estimatedLoadTime: 15
  },
  'phi3-3.8b': {
    minMemory: 3,
    recommendedMemory: 6,
    processingIntensity: 'medium',
    diskSpace: 2.2,
    estimatedLoadTime: 8
  },
  'all-minilm-l6-v2': {
    minMemory: 0.5,
    recommendedMemory: 1,
    processingIntensity: 'low',
    diskSpace: 0.08,
    estimatedLoadTime: 2
  }
}

export async function detectDeviceCapabilities(): Promise<DeviceCapabilities> {
  const capabilities: DeviceCapabilities = {
    totalMemory: 8, // Default fallback
    availableMemory: 4,
    estimatedVRAM: 2,
    deviceType: 'laptop',
    networkSpeed: 'medium',
    processingPower: 'medium',
    recommendedModelSize: 'medium'
  }

  try {
    // Detect memory using navigator.deviceMemory (Chrome/Edge)
    if ('deviceMemory' in navigator) {
      capabilities.totalMemory = (navigator as any).deviceMemory
      capabilities.availableMemory = Math.max(1, capabilities.totalMemory * 0.7) // Estimate 70% available
    }

    // Detect device type based on screen size and user agent
    const screenWidth = window.screen.width
    const screenHeight = window.screen.height
    const userAgent = navigator.userAgent.toLowerCase()

    if (userAgent.includes('mobile') || screenWidth < 768) {
      capabilities.deviceType = 'mobile'
      capabilities.estimatedVRAM = 0.5
      capabilities.processingPower = 'low'
    } else if (userAgent.includes('tablet') || (screenWidth < 1024 && screenWidth >= 768)) {
      capabilities.deviceType = 'tablet'
      capabilities.estimatedVRAM = 1
      capabilities.processingPower = 'medium'
    } else if (screenWidth >= 2560 && screenHeight >= 1440) {
      capabilities.deviceType = 'workstation'
      capabilities.estimatedVRAM = 8
      capabilities.processingPower = 'very-high'
    } else if (screenWidth >= 1920) {
      capabilities.deviceType = 'desktop'
      capabilities.estimatedVRAM = 4
      capabilities.processingPower = 'high'
    } else {
      capabilities.deviceType = 'laptop'
      capabilities.estimatedVRAM = 2
      capabilities.processingPower = 'medium'
    }

    // Detect network speed using connection API
    if ('connection' in navigator) {
      const connection = (navigator as any).connection
      if (connection) {
        const effectiveType = connection.effectiveType
        if (effectiveType === '4g' || effectiveType === '5g') {
          capabilities.networkSpeed = 'fast'
        } else if (effectiveType === '3g') {
          capabilities.networkSpeed = 'medium'
        } else {
          capabilities.networkSpeed = 'slow'
        }
      }
    }

    // Enhanced processing power detection
    const hardwareConcurrency = navigator.hardwareConcurrency || 4
    if (hardwareConcurrency >= 12 && capabilities.totalMemory >= 16) {
      capabilities.processingPower = 'very-high'
    } else if (hardwareConcurrency >= 8 && capabilities.totalMemory >= 8) {
      capabilities.processingPower = 'high'
    } else if (hardwareConcurrency >= 4 && capabilities.totalMemory >= 4) {
      capabilities.processingPower = 'medium'
    } else {
      capabilities.processingPower = 'low'
    }

    // Determine recommended model size
    if (capabilities.totalMemory >= 16 && capabilities.processingPower === 'very-high') {
      capabilities.recommendedModelSize = 'large'
    } else if (capabilities.totalMemory >= 8 && capabilities.processingPower >= 'medium') {
      capabilities.recommendedModelSize = 'medium'
    } else {
      capabilities.recommendedModelSize = 'small'
    }

  } catch (error) {
    console.warn('Failed to detect device capabilities, using defaults:', error)
  }

  return capabilities
}

export function canRunModel(modelId: string, capabilities: DeviceCapabilities): {
  canRun: boolean
  performance: 'excellent' | 'good' | 'acceptable' | 'poor'
  warnings: string[]
  recommendations: string[]
} {
  const requirements = MODEL_REQUIREMENTS[modelId]
  if (!requirements) {
    return {
      canRun: false,
      performance: 'poor',
      warnings: ['Model requirements not found'],
      recommendations: ['Try a different model']
    }
  }

  const warnings: string[] = []
  const recommendations: string[] = []
  let canRun = true
  let performance: 'excellent' | 'good' | 'acceptable' | 'poor' = 'excellent'

  // Memory check
  if (capabilities.totalMemory < requirements.minMemory) {
    canRun = false
    warnings.push(`Insufficient memory (${capabilities.totalMemory}GB available, ${requirements.minMemory}GB required)`)
    recommendations.push('Consider upgrading RAM or choosing a smaller model')
  } else if (capabilities.totalMemory < requirements.recommendedMemory) {
    performance = 'acceptable'
    warnings.push('Model may run slowly due to limited memory')
    recommendations.push('Close other applications to free up memory')
  }

  // Processing power check  
  const processingCompatibility = {
    'low': ['low'],
    'medium': ['low', 'medium'], 
    'high': ['low', 'medium', 'high'],
    'very-high': ['low', 'medium', 'high', 'very-high']
  }

  if (!processingCompatibility[capabilities.processingPower].includes(requirements.processingIntensity)) {
    if (canRun) performance = 'poor'
    warnings.push('Model may be too demanding for your device')
    recommendations.push('Consider using a lighter model for better performance')
  }

  // Device type recommendations
  if (capabilities.deviceType === 'mobile' && requirements.processingIntensity === 'very-high') {
    performance = 'poor'
    warnings.push('Large models are not recommended on mobile devices')
    recommendations.push('Use a smaller, mobile-optimized model')
  }

  // Network speed considerations
  if (capabilities.networkSpeed === 'slow' && requirements.diskSpace > 2) {
    warnings.push('Large model download may take a long time on slow connection')
    recommendations.push('Download on a faster connection or choose a smaller model')
  }

  // Performance scoring
  if (capabilities.totalMemory >= requirements.recommendedMemory * 1.5 && 
      capabilities.processingPower === 'very-high') {
    performance = 'excellent'
  } else if (capabilities.totalMemory >= requirements.recommendedMemory &&
             capabilities.processingPower === 'high') {
    performance = 'good'
  } else if (canRun && performance !== 'poor') {
    performance = 'acceptable'
  }

  return {
    canRun,
    performance,
    warnings,
    recommendations
  }
}

export function getRecommendedModels(capabilities: DeviceCapabilities): string[] {
  const recommendations: string[] = []

  // Always recommend the lightweight option
  recommendations.push('all-minilm-l6-v2')

  if (capabilities.totalMemory >= 3 && capabilities.processingPower !== 'low') {
    recommendations.push('phi3-3.8b')
  }

  if (capabilities.totalMemory >= 5 && capabilities.processingPower === 'medium' || 
      capabilities.processingPower === 'high' || capabilities.processingPower === 'very-high') {
    recommendations.push('mistral-7b')
  }

  if (capabilities.totalMemory >= 6 && capabilities.processingPower === 'high' || 
      capabilities.processingPower === 'very-high') {
    recommendations.push('llama31-8b')
    recommendations.push('llama3-8b')
  }

  if (capabilities.totalMemory >= 12 && capabilities.processingPower === 'very-high') {
    recommendations.push('gpt-oss-20b')
  }

  return recommendations
}

export function formatDeviceInfo(capabilities: DeviceCapabilities): string {
  return `${capabilities.deviceType} with ${capabilities.totalMemory}GB RAM, ${capabilities.processingPower} processing power`
}