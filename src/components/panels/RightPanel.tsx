import { useState, useMemo } from 'react';
import type { ElementType } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  TrendingUp,
  FileText,
  Brain,
  Lightbulb,
  Target,
  Zap,
  Search,
  Calendar,
  Activity,
  Cpu,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  Info,
  Settings,
  Monitor
} from 'lucide-react';
import { useSearchHistory } from '../../hooks/useSearchHistory';
import { useModels } from '../../contexts/ModelContext';
import ModelDownloadModal from '../ai/ModelDownloadModal';
import ModelSelector from '../ai/ModelSelector';

interface RightPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

interface InsightCard {
  id: string;
  title: string;
  description: string;
  icon: ElementType;
  color: string;
  priority: 'high' | 'medium' | 'low';
  actionable: boolean;
}

export default function RightPanel({ isOpen, onClose }: RightPanelProps) {
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'insights' | 'models' | 'settings'>('insights');
  const [showModelDownload, setShowModelDownload] = useState(false);
  
  const {
    analytics,
    searchStats,
    getPopularSearches
  } = useSearchHistory();

  const {
    state: modelState,
    downloadModel
  } = useModels();

  // Generate insights based on search patterns
  const insights = useMemo((): InsightCard[] => {
    const cards: InsightCard[] = [];

    // Search frequency insight
    if (searchStats.todayCount > 0) {
      cards.push({
        id: 'search-frequency',
        title: 'Search Activity Today',
        description: `You've performed ${searchStats.todayCount} searches today. ${
          searchStats.todayCount > 10 ? 'High activity day!' : 'Keep exploring!'
        }`,
        icon: Activity,
        color: 'text-blue-500',
        priority: 'medium',
        actionable: false
      });
    }

    // Popular query patterns
    const popularSearches = getPopularSearches(3);
    if (popularSearches.length > 0) {
      cards.push({
        id: 'popular-patterns',
        title: 'Your Search Patterns',
        description: `Most searched: "${popularSearches[0]?.query}". You seem interested in ${
          popularSearches[0]?.query.includes('document') ? 'document analysis' :
          popularSearches[0]?.query.includes('code') ? 'code exploration' :
          popularSearches[0]?.query.includes('data') ? 'data discovery' :
          'content discovery'
        }.`,
        icon: TrendingUp,
        color: 'text-purple-500',
        priority: 'high',
        actionable: true
      });
    }

    // Performance insight
    if (analytics.averageProcessingTime > 0) {
      const isGoodPerformance = analytics.averageProcessingTime < 100;
      cards.push({
        id: 'performance',
        title: 'Search Performance',
        description: `Average response time: ${Math.round(analytics.averageProcessingTime)}ms. ${
          isGoodPerformance ? 'Excellent performance!' : 'Consider optimizing for faster searches.'
        }`,
        icon: Zap,
        color: isGoodPerformance ? 'text-green-500' : 'text-orange-500',
        priority: isGoodPerformance ? 'low' : 'medium',
        actionable: !isGoodPerformance
      });
    }

    // Weekly trends
    if (searchStats.last7Days > 0) {
      const dailyAverage = Math.round(searchStats.last7Days / 7);
      cards.push({
        id: 'weekly-trend',
        title: 'Weekly Search Trend',
        description: `You're averaging ${dailyAverage} searches per day this week. ${
          dailyAverage > 5 ? 'Very active!' : 'Room to explore more!'
        }`,
        icon: Calendar,
        color: 'text-indigo-500',
        priority: 'low',
        actionable: dailyAverage < 3
      });
    }

    // AI enhancement suggestion
    cards.push({
      id: 'ai-enhancement',
      title: 'AI Enhancement Available',
      description: 'Gemini 2.5 Pro integration can provide smarter search suggestions and better results categorization.',
      icon: Brain,
      color: 'text-emerald-500',
      priority: 'high',
      actionable: true
    });

    // System health
    cards.push({
      id: 'system-health',
      title: 'System Status',
      description: 'All systems operational. Local AI models loaded and ready for offline search.',
      icon: CheckCircle,
      color: 'text-green-500',
      priority: 'low',
      actionable: false
    });

    return cards.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }, [analytics, searchStats, getPopularSearches]);

  // Quick actions based on insights
  const quickActions = useMemo(() => [
    {
      id: 'optimize-search',
      label: 'Optimize Search Workflow',
      description: 'Learn advanced search techniques',
      icon: Target,
      available: searchStats.total > 10
    },
    {
      id: 'export-insights',
      label: 'Export Analytics Report',
      description: 'Download your search insights',
      icon: FileText,
      available: true
    },
    {
      id: 'setup-ai',
      label: 'Setup AI Enhancement',
      description: 'Configure Gemini integration',
      icon: Brain,
      available: true
    }
  ], [searchStats]);

  const toggleCard = (cardId: string) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(cardId)) {
        newSet.delete(cardId);
      } else {
        newSet.add(cardId);
      }
      return newSet;
    });
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return AlertCircle;
      case 'medium': return Info;
      default: return CheckCircle;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-500 bg-red-50 dark:bg-red-900/20';
      case 'medium': return 'text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20';
      default: return 'text-green-500 bg-green-50 dark:bg-green-900/20';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: 384, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 384, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-96 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-l border-slate-200 dark:border-slate-700 z-50 overflow-hidden flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="sticky top-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700">
              <div className="p-6 pb-0">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Control Center</h2>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                      {activeTab === 'insights' && 'AI-powered search analytics'}
                      {activeTab === 'models' && 'Local AI model management'}
                      {activeTab === 'settings' && 'System configuration'}
                    </p>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-slate-500" />
                  </button>
                </div>
              </div>

              {/* Tabs */}
              <div className="px-6 pb-4">
                <div className="flex space-x-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                  <button
                    onClick={() => setActiveTab('insights')}
                    className={`flex-1 flex items-center justify-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                      activeTab === 'insights'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Lightbulb className="w-4 h-4" />
                    <span>Insights</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('models')}
                    className={`flex-1 flex items-center justify-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                      activeTab === 'models'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Brain className="w-4 h-4" />
                    <span>Models</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('settings')}
                    className={`flex-1 flex items-center justify-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                      activeTab === 'settings'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Settings className="w-4 h-4" />
                    <span>Settings</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-6 space-y-6">

                {/* Tab Content */}
                {activeTab === 'insights' && (
                  <>
                    {/* Quick Stats Overview */}
                <div className="grid grid-cols-2 gap-4">
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-800"
                  >
                    <div className="flex items-center justify-between">
                      <Search className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      <span className="text-xs font-medium text-blue-600 dark:text-blue-400">Total</span>
                    </div>
                    <p className="text-2xl font-bold text-blue-700 dark:text-blue-300 mt-2">
                      {searchStats.total}
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">searches</p>
                  </motion.div>

                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 }}
                    className="p-4 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800"
                  >
                    <div className="flex items-center justify-between">
                      <Zap className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Speed</span>
                    </div>
                    <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 mt-2">
                      {Math.round(analytics.averageProcessingTime)}
                    </p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">ms avg</p>
                  </motion.div>
                </div>

                {/* Smart Insights */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Lightbulb className="w-5 h-5 text-yellow-500" />
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                      Smart Insights
                    </h3>
                    <span className="px-2 py-1 text-xs bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 text-purple-700 dark:text-purple-300 rounded-full">
                      AI-Powered
                    </span>
                  </div>

                  <div className="space-y-3">
                    {insights.map((insight, index) => {
                      const IconComponent = insight.icon;
                      const PriorityIcon = getPriorityIcon(insight.priority);
                      const isExpanded = expandedCards.has(insight.id);

                      return (
                        <motion.div
                          key={insight.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden"
                        >
                          <button
                            onClick={() => toggleCard(insight.id)}
                            className="w-full p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors"
                          >
                            <div className="flex items-start space-x-3">
                              <div className="flex-shrink-0 mt-0.5">
                                <IconComponent className={`w-5 h-5 ${insight.color}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <h4 className="text-sm font-medium text-slate-900 dark:text-white truncate">
                                    {insight.title}
                                  </h4>
                                  <div className="flex items-center space-x-2 ml-2">
                                    <span className={`p-1 rounded-full ${getPriorityColor(insight.priority)}`}>
                                      <PriorityIcon className="w-3 h-3" />
                                    </span>
                                    {isExpanded ? (
                                      <ChevronDown className="w-4 h-4 text-slate-400" />
                                    ) : (
                                      <ChevronRight className="w-4 h-4 text-slate-400" />
                                    )}
                                  </div>
                                </div>
                                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
                                  {insight.description}
                                </p>
                              </div>
                            </div>
                          </button>

                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-4"
                              >
                                <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                                  {insight.description}
                                </p>
                                {insight.actionable && (
                                  <button className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium">
                                    Take Action →
                                  </button>
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center space-x-2">
                    <Target className="w-5 h-5 text-green-500" />
                    <span>Quick Actions</span>
                  </h3>

                  <div className="space-y-2">
                    {quickActions.filter(action => action.available).map((action, index) => {
                      const IconComponent = action.icon;
                      return (
                        <motion.button
                          key={action.id}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="w-full p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all group"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="p-2 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-lg group-hover:scale-105 transition-transform">
                              <IconComponent className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div className="flex-1 text-left">
                              <p className="text-sm font-medium text-slate-900 dark:text-white">
                                {action.label}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                {action.description}
                              </p>
                            </div>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
                  </>
                )}

                {/* Models Tab */}
                {activeTab === 'models' && (
                  <>
                    {/* AI Model Selector */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center space-x-2">
                        <Monitor className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        <span>AI Model Selection</span>
                      </h3>
                      
                      <ModelSelector 
                        compact={false} 
                        onModelDownloadClick={() => setShowModelDownload(true)}
                      />
                    </div>

                  </>
                )}

                {/* Settings Tab */}
                {activeTab === 'settings' && (
                  <div className="space-y-6">
                    <div className="bg-gradient-to-br from-slate-50 to-gray-50 dark:from-slate-800 dark:to-gray-800 rounded-xl p-4">
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3 flex items-center space-x-2">
                        <Settings className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                        <span>System Configuration</span>
                      </h3>
                      
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-700 rounded-lg">
                          <div>
                            <p className="font-medium text-slate-900 dark:text-white">Auto-model switching</p>
                            <p className="text-sm text-slate-600 dark:text-slate-400">Automatically select best model for query type</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                          </label>
                        </div>
                        
                        <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-700 rounded-lg">
                          <div>
                            <p className="font-medium text-slate-900 dark:text-white">Background processing</p>
                            <p className="text-sm text-slate-600 dark:text-slate-400">Keep models loaded for faster response</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" defaultChecked />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* System Info */}
                <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                  <div className="flex items-center space-x-2 mb-3">
                    <Cpu className="w-4 h-4 text-slate-500" />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      System Status
                    </span>
                  </div>
                  
                  <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
                    <div className="flex justify-between">
                      <span>Local AI:</span>
                      <span className="text-green-600 dark:text-green-400 font-medium">Ready</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Backend:</span>
                      <span className="text-green-600 dark:text-green-400 font-medium">Connected</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Processing:</span>
                      <span className="text-blue-600 dark:text-blue-400 font-medium">
                        {Math.round(analytics.averageProcessingTime)}ms avg
                      </span>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm border-t border-slate-200 dark:border-slate-700 p-4">
              <div className="text-center">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Insights updated in real-time
                </p>
                <div className="flex items-center justify-center space-x-1 mt-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                    Live Analytics
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
          
          {/* Model Download Modal */}
          <ModelDownloadModal
            isOpen={showModelDownload}
            onClose={() => setShowModelDownload(false)}
            onModelSelect={(modelId) => {
              downloadModel(modelId)
              setShowModelDownload(false)
            }}
            installedModels={modelState.installedModels}
            currentModel={modelState.currentModel}
          />
        </>
      )}
    </AnimatePresence>
  );
}
