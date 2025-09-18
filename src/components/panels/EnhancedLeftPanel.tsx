import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, ChevronRight, BarChart3, Clock, Zap, Brain, Cpu,
  Search, TrendingUp, Activity, Eye, Settings, 
  Download, Trash2
} from 'lucide-react'

interface EnhancedLeftPanelProps {
  isOpen: boolean
  onClose: () => void
}

interface AnalyticsData {
  totalSearches: number
  avgResponseTime: number
  topQueries: Array<{ query: string; count: number }>
  recentActivity: Array<{ query: string; timestamp: number; results: number }>
  modelPerformance: Array<{ model: string; avgTime: number; usage: number }>
}

export default function EnhancedLeftPanel({ isOpen, onClose }: EnhancedLeftPanelProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['analytics', 'recent'])
  )
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h')

  // Mock analytics data - replace with actual data from your service
  const [analyticsData] = useState<AnalyticsData>({
    totalSearches: 247,
    avgResponseTime: 89,
    topQueries: [
      { query: 'machine learning algorithms', count: 34 },
      { query: 'neural networks', count: 28 },
      { query: 'vector embeddings', count: 23 },
      { query: 'semantic search', count: 19 },
      { query: 'AI documentation', count: 15 }
    ],
    recentActivity: [
      { query: 'deep learning frameworks', timestamp: Date.now() - 1000 * 60 * 5, results: 12 },
      { query: 'transformer models', timestamp: Date.now() - 1000 * 60 * 15, results: 8 },
      { query: 'GPT architecture', timestamp: Date.now() - 1000 * 60 * 30, results: 15 },
      { query: 'attention mechanisms', timestamp: Date.now() - 1000 * 60 * 45, results: 6 }
    ],
    modelPerformance: [
      { model: 'all-MiniLM-L6-v2', avgTime: 89, usage: 78 },
      { model: 'all-mpnet-base-v2', avgTime: 124, usage: 22 }
    ]
  })

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev)
      if (newSet.has(section)) {
        newSet.delete(section)
      } else {
        newSet.add(section)
      }
      return newSet
    })
  }

  const formatTime = (timestamp: number) => {
    const diff = Date.now() - timestamp
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    return `${minutes}m ago`
  }

  const SectionHeader = ({ 
    id, 
    title, 
    icon: Icon, 
    count 
  }: { 
    id: string
    title: string
    icon: React.ComponentType<{ className?: string }>
    count?: number 
  }) => (
    <button
      onClick={() => toggleSection(id)}
      className="flex items-center justify-between w-full p-3 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200 group"
    >
      <div className="flex items-center space-x-3">
        <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500/10 to-purple-500/10 group-hover:from-blue-500/20 group-hover:to-purple-500/20">
          <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="text-left">
          <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
          {count !== undefined && (
            <p className="text-xs text-gray-500 dark:text-gray-400">{count} items</p>
          )}
        </div>
      </div>
      <motion.div
        animate={{ rotate: expandedSections.has(id) ? 90 : 0 }}
        transition={{ duration: 0.2 }}
      >
        <ChevronRight className="w-5 h-5 text-gray-400" />
      </motion.div>
    </button>
  )

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: -400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -400, opacity: 0 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="fixed left-0 top-0 h-full w-96 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-r border-gray-200 dark:border-gray-700 z-50 overflow-hidden flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg">
                    <BarChart3 className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Analytics Hub</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Grahmos AI Insights</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white/50 dark:hover:bg-gray-800/50 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Time Range Selector */}
              <div className="flex space-x-2">
                {(['1h', '24h', '7d', '30d'] as const).map((range) => (
                  <button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    className={`px-3 py-1 text-xs rounded-full transition-all duration-200 ${
                      timeRange === range
                        ? 'bg-blue-500 text-white shadow-lg'
                        : 'bg-white/60 dark:bg-gray-800/60 text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-800'
                    }`}
                  >
                    {range}
                  </button>
                ))}
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-4 space-y-4">

                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <motion.div 
                    whileHover={{ scale: 1.02 }}
                    className="p-4 rounded-xl bg-gradient-to-r from-blue-500/10 to-blue-600/10 border border-blue-200 dark:border-blue-800"
                  >
                    <div className="flex items-center space-x-2">
                      <Search className="w-5 h-5 text-blue-600" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Searches</span>
                    </div>
                    <p className="text-2xl font-bold text-blue-600 mt-1">{analyticsData.totalSearches}</p>
                  </motion.div>

                  <motion.div 
                    whileHover={{ scale: 1.02 }}
                    className="p-4 rounded-xl bg-gradient-to-r from-green-500/10 to-green-600/10 border border-green-200 dark:border-green-800"
                  >
                    <div className="flex items-center space-x-2">
                      <Zap className="w-5 h-5 text-green-600" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Avg Time</span>
                    </div>
                    <p className="text-2xl font-bold text-green-600 mt-1">{analyticsData.avgResponseTime}ms</p>
                  </motion.div>
                </div>

                {/* Analytics Section */}
                <div className="space-y-3">
                  <SectionHeader 
                    id="analytics" 
                    title="Performance Analytics" 
                    icon={Activity}
                  />
                  
                  <AnimatePresence>
                    {expandedSections.has('analytics') && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-3 pl-6"
                      >
                        {/* Model Performance */}
                        <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                          <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center">
                            <Brain className="w-4 h-4 mr-2" />
                            Model Performance
                          </h4>
                          <div className="space-y-2">
                            {analyticsData.modelPerformance.map((model) => (
                              <div key={model.model} className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <Cpu className="w-3 h-3 text-blue-500" />
                                  <span className="text-sm text-gray-700 dark:text-gray-300">
                                    {model.model.split('/').pop()}
                                  </span>
                                </div>
                                <div className="flex items-center space-x-3">
                                  <span className="text-xs text-gray-500">{model.avgTime}ms</span>
                                  <div className="w-12 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                    <div 
                                      className="h-2 bg-blue-500 rounded-full"
                                      style={{ width: `${model.usage}%` }}
                                    />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Top Queries */}
                <div className="space-y-3">
                  <SectionHeader 
                    id="queries" 
                    title="Popular Searches" 
                    icon={TrendingUp}
                    count={analyticsData.topQueries.length}
                  />
                  
                  <AnimatePresence>
                    {expandedSections.has('queries') && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-2 pl-6"
                      >
                        {analyticsData.topQueries.map((query, index) => (
                          <motion.div
                            key={query.query}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer group"
                          >
                            <div className="flex items-center space-x-3">
                              <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                                  {index + 1}
                                </span>
                              </div>
                              <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                                {query.query}
                              </span>
                            </div>
                            <span className="text-xs text-gray-500 bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded-full">
                              {query.count}
                            </span>
                          </motion.div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Recent Activity */}
                <div className="space-y-3">
                  <SectionHeader 
                    id="recent" 
                    title="Recent Activity" 
                    icon={Clock}
                    count={analyticsData.recentActivity.length}
                  />
                  
                  <AnimatePresence>
                    {expandedSections.has('recent') && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-2 pl-6"
                      >
                        {analyticsData.recentActivity.map((activity, index) => (
                          <motion.div
                            key={activity.timestamp}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer group"
                          >
                            <div>
                              <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                                {activity.query}
                              </span>
                              <div className="flex items-center space-x-2 mt-1">
                                <span className="text-xs text-gray-500">{formatTime(activity.timestamp)}</span>
                                <span className="text-xs text-blue-500">{activity.results} results</span>
                              </div>
                            </div>
                            <Eye className="w-4 h-4 text-gray-400 group-hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-all" />
                          </motion.div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Quick Actions */}
                <div className="space-y-3">
                  <SectionHeader 
                    id="actions" 
                    title="Quick Actions" 
                    icon={Settings}
                  />
                  
                  <AnimatePresence>
                    {expandedSections.has('actions') && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-2 pl-6"
                      >
                        <button className="w-full flex items-center space-x-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all group">
                          <Download className="w-4 h-4 text-gray-500 group-hover:text-blue-500" />
                          <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                            Export Search Data
                          </span>
                        </button>
                        
                        <button className="w-full flex items-center space-x-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all group">
                          <Trash2 className="w-4 h-4 text-gray-500 group-hover:text-red-500" />
                          <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-red-600 dark:group-hover:text-red-400">
                            Clear History
                          </span>
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>Powered by Grahmos AI</span>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span>Live</span>
                </div>
              </div>
            </div>

          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}