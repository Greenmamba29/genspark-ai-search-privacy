import { useState } from 'react';
import { Settings, History, Puzzle, Zap, ChevronLeft, User, Database, Shield } from 'lucide-react';
import PrivacyControls from '../privacy/PrivacyControls';

interface LeftPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LeftPanel({ isOpen, onClose }: LeftPanelProps) {
  const [activeTab, setActiveTab] = useState<'settings' | 'history' | 'integrations' | 'vibe'>('settings');

  const tabs = [
    {
      id: 'settings' as const,
      label: 'Settings',
      icon: Settings,
      description: 'System configuration'
    },
    {
      id: 'vibe' as const,
      label: 'Vibe Manager',
      icon: Zap,
      description: 'AI model management'
    },
    {
      id: 'history' as const,
      label: 'History',
      icon: History,
      description: 'Search history & activity'
    },
    {
      id: 'integrations' as const,
      label: 'Integrations',
      icon: Puzzle,
      description: 'Connected services'
    }
  ];

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-20 backdrop-blur-sm z-40 lg:hidden"
        onClick={onClose}
      />
      
      {/* Panel */}
      <div className="fixed left-0 top-0 h-full w-96 bg-white dark:bg-secondary-900 border-r border-secondary-200 dark:border-secondary-700 z-50 transform transition-transform duration-300 ease-out shadow-xl">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-secondary-200 dark:border-secondary-700">
          <h2 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100">
            Control Center
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-800 transition-colors duration-200"
          >
            <ChevronLeft className="w-5 h-5 text-secondary-600 dark:text-secondary-400" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-secondary-200 dark:border-secondary-700">
          <nav className="flex overflow-x-auto">
            {tabs.map((tab) => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors duration-200 ${
                    activeTab === tab.id
                      ? 'border-primary-500 text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-transparent text-secondary-600 dark:text-secondary-400 hover:text-secondary-900 dark:hover:text-secondary-100 hover:bg-secondary-50 dark:hover:bg-secondary-800'
                  }`}
                >
                  <IconComponent className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'settings' && (
            <div className="p-4 space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100 mb-4">
                  General Settings
                </h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-secondary-900 dark:text-secondary-100">
                        Dark Mode
                      </label>
                      <p className="text-xs text-secondary-600 dark:text-secondary-400">
                        Toggle dark/light theme
                      </p>
                    </div>
                    <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-primary-600 transition-colors">
                      <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-6" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-secondary-900 dark:text-secondary-100">
                        Auto-sync
                      </label>
                      <p className="text-xs text-secondary-600 dark:text-secondary-400">
                        Automatically sync data
                      </p>
                    </div>
                    <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-secondary-300 dark:bg-secondary-600 transition-colors">
                      <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-1" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-secondary-900 dark:text-secondary-100">
                        Offline Mode
                      </label>
                      <p className="text-xs text-secondary-600 dark:text-secondary-400">
                        Work without internet
                      </p>
                    </div>
                    <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-primary-600 transition-colors">
                      <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-6" />
                    </button>
                  </div>
                </div>
              </div>

              {/* User Profile Section */}
              <div className="border-t border-secondary-200 dark:border-secondary-700 pt-6">
                <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100 mb-4">
                  User Profile
                </h3>
                <div className="flex items-center space-x-3 p-3 bg-secondary-50 dark:bg-secondary-800 rounded-lg">
                  <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-secondary-900 dark:text-secondary-100">
                      Anonymous User
                    </p>
                    <p className="text-xs text-secondary-600 dark:text-secondary-400">
                      Offline Mode Active
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'vibe' && (
            <div className="p-4">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100 mb-2">
                  🌟 Vibe Manager
                </h3>
                <p className="text-sm text-secondary-600 dark:text-secondary-400">
                  Manage AI models and privacy settings for optimal performance
                </p>
              </div>
              
              {/* Privacy Controls Integration */}
              <PrivacyControls 
                selectedPrivacyLevel="internal"
                selectedModel="hybrid-local-cloud"
                onPrivacyLevelChange={(level) => console.log('Privacy level changed:', level)}
                onModelChange={(model) => console.log('Model changed:', model)}
              />
            </div>
          )}

          {activeTab === 'history' && (
            <div className="p-4 space-y-4">
              <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100">
                Search History
              </h3>
              
              <div className="space-y-3">
                {[
                  { query: 'Find documents about climate change', time: '2 minutes ago', results: 12 },
                  { query: 'PDF documents from last month', time: '1 hour ago', results: 8 },
                  { query: 'Show me images with people', time: '3 hours ago', results: 24 },
                  { query: 'Code files containing authentication', time: 'Yesterday', results: 5 }
                ].map((item, index) => (
                  <div 
                    key={index}
                    className="p-3 bg-secondary-50 dark:bg-secondary-800 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors duration-200 cursor-pointer"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-secondary-900 dark:text-secondary-100">
                          {item.query}
                        </p>
                        <div className="flex items-center space-x-4 mt-1">
                          <span className="text-xs text-secondary-600 dark:text-secondary-400">
                            {item.time}
                          </span>
                          <span className="text-xs text-primary-600 dark:text-primary-400">
                            {item.results} results
                          </span>
                        </div>
                      </div>
                      <History className="w-4 h-4 text-secondary-400 flex-shrink-0 mt-0.5" />
                    </div>
                  </div>
                ))}
              </div>
              
              <button className="w-full py-2 px-4 text-sm text-secondary-600 dark:text-secondary-400 hover:text-secondary-900 dark:hover:text-secondary-100 transition-colors duration-200">
                Clear History
              </button>
            </div>
          )}

          {activeTab === 'integrations' && (
            <div className="p-4 space-y-4">
              <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100">
                Connected Services
              </h3>
              
              <div className="space-y-3">
                {[
                  { 
                    name: 'Local File System', 
                    status: 'connected', 
                    icon: Database, 
                    description: 'Access to local documents'
                  },
                  { 
                    name: 'Privacy Shield', 
                    status: 'active', 
                    icon: Shield, 
                    description: 'Document privacy classification'
                  },
                  { 
                    name: 'Ollama (Local AI)', 
                    status: 'available', 
                    icon: Zap, 
                    description: 'Local AI model processing'
                  }
                ].map((integration, index) => {
                  const IconComponent = integration.icon;
                  return (
                    <div 
                      key={index}
                      className="flex items-center space-x-3 p-3 border border-secondary-200 dark:border-secondary-700 rounded-lg"
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        integration.status === 'connected' ? 'bg-green-100 dark:bg-green-900/30' :
                        integration.status === 'active' ? 'bg-primary-100 dark:bg-primary-900/30' :
                        'bg-secondary-100 dark:bg-secondary-800'
                      }`}>
                        <IconComponent className={`w-5 h-5 ${
                          integration.status === 'connected' ? 'text-green-600 dark:text-green-400' :
                          integration.status === 'active' ? 'text-primary-600 dark:text-primary-400' :
                          'text-secondary-600 dark:text-secondary-400'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <p className="text-sm font-medium text-secondary-900 dark:text-secondary-100">
                            {integration.name}
                          </p>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            integration.status === 'connected' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
                            integration.status === 'active' ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300' :
                            'bg-secondary-100 dark:bg-secondary-800 text-secondary-600 dark:text-secondary-400'
                          }`}>
                            {integration.status}
                          </span>
                        </div>
                        <p className="text-xs text-secondary-600 dark:text-secondary-400 mt-1">
                          {integration.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}