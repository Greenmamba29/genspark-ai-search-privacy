import { useState, useRef, useEffect } from 'react'
import { X, Upload, FolderPlus, File, FileText, Image, Video, Music, Code, Archive, AlertCircle } from 'lucide-react'
import { useThemeContext } from '../../contexts/ThemeContext'

interface UploadFile {
  id: string
  file: File
  preview?: string
  error?: string
  status: 'pending' | 'uploading' | 'success' | 'error'
  progress?: number
  suggestedFolder?: string
}

interface QuickUploadModalProps {
  onClose: () => void
  onUpload: (files: File[]) => void
}

const getFileIcon = (type: string) => {
  if (type.startsWith('image/')) return Image
  if (type.startsWith('video/')) return Video
  if (type.startsWith('audio/')) return Music
  if (type.includes('pdf') || type.includes('document') || type.includes('text')) return FileText
  if (type.includes('zip') || type.includes('rar') || type.includes('tar')) return Archive
  if (type.includes('javascript') || type.includes('typescript') || type.includes('python')) return Code
  return File
}

const suggestFolder = (file: File): string => {
  const name = file.name.toLowerCase()
  const type = file.type.toLowerCase()
  
  if (type.startsWith('image/')) return 'Images'
  if (type.startsWith('video/')) return 'Videos'
  if (type.startsWith('audio/')) return 'Music'
  if (type.includes('pdf')) return 'Documents'
  if (name.includes('screenshot') || name.includes('screen-shot')) return 'Screenshots'
  if (name.includes('download')) return 'Downloads'
  if (name.includes('work') || name.includes('business')) return 'Work'
  if (name.includes('personal')) return 'Personal'
  
  return 'General'
}

export default function QuickUploadModal({ onClose, onUpload }: QuickUploadModalProps) {
  const { isDark: _isDark } = useThemeContext()
  const [files, setFiles] = useState<UploadFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [createFolders, setCreateFolders] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)

  // Auto-focus and handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    
    document.addEventListener('keydown', handleEscape)
    modalRef.current?.focus()
    
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClose])

  // Handle drag and drop
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const droppedFiles = Array.from(e.dataTransfer.files)
    processFiles(droppedFiles)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files)
      processFiles(selectedFiles)
    }
  }

  const processFiles = (newFiles: File[]) => {
    const uploadFiles: UploadFile[] = newFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      status: 'pending' as const,
      suggestedFolder: suggestFolder(file),
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
    }))

    setFiles(prev => [...prev, ...uploadFiles])
  }

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id))
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const handleUpload = () => {
    if (files.length === 0) return
    onUpload(files.map(f => f.file))
  }

  const totalSize = files.reduce((sum, f) => sum + f.file.size, 0)
  const folderGroups = files.reduce((groups, file) => {
    const folder = file.suggestedFolder || 'General'
    if (!groups[folder]) groups[folder] = []
    groups[folder].push(file)
    return groups
  }, {} as Record<string, UploadFile[]>)

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="flex items-center justify-center min-h-screen p-4">
        <div 
          ref={modalRef}
          className="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-secondary-800 rounded-2xl shadow-2xl border border-secondary-200 dark:border-secondary-700 overflow-hidden animate-scale-in"
          tabIndex={-1}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-secondary-200 dark:border-secondary-700">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
                <Upload className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-secondary-900 dark:text-secondary-100">
                  Quick Upload
                </h2>
                <p className="text-sm text-secondary-600 dark:text-secondary-400">
                  Upload files with intelligent folder organization
                </p>
              </div>
            </div>
            
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-secondary-500 hover:text-secondary-700 dark:hover:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors duration-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Upload Area */}
          <div className="p-6">
            <div
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 ${
                isDragging
                  ? 'border-primary-400 bg-primary-50 dark:bg-primary-900/20 scale-102'
                  : 'border-secondary-300 dark:border-secondary-600 hover:border-primary-400 hover:bg-secondary-50 dark:hover:bg-secondary-800/50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileSelect}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              
              <div className="space-y-4">
                <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center transition-all duration-300 ${
                  isDragging 
                    ? 'bg-primary-500 scale-110' 
                    : 'bg-secondary-200 dark:bg-secondary-700 group-hover:bg-primary-500'
                }`}>
                  <Upload className={`w-8 h-8 transition-all duration-300 ${
                    isDragging ? 'text-white animate-bounce' : 'text-secondary-600 dark:text-secondary-400'
                  }`} />
                </div>
                
                <div>
                  <p className="text-lg font-medium text-secondary-900 dark:text-secondary-100">
                    {isDragging ? 'Drop files here' : 'Drag & drop files here'}
                  </p>
                  <p className="text-sm text-secondary-600 dark:text-secondary-400">
                    or <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="text-primary-600 dark:text-primary-400 hover:underline font-medium"
                    >
                      browse files
                    </button>
                  </p>
                </div>
                
                <div className="flex items-center justify-center space-x-4 text-xs text-secondary-500 dark:text-secondary-400">
                  <span>PDF, DOCX, Images, Videos, Code</span>
                  <span>•</span>
                  <span>Max 100MB per file</span>
                </div>
              </div>
            </div>

            {/* Auto-folder option */}
            <div className="mt-4 flex items-center space-x-2">
              <input
                type="checkbox"
                id="createFolders"
                checked={createFolders}
                onChange={(e) => setCreateFolders(e.target.checked)}
                className="w-4 h-4 text-primary-600 border-secondary-300 dark:border-secondary-600 rounded focus:ring-primary-500"
              />
              <label htmlFor="createFolders" className="flex items-center space-x-2 text-sm text-secondary-700 dark:text-secondary-300">
                <FolderPlus className="w-4 h-4" />
                <span>Automatically organize files into folders</span>
              </label>
            </div>

            {/* File Preview */}
            {files.length > 0 && (
              <div className="mt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-secondary-900 dark:text-secondary-100">
                    Files to Upload ({files.length})
                  </h3>
                  <div className="text-sm text-secondary-600 dark:text-secondary-400">
                    Total: {formatFileSize(totalSize)}
                  </div>
                </div>

                <div className="max-h-64 overflow-y-auto space-y-2">
                  {Object.entries(folderGroups).map(([folder, folderFiles]) => (
                    <div key={folder} className="space-y-2">
                      {createFolders && (
                        <div className="flex items-center space-x-2 text-sm font-medium text-secondary-700 dark:text-secondary-300">
                          <FolderPlus className="w-4 h-4 text-primary-500" />
                          <span>📁 {folder}</span>
                        </div>
                      )}
                      
                      {folderFiles.map((uploadFile) => {
                        const FileIcon = getFileIcon(uploadFile.file.type)
                        return (
                          <div key={uploadFile.id} className="flex items-center space-x-3 p-3 bg-secondary-50 dark:bg-secondary-800/50 rounded-lg">
                            {uploadFile.preview ? (
                              <img
                                src={uploadFile.preview}
                                alt={uploadFile.file.name}
                                className="w-10 h-10 object-cover rounded"
                              />
                            ) : (
                              <div className="p-2 bg-secondary-200 dark:bg-secondary-700 rounded">
                                <FileIcon className="w-6 h-6 text-secondary-600 dark:text-secondary-400" />
                              </div>
                            )}
                            
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-secondary-900 dark:text-secondary-100 truncate">
                                {uploadFile.file.name}
                              </p>
                              <p className="text-xs text-secondary-600 dark:text-secondary-400">
                                {formatFileSize(uploadFile.file.size)} • {uploadFile.file.type}
                              </p>
                            </div>
                            
                            <button
                              onClick={() => removeFile(uploadFile.id)}
                              className="p-1 text-secondary-500 hover:text-red-500 transition-colors duration-200"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-secondary-200 dark:border-secondary-700 bg-secondary-50 dark:bg-secondary-800/50">
            <div className="flex items-center space-x-2 text-sm text-secondary-600 dark:text-secondary-400">
              <AlertCircle className="w-4 h-4" />
              <span>Files will be processed securely with privacy-aware AI</span>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={onClose}
                className="btn-secondary px-4 py-2"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={files.length === 0}
                className="btn-primary btn-glow px-6 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Upload {files.length > 0 && `(${files.length})`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}