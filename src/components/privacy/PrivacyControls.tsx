import React, { useState } from 'react';
import { Shield, Eye, EyeOff, Settings, AlertTriangle, Check, Info } from 'lucide-react';

export interface PrivacyLevel {
  id: 'public' | 'internal' | 'confidential' | 'restricted';
  name: string;
  description: string;
  color: string;
  icon: React.ComponentType<{ className?: string }>;
  features: {
    cloudProcessing: boolean;
    localOnly: boolean;
    encryption: boolean;
    auditLog: boolean;
  };
}

export const PRIVACY_LEVELS: PrivacyLevel[] = [
  {
    id: 'public',
    name: 'Public',
    description: 'Content that can be freely shared and processed anywhere',
    color: 'text-green-600 bg-green-100 dark:bg-green-900/30',
    icon: Eye,
    features: {
      cloudProcessing: true,
      localOnly: false,
      encryption: false,
      auditLog: false,
    },
  },
  {
    id: 'internal',
    name: 'Internal',
    description: 'Internal content for organization use only',
    color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30',
    icon: Shield,
    features: {
      cloudProcessing: true,
      localOnly: false,
      encryption: true,
      auditLog: true,
    },
  },
  {
    id: 'confidential',
    name: 'Confidential',
    description: 'Sensitive content requiring secure processing',
    color: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30',
    icon: AlertTriangle,
    features: {
      cloudProcessing: false,
      localOnly: true,
      encryption: true,
      auditLog: true,
    },
  },
  {
    id: 'restricted',
    name: 'Restricted',
    description: 'Highly sensitive content, local processing only',
    color: 'text-red-600 bg-red-100 dark:bg-red-900/30',
    icon: EyeOff,
    features: {
      cloudProcessing: false,
      localOnly: true,
      encryption: true,
      auditLog: true,
    },
  },
];

export interface ModelOption {
  id: string;
  name: string;
  type: 'local' | 'cloud' | 'hybrid';
  description: string;
  supportedPrivacyLevels: string[];
  performance: {
    speed: number; // 1-5 scale
    accuracy: number; // 1-5 scale
    resourceUsage: number; // 1-5 scale
  };
}

export const AVAILABLE_MODELS: ModelOption[] = [
  {
    id: 'local-ollama',
    name: 'Ollama (Local)',
    type: 'local',
    description: 'Local AI model for maximum privacy',
    supportedPrivacyLevels: ['public', 'internal', 'confidential', 'restricted'],
    performance: { speed: 3, accuracy: 4, resourceUsage: 4 },
  },
  {
    id: 'cloud-openai',
    name: 'OpenAI GPT-4',
    type: 'cloud',
    description: 'Advanced cloud AI with high accuracy',
    supportedPrivacyLevels: ['public', 'internal'],
    performance: { speed: 5, accuracy: 5, resourceUsage: 1 },
  },
  {
    id: 'hybrid-local-cloud',
    name: 'Smart Hybrid',
    type: 'hybrid',
    description: 'Automatically selects best model based on privacy',
    supportedPrivacyLevels: ['public', 'internal', 'confidential'],
    performance: { speed: 4, accuracy: 5, resourceUsage: 2 },
  },
];

interface PrivacyControlsProps {
  selectedPrivacyLevel?: string;
  selectedModel?: string;
  onPrivacyLevelChange: (level: string) => void;
  onModelChange: (model: string) => void;
}

export default function PrivacyControls({
  selectedPrivacyLevel = 'internal',
  selectedModel = 'hybrid-local-cloud',
  onPrivacyLevelChange,
  onModelChange,
}: PrivacyControlsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const currentPrivacyLevel = PRIVACY_LEVELS.find(level => level.id === selectedPrivacyLevel);
  const compatibleModels = AVAILABLE_MODELS.filter(model => 
    model.supportedPrivacyLevels.includes(selectedPrivacyLevel)
  );

  return (
    <div className="space-y-4">
      {/* Privacy Level Selection */}
      <div className="card p-6">
        <div 
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center space-x-3">
            <Shield className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            <div>
              <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100">
                Privacy Controls
              </h3>
              <p className="text-sm text-secondary-600 dark:text-secondary-400">
                Current: {currentPrivacyLevel?.name}
              </p>
            </div>
          </div>
          <div className={`transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
            <Settings className="w-5 h-5 text-secondary-400" />
          </div>
        </div>

        {isExpanded && (
          <div className="mt-6 space-y-6 animate-slide-down">
            {/* Privacy Level Grid */}
            <div>
              <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-3">
                Select Privacy Level
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PRIVACY_LEVELS.map((level) => {
                  const IconComponent = level.icon;
                  const isSelected = selectedPrivacyLevel === level.id;
                  
                  return (
                    <button
                      key={level.id}
                      onClick={() => onPrivacyLevelChange(level.id)}
                      className={`relative p-4 rounded-lg border-2 transition-all duration-200 text-left ${
                        isSelected
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                          : 'border-secondary-200 dark:border-secondary-700 hover:border-primary-300 dark:hover:border-primary-600'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className={`p-2 rounded-lg ${level.color}`}>
                          <IconComponent className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h4 className="font-medium text-secondary-900 dark:text-secondary-100">
                              {level.name}
                            </h4>
                            {isSelected && (
                              <Check className="w-4 h-4 text-primary-600" />
                            )}
                          </div>
                          <p className="text-sm text-secondary-600 dark:text-secondary-400 mt-1">
                            {level.description}
                          </p>
                        </div>
                      </div>
                      
                      {/* Privacy Level Features */}
                      <div className="mt-3 pt-3 border-t border-secondary-200 dark:border-secondary-700">
                        <div className="flex flex-wrap gap-2">
                          {level.features.cloudProcessing && (
                            <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full">
                              Cloud OK
                            </span>
                          )}
                          {level.features.localOnly && (
                            <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full">
                              Local Only
                            </span>
                          )}
                          {level.features.encryption && (
                            <span className="text-xs px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full">
                              Encrypted
                            </span>
                          )}
                          {level.features.auditLog && (
                            <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300 rounded-full">
                              Audit Log
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Model Selection */}
            <div>
              <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-3">
                AI Model Selection
              </label>
              <div className="space-y-3">
                {compatibleModels.map((model) => {
                  const isSelected = selectedModel === model.id;
                  
                  return (
                    <button
                      key={model.id}
                      onClick={() => onModelChange(model.id)}
                      className={`w-full p-4 rounded-lg border-2 transition-all duration-200 text-left ${
                        isSelected
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                          : 'border-secondary-200 dark:border-secondary-700 hover:border-primary-300 dark:hover:border-primary-600'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h4 className="font-medium text-secondary-900 dark:text-secondary-100">
                              {model.name}
                            </h4>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              model.type === 'local' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
                              model.type === 'cloud' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' :
                              'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                            }`}>
                              {model.type}
                            </span>
                            {isSelected && (
                              <Check className="w-4 h-4 text-primary-600" />
                            )}
                          </div>
                          <p className="text-sm text-secondary-600 dark:text-secondary-400 mt-1">
                            {model.description}
                          </p>
                          
                          {/* Performance Indicators */}
                          <div className="mt-3 grid grid-cols-3 gap-4">
                            <div>
                              <div className="text-xs text-secondary-500 mb-1">Speed</div>
                              <div className="flex space-x-1">
                                {[1, 2, 3, 4, 5].map(i => (
                                  <div
                                    key={i}
                                    className={`w-2 h-2 rounded-full ${
                                      i <= model.performance.speed
                                        ? 'bg-green-500'
                                        : 'bg-secondary-300 dark:bg-secondary-600'
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs text-secondary-500 mb-1">Accuracy</div>
                              <div className="flex space-x-1">
                                {[1, 2, 3, 4, 5].map(i => (
                                  <div
                                    key={i}
                                    className={`w-2 h-2 rounded-full ${
                                      i <= model.performance.accuracy
                                        ? 'bg-blue-500'
                                        : 'bg-secondary-300 dark:bg-secondary-600'
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs text-secondary-500 mb-1">Resources</div>
                              <div className="flex space-x-1">
                                {[1, 2, 3, 4, 5].map(i => (
                                  <div
                                    key={i}
                                    className={`w-2 h-2 rounded-full ${
                                      i <= model.performance.resourceUsage
                                        ? 'bg-orange-500'
                                        : 'bg-secondary-300 dark:bg-secondary-600'
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Privacy Notice */}
            {currentPrivacyLevel && (
              <div className={`p-4 rounded-lg ${currentPrivacyLevel.color}`}>
                <div className="flex items-start space-x-3">
                  <Info className="w-5 h-5 mt-0.5" />
                  <div>
                    <h4 className="font-medium mb-1">
                      {currentPrivacyLevel.name} Processing Rules
                    </h4>
                    <ul className="text-sm space-y-1">
                      <li>• {currentPrivacyLevel.features.cloudProcessing ? 'Cloud processing allowed' : 'Local processing only'}</li>
                      <li>• {currentPrivacyLevel.features.encryption ? 'Data encrypted in transit and at rest' : 'Standard processing'}</li>
                      <li>• {currentPrivacyLevel.features.auditLog ? 'All operations logged for audit' : 'Basic logging'}</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}