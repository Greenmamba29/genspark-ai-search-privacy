import { useState } from 'react';
import { Map, Activity, TrendingUp, Clock, ChevronRight, MapPin, BarChart3, PieChart } from 'lucide-react';

interface RightPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function RightPanel({ isOpen, onClose }: RightPanelProps) {
  const [activeTab, setActiveTab] = useState<'maps' | 'analytics' | 'activity' | 'insights'>('maps');

  const tabs = [
    {
      id: 'maps' as const,
      label: 'Maps',
      icon: Map,
      description: 'Geographic visualization'
    },
    {
      id: 'analytics' as const,
      label: 'Analytics',
      icon: BarChart3,
      description: 'Search analytics'
    },
    {
      id: 'activity' as const,
      label: 'Activity',
      icon: Activity,
      description: 'System activity'
    },
    {
      id: 'insights' as const,
      label: 'Insights',
      icon: TrendingUp,
      description: 'AI insights & trends'
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
      <div className="fixed right-0 top-0 h-full w-96 bg-white dark:bg-secondary-900 border-l border-secondary-200 dark:border-secondary-700 z-50 transform transition-transform duration-300 ease-out shadow-xl">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-secondary-200 dark:border-secondary-700">
          <h2 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100">
            Insights Hub
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-800 transition-colors duration-200"
          >
            <ChevronRight className="w-5 h-5 text-secondary-600 dark:text-secondary-400" />
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
          {activeTab === 'maps' && (
            <div className="p-4 space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100 mb-4">
                  📍 Geographic Data
                </h3>
                
                {/* Interactive Map Placeholder */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-6 border-2 border-dashed border-blue-200 dark:border-blue-700">
                  <div className="text-center">
                    <MapPin className="w-12 h-12 text-blue-500 dark:text-blue-400 mx-auto mb-4" />
                    <h4 className="text-lg font-medium text-secondary-900 dark:text-secondary-100 mb-2">
                      Interactive Map
                    </h4>
                    <p className="text-sm text-secondary-600 dark:text-secondary-400">
                      Geographic visualization of search results and file locations
                    </p>
                  </div>
                </div>

                {/* Location Summary */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-secondary-900 dark:text-secondary-100">
                    Recent Locations
                  </h4>
                  {[
                    { location: 'San Francisco, CA', files: 24, lastAccess: '2 hours ago' },
                    { location: 'New York, NY', files: 15, lastAccess: '1 day ago' },
                    { location: 'London, UK', files: 8, lastAccess: '3 days ago' }
                  ].map((item, index) => (
                    <div 
                      key={index}
                      className="flex items-center justify-between p-3 bg-secondary-50 dark:bg-secondary-800 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors duration-200"
                    >
                      <div>
                        <p className="text-sm font-medium text-secondary-900 dark:text-secondary-100">
                          {item.location}
                        </p>
                        <p className="text-xs text-secondary-600 dark:text-secondary-400">
                          {item.files} files • {item.lastAccess}
                        </p>
                      </div>
                      <MapPin className="w-4 h-4 text-primary-500" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="p-4 space-y-6">
              <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100">
                📊 Search Analytics
              </h3>
              
              {/* Analytics Cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <BarChart3 className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                    <span className="text-xs font-medium text-primary-700 dark:text-primary-300">
                      Searches Today
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-primary-900 dark:text-primary-100">
                    127
                  </p>
                </div>

                <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
                    <span className="text-xs font-medium text-green-700 dark:text-green-300">
                      Success Rate
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                    94%
                  </p>
                </div>
              </div>

              {/* File Type Distribution */}
              <div>
                <h4 className="text-sm font-semibold text-secondary-900 dark:text-secondary-100 mb-3">
                  File Type Distribution
                </h4>
                <div className="space-y-2">
                  {[
                    { type: 'PDF', count: 45, percentage: 35 },
                    { type: 'Images', count: 32, percentage: 25 },
                    { type: 'Documents', count: 28, percentage: 22 },
                    { type: 'Code', count: 23, percentage: 18 }
                  ].map((item, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <div className="flex-1">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-secondary-900 dark:text-secondary-100">
                            {item.type}
                          </span>
                          <span className="text-secondary-600 dark:text-secondary-400">
                            {item.count}
                          </span>
                        </div>
                        <div className="w-full bg-secondary-200 dark:bg-secondary-700 rounded-full h-2">
                          <div 
                            className="bg-primary-600 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${item.percentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="p-4 space-y-4">
              <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100">
                ⚡ System Activity
              </h3>
              
              {/* Real-time Activity Feed */}
              <div className="space-y-3">
                {[
                  { 
                    action: 'File processed', 
                    details: 'research-paper.pdf indexed', 
                    time: '30s ago',
                    type: 'success'
                  },
                  { 
                    action: 'Search executed', 
                    details: 'Query: climate change documents', 
                    time: '2m ago',
                    type: 'info'
                  },
                  { 
                    action: 'Privacy check', 
                    details: 'Confidential document blocked', 
                    time: '5m ago',
                    type: 'warning'
                  },
                  { 
                    action: 'Model switched', 
                    details: 'Changed to local processing', 
                    time: '10m ago',
                    type: 'info'
                  }
                ].map((activity, index) => (
                  <div 
                    key={index}
                    className="flex items-start space-x-3 p-3 bg-secondary-50 dark:bg-secondary-800 rounded-lg"
                  >
                    <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                      activity.type === 'success' ? 'bg-green-500' :
                      activity.type === 'warning' ? 'bg-yellow-500' :
                      'bg-blue-500'
                    }`} />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-secondary-900 dark:text-secondary-100">
                        {activity.action}
                      </p>
                      <p className="text-xs text-secondary-600 dark:text-secondary-400 mt-1">
                        {activity.details}
                      </p>
                      <div className="flex items-center space-x-2 mt-2">
                        <Clock className="w-3 h-3 text-secondary-400" />
                        <span className="text-xs text-secondary-500 dark:text-secondary-400">
                          {activity.time}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button className="w-full py-2 px-4 text-sm text-secondary-600 dark:text-secondary-400 hover:text-secondary-900 dark:hover:text-secondary-100 transition-colors duration-200">
                View Full Activity Log
              </button>
            </div>
          )}

          {activeTab === 'insights' && (
            <div className="p-4 space-y-6">
              <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-100">
                🧠 AI Insights
              </h3>
              
              {/* Key Insights */}
              <div className="space-y-4">
                <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg border-l-4 border-purple-500">
                  <div className="flex items-start space-x-3">
                    <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="text-sm font-semibold text-secondary-900 dark:text-secondary-100 mb-1">
                        Search Pattern Detected
                      </h4>
                      <p className="text-xs text-secondary-600 dark:text-secondary-400">
                        You frequently search for technical documentation on Tuesdays. Consider organizing these files in a dedicated workspace.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border-l-4 border-blue-500">
                  <div className="flex items-start space-x-3">
                    <PieChart className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="text-sm font-semibold text-secondary-900 dark:text-secondary-100 mb-1">
                        Privacy Optimization
                      </h4>
                      <p className="text-xs text-secondary-600 dark:text-secondary-400">
                        85% of your documents are processed locally. Consider enabling cloud processing for non-sensitive files to improve speed.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border-l-4 border-green-500">
                  <div className="flex items-start space-x-3">
                    <Activity className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="text-sm font-semibold text-secondary-900 dark:text-secondary-100 mb-1">
                        Productivity Insight
                      </h4>
                      <p className="text-xs text-secondary-600 dark:text-secondary-400">
                        Your search efficiency has improved by 23% this week. Most productive hours: 9-11 AM and 2-4 PM.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Trending Topics */}
              <div>
                <h4 className="text-sm font-semibold text-secondary-900 dark:text-secondary-100 mb-3">
                  Trending in Your Search
                </h4>
                <div className="flex flex-wrap gap-2">
                  {[
                    'Machine Learning',
                    'Privacy',
                    'Documentation',
                    'Research Papers',
                    'Code Reviews'
                  ].map((topic, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 text-xs bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}