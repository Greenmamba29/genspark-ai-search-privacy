import { useState } from 'react'
import { Grid, List, FolderPlus, Upload, Shield, Clock, FileText, Image, Video, Code } from 'lucide-react'
import PrivacyControls, { PRIVACY_LEVELS } from '../privacy/PrivacyControls'

// Mock file data with privacy classifications
const MOCK_FILES = [
  {
    id: '1',
    name: 'Financial Report Q4.pdf',
    size: 2456789,
    type: 'pdf',
    lastModified: new Date('2024-01-15'),
    privacyLevel: 'confidential',
    privacyConfidence: 0.95,
    tags: ['financial', 'report', 'sensitive'],
    processing: 'completed',
    modelUsed: 'local-ollama'
  },
  {
    id: '2', 
    name: 'Team Meeting Notes.docx',
    size: 45678,
    type: 'docx',
    lastModified: new Date('2024-01-14'),
    privacyLevel: 'internal',
    privacyConfidence: 0.88,
    tags: ['meeting', 'notes', 'internal'],
    processing: 'completed',
    modelUsed: 'hybrid-local-cloud'
  },
  {
    id: '3',
    name: 'Public Announcement.txt',
    size: 12345,
    type: 'txt',
    lastModified: new Date('2024-01-13'),
    privacyLevel: 'public',
    privacyConfidence: 0.99,
    tags: ['announcement', 'public'],
    processing: 'completed',
    modelUsed: 'cloud-openai'
  },
  {
    id: '4',
    name: 'Legal Contract.pdf',
    size: 1234567,
    type: 'pdf',
    lastModified: new Date('2024-01-12'),
    privacyLevel: 'restricted',
    privacyConfidence: 0.97,
    tags: ['legal', 'contract', 'confidential'],
    processing: 'processing',
    modelUsed: 'local-ollama'
  },
  {
    id: '5',
    name: 'source-code.js',
    size: 98765,
    type: 'js',
    lastModified: new Date('2024-01-11'),
    privacyLevel: 'internal',
    privacyConfidence: 0.82,
    tags: ['code', 'javascript', 'source'],
    processing: 'completed',
    modelUsed: 'hybrid-local-cloud'
  }
];

function getFileIcon(type: string) {
  switch (type) {
    case 'pdf':
    case 'docx':
    case 'txt':
      return FileText;
    case 'jpg':
    case 'png':
    case 'svg':
      return Image;
    case 'mp4':
    case 'avi':
      return Video;
    case 'js':
    case 'ts':
    case 'py':
      return Code;
    default:
      return FileText;
  }
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

export default function FileManager() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedPrivacyLevel, setSelectedPrivacyLevel] = useState('internal')
  const [selectedModel, setSelectedModel] = useState('hybrid-local-cloud')
  const [, setShowUploadModal] = useState(false)
  const [files] = useState(MOCK_FILES) // In real app, this would come from API

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-secondary-900 dark:text-secondary-100">
            Privacy-Aware File Management
          </h1>
          <p className="text-secondary-600 dark:text-secondary-400 mt-1">
            Organize files with automatic privacy classification and secure processing
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <button className="btn-secondary flex items-center space-x-2">
            <FolderPlus className="w-4 h-4" />
            <span>New Folder</span>
          </button>
          
          <button 
            onClick={() => setShowUploadModal(true)}
            className="btn-primary btn-glow flex items-center space-x-2"
          >
            <Upload className="w-4 h-4" />
            <span>Smart Upload</span>
          </button>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-colors duration-200 ${
                viewMode === 'grid'
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                  : 'text-secondary-500 dark:text-secondary-400 hover:bg-secondary-100 dark:hover:bg-secondary-800'
              }`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-colors duration-200 ${
                viewMode === 'list'
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                  : 'text-secondary-500 dark:text-secondary-400 hover:bg-secondary-100 dark:hover:bg-secondary-800'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Privacy Controls */}
      <PrivacyControls
        selectedPrivacyLevel={selectedPrivacyLevel}
        selectedModel={selectedModel}
        onPrivacyLevelChange={setSelectedPrivacyLevel}
        onModelChange={setSelectedModel}
      />

      {/* File Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {PRIVACY_LEVELS.map((level) => {
          const count = files.filter(f => f.privacyLevel === level.id).length;
          const IconComponent = level.icon;
          
          return (
            <div key={level.id} className="card p-4">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${level.color}`}>
                  <IconComponent className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-secondary-900 dark:text-secondary-100">
                    {count}
                  </div>
                  <div className="text-sm text-secondary-600 dark:text-secondary-400">
                    {level.name}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Files Display */}
      {files.length > 0 ? (
        <div className="space-y-4">
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {files.map((file) => {
                const FileIcon = getFileIcon(file.type);
                const privacyLevel = PRIVACY_LEVELS.find(l => l.id === file.privacyLevel);
                const PrivacyIcon = privacyLevel?.icon || Shield;
                
                return (
                  <div key={file.id} className="card p-4 hover:shadow-lg transition-shadow duration-200">
                    {/* File Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3 flex-1">
                        <div className="p-2 bg-secondary-100 dark:bg-secondary-800 rounded-lg">
                          <FileIcon className="w-5 h-5 text-secondary-600 dark:text-secondary-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-medium text-secondary-900 dark:text-secondary-100 truncate">
                            {file.name}
                          </h3>
                          <p className="text-xs text-secondary-600 dark:text-secondary-400">
                            {formatFileSize(file.size)} • {formatDate(file.lastModified)}
                          </p>
                        </div>
                      </div>
                      
                      {/* Privacy Badge */}
                      {privacyLevel && (
                        <div className={`p-1.5 rounded-lg ${privacyLevel.color}`}>
                          <PrivacyIcon className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                    
                    {/* Privacy Info */}
                    <div className="space-y-2 mb-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-secondary-600 dark:text-secondary-400">Privacy Level</span>
                        <span className={`font-medium ${privacyLevel?.color?.split(' ')[0]}`}>
                          {privacyLevel?.name}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-secondary-600 dark:text-secondary-400">Confidence</span>
                        <span className="font-medium text-secondary-900 dark:text-secondary-100">
                          {Math.round(file.privacyConfidence * 100)}%
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-secondary-600 dark:text-secondary-400">Model Used</span>
                        <span className="font-medium text-secondary-900 dark:text-secondary-100">
                          {file.modelUsed.replace('-', ' ')}
                        </span>
                      </div>
                    </div>
                    
                    {/* Processing Status */}
                    <div className={`flex items-center space-x-2 text-xs ${
                      file.processing === 'completed' 
                        ? 'text-green-600 dark:text-green-400' 
                        : 'text-orange-600 dark:text-orange-400'
                    }`}>
                      {file.processing === 'processing' ? (
                        <>
                          <Clock className="w-3 h-3 animate-spin" />
                          <span>Processing...</span>
                        </>
                      ) : (
                        <>
                          <Shield className="w-3 h-3" />
                          <span>Processed Securely</span>
                        </>
                      )}
                    </div>
                    
                    {/* Tags */}
                    <div className="mt-3 flex flex-wrap gap-1">
                      {file.tags.slice(0, 3).map((tag) => (
                        <span 
                          key={tag} 
                          className="text-xs px-2 py-1 bg-secondary-100 dark:bg-secondary-800 text-secondary-700 dark:text-secondary-300 rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                      {file.tags.length > 3 && (
                        <span className="text-xs px-2 py-1 bg-secondary-100 dark:bg-secondary-800 text-secondary-700 dark:text-secondary-300 rounded-full">
                          +{file.tags.length - 3}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* List View */
            <div className="card">
              <div className="divide-y divide-secondary-200 dark:divide-secondary-700">
                {files.map((file) => {
                  const FileIcon = getFileIcon(file.type);
                  const privacyLevel = PRIVACY_LEVELS.find(l => l.id === file.privacyLevel);
                  const PrivacyIcon = privacyLevel?.icon || Shield;
                  
                  return (
                    <div key={file.id} className="p-4 hover:bg-secondary-50 dark:hover:bg-secondary-800/50 transition-colors duration-200">
                      <div className="flex items-center space-x-4">
                        <div className="p-2 bg-secondary-100 dark:bg-secondary-800 rounded-lg">
                          <FileIcon className="w-5 h-5 text-secondary-600 dark:text-secondary-400" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-medium text-secondary-900 dark:text-secondary-100 truncate">
                            {file.name}
                          </h3>
                          <div className="flex items-center space-x-4 text-xs text-secondary-600 dark:text-secondary-400 mt-1">
                            <span>{formatFileSize(file.size)}</span>
                            <span>{formatDate(file.lastModified)}</span>
                            <span>Model: {file.modelUsed.replace('-', ' ')}</span>
                          </div>
                        </div>
                        
                        {/* Privacy Level */}
                        <div className="flex items-center space-x-2">
                          <div className={`p-1.5 rounded-lg ${privacyLevel?.color}`}>
                            <PrivacyIcon className="w-3 h-3" />
                          </div>
                          <div className="text-right">
                            <div className={`text-xs font-medium ${privacyLevel?.color?.split(' ')[0]}`}>
                              {privacyLevel?.name}
                            </div>
                            <div className="text-xs text-secondary-600 dark:text-secondary-400">
                              {Math.round(file.privacyConfidence * 100)}%
                            </div>
                          </div>
                        </div>
                        
                        {/* Processing Status */}
                        <div className={`text-xs flex items-center space-x-1 ${
                          file.processing === 'completed' 
                            ? 'text-green-600 dark:text-green-400' 
                            : 'text-orange-600 dark:text-orange-400'
                        }`}>
                          {file.processing === 'processing' ? (
                            <>
                              <Clock className="w-3 h-3 animate-spin" />
                              <span>Processing</span>
                            </>
                          ) : (
                            <>
                              <Shield className="w-3 h-3" />
                              <span>Secure</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="card p-8 text-center">
          <div className="max-w-md mx-auto">
            <Shield className="w-16 h-16 mx-auto text-secondary-400 mb-4" />
            <h3 className="text-xl font-semibold text-secondary-900 dark:text-secondary-100 mb-2">
              No files processed yet
            </h3>
            <p className="text-secondary-600 dark:text-secondary-400 mb-6">
              Upload files to see privacy classification and secure processing in action
            </p>
            <button 
              onClick={() => setShowUploadModal(true)}
              className="btn-primary"
            >
              Upload Your First File
            </button>
          </div>
        </div>
      )}
    </div>
  )
}