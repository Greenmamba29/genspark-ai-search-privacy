import { useState } from 'react'
import { Grid, List, FolderPlus, Upload } from 'lucide-react'

export default function FileManager() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-secondary-900 dark:text-secondary-100">
            File Management
          </h1>
          <p className="text-secondary-600 dark:text-secondary-400 mt-1">
            Organize and manage your searchable content
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <button className="btn-secondary flex items-center space-x-2">
            <FolderPlus className="w-4 h-4" />
            <span>New Folder</span>
          </button>
          
          <button className="btn-primary flex items-center space-x-2">
            <Upload className="w-4 h-4" />
            <span>Upload Files</span>
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

      <div className="card p-8 text-center">
        <div className="max-w-md mx-auto">
          <Upload className="w-16 h-16 mx-auto text-secondary-400 mb-4" />
          <h3 className="text-xl font-semibold text-secondary-900 dark:text-secondary-100 mb-2">
            No files uploaded yet
          </h3>
          <p className="text-secondary-600 dark:text-secondary-400 mb-6">
            Start by uploading files to make them searchable with Grahmos AI
          </p>
          <button className="btn-primary">
            Choose Files to Upload
          </button>
        </div>
      </div>
    </div>
  )
}