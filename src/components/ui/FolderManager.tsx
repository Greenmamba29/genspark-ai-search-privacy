import { useState, useEffect } from 'react'
import { Folder, FolderPlus, FolderOpen, ChevronRight, ChevronDown, Edit3, Trash2, Check, X } from 'lucide-react'

interface FolderNode {
  id: string
  name: string
  path: string
  parentId?: string
  children: FolderNode[]
  isExpanded: boolean
  fileCount: number
  totalSize: number
  lastModified: Date
  isEditing?: boolean
}

interface FolderManagerProps {
  onFolderSelect?: (folder: FolderNode) => void
  onFolderCreate?: (parentId: string | null, name: string) => void
  onFolderRename?: (folderId: string, newName: string) => void
  onFolderDelete?: (folderId: string) => void
  selectedFolderId?: string
  className?: string
}

// Mock folder structure
const INITIAL_FOLDERS: FolderNode[] = [
  {
    id: 'root',
    name: 'Files',
    path: '/',
    children: [
      {
        id: 'documents',
        name: 'Documents',
        path: '/Documents',
        parentId: 'root',
        children: [
          {
            id: 'work',
            name: 'Work',
            path: '/Documents/Work',
            parentId: 'documents',
            children: [],
            isExpanded: false,
            fileCount: 12,
            totalSize: 45600000,
            lastModified: new Date('2024-01-15')
          },
          {
            id: 'personal',
            name: 'Personal',
            path: '/Documents/Personal',
            parentId: 'documents',
            children: [],
            isExpanded: false,
            fileCount: 8,
            totalSize: 23400000,
            lastModified: new Date('2024-01-14')
          }
        ],
        isExpanded: true,
        fileCount: 20,
        totalSize: 69000000,
        lastModified: new Date('2024-01-15')
      },
      {
        id: 'images',
        name: 'Images',
        path: '/Images',
        parentId: 'root',
        children: [
          {
            id: 'screenshots',
            name: 'Screenshots',
            path: '/Images/Screenshots',
            parentId: 'images',
            children: [],
            isExpanded: false,
            fileCount: 25,
            totalSize: 127000000,
            lastModified: new Date('2024-01-13')
          }
        ],
        isExpanded: false,
        fileCount: 35,
        totalSize: 189000000,
        lastModified: new Date('2024-01-13')
      },
      {
        id: 'videos',
        name: 'Videos',
        path: '/Videos',
        parentId: 'root',
        children: [],
        isExpanded: false,
        fileCount: 5,
        totalSize: 512000000,
        lastModified: new Date('2024-01-12')
      }
    ],
    isExpanded: true,
    fileCount: 60,
    totalSize: 770000000,
    lastModified: new Date('2024-01-15')
  }
]

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

const formatDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  })
}

export default function FolderManager({
  onFolderSelect,
  onFolderCreate,
  onFolderRename,
  onFolderDelete,
  selectedFolderId,
  className = ''
}: FolderManagerProps) {
  const [folders, setFolders] = useState<FolderNode[]>(INITIAL_FOLDERS)
  const [showCreateForm, setShowCreateForm] = useState<string | null>(null)
  const [newFolderName, setNewFolderName] = useState('')
  const [editingFolder, setEditingFolder] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  // Auto-create suggested folders based on file uploads
  useEffect(() => {
    const suggestedFolders = ['Downloads', 'Music', 'Code', 'Archive']
    
    // Check if we need to create any missing suggested folders
    const existingNames = new Set()
    const collectNames = (nodes: FolderNode[]) => {
      nodes.forEach(node => {
        existingNames.add(node.name)
        collectNames(node.children)
      })
    }
    collectNames(folders)
    
    const missingFolders = suggestedFolders.filter(name => !existingNames.has(name))
    
    if (missingFolders.length > 0) {
      const newFolders = missingFolders.map((name, index) => ({
        id: `auto-${Date.now()}-${index}`,
        name,
        path: `/${name}`,
        parentId: 'root',
        children: [],
        isExpanded: false,
        fileCount: 0,
        totalSize: 0,
        lastModified: new Date()
      }))
      
      setFolders(prev => {
        const updated = [...prev]
        const rootFolder = updated.find(f => f.id === 'root')
        if (rootFolder) {
          rootFolder.children.push(...newFolders)
        }
        return updated
      })
    }
  }, [folders])

  const toggleFolder = (folderId: string) => {
    setFolders(prev => updateFolderInTree(prev, folderId, folder => ({
      ...folder,
      isExpanded: !folder.isExpanded
    })))
  }

  const updateFolderInTree = (nodes: FolderNode[], targetId: string, updateFn: (folder: FolderNode) => FolderNode): FolderNode[] => {
    return nodes.map(node => {
      if (node.id === targetId) {
        return updateFn(node)
      }
      return {
        ...node,
        children: updateFolderInTree(node.children, targetId, updateFn)
      }
    })
  }

  const findFolder = (nodes: FolderNode[], targetId: string): FolderNode | null => {
    for (const node of nodes) {
      if (node.id === targetId) return node
      const found = findFolder(node.children, targetId)
      if (found) return found
    }
    return null
  }

  const createFolder = (parentId: string | null) => {
    if (!newFolderName.trim()) return
    
    const newFolder: FolderNode = {
      id: `folder-${Date.now()}`,
      name: newFolderName.trim(),
      path: parentId ? `${findFolder(folders, parentId)?.path}/${newFolderName.trim()}` : `/${newFolderName.trim()}`,
      parentId: parentId || undefined,
      children: [],
      isExpanded: false,
      fileCount: 0,
      totalSize: 0,
      lastModified: new Date()
    }

    if (parentId) {
      setFolders(prev => updateFolderInTree(prev, parentId, folder => ({
        ...folder,
        children: [...folder.children, newFolder],
        isExpanded: true
      })))
    } else {
      setFolders(prev => [...prev, newFolder])
    }

    onFolderCreate?.(parentId, newFolderName.trim())
    setNewFolderName('')
    setShowCreateForm(null)
  }

  const startRename = (folder: FolderNode) => {
    setEditingFolder(folder.id)
    setEditName(folder.name)
  }

  const confirmRename = () => {
    if (!editName.trim() || !editingFolder) return
    
    setFolders(prev => updateFolderInTree(prev, editingFolder, folder => ({
      ...folder,
      name: editName.trim()
    })))
    
    onFolderRename?.(editingFolder, editName.trim())
    setEditingFolder(null)
    setEditName('')
  }

  const deleteFolder = (folderId: string) => {
    if (window.confirm('Are you sure you want to delete this folder and all its contents?')) {
      const removeFolderFromTree = (nodes: FolderNode[], targetId: string): FolderNode[] => {
        return nodes.filter(node => node.id !== targetId).map(node => ({
          ...node,
          children: removeFolderFromTree(node.children, targetId)
        }))
      }
      
      setFolders(prev => removeFolderFromTree(prev, folderId))
      onFolderDelete?.(folderId)
    }
  }

  const renderFolder = (folder: FolderNode, level: number = 0) => {
    const isSelected = selectedFolderId === folder.id
    const hasChildren = folder.children.length > 0
    const isEditing = editingFolder === folder.id
    
    return (
      <div key={folder.id} className="select-none">
        {/* Folder Row */}
        <div
          className={`group flex items-center space-x-2 px-2 py-2 rounded-lg transition-all duration-200 hover:bg-secondary-50 dark:hover:bg-secondary-800/50 ${
            isSelected ? 'bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800' : ''
          }`}
          style={{ paddingLeft: `${level * 16 + 8}px` }}
        >
          {/* Expand/Collapse Button */}
          {hasChildren ? (
            <button
              onClick={() => toggleFolder(folder.id)}
              className="p-0.5 hover:bg-secondary-200 dark:hover:bg-secondary-700 rounded transition-colors duration-200"
            >
              {folder.isExpanded ? (
                <ChevronDown className="w-4 h-4 text-secondary-500 dark:text-secondary-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-secondary-500 dark:text-secondary-400" />
              )}
            </button>
          ) : (
            <div className="w-5" />
          )}

          {/* Folder Icon */}
          <div className="flex-shrink-0">
            {folder.isExpanded && hasChildren ? (
              <FolderOpen className="w-4 h-4 text-primary-500" />
            ) : (
              <Folder className="w-4 h-4 text-primary-500" />
            )}
          </div>

          {/* Folder Name */}
          {isEditing ? (
            <div className="flex items-center space-x-2 flex-1">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') confirmRename()
                  if (e.key === 'Escape') setEditingFolder(null)
                }}
                className="flex-1 px-2 py-1 text-sm border border-secondary-300 dark:border-secondary-600 rounded bg-white dark:bg-secondary-800 focus:ring-1 focus:ring-primary-500 focus:border-transparent"
                autoFocus
              />
              <button
                onClick={confirmRename}
                className="p-1 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/20 rounded"
              >
                <Check className="w-3 h-3" />
              </button>
              <button
                onClick={() => setEditingFolder(null)}
                className="p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20 rounded"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <div
              onClick={() => onFolderSelect?.(folder)}
              className="flex-1 cursor-pointer flex items-center justify-between"
            >
              <div>
                <div className="text-sm font-medium text-secondary-900 dark:text-secondary-100">
                  {folder.name}
                </div>
                <div className="text-xs text-secondary-500 dark:text-secondary-400">
                  {folder.fileCount} files • {formatFileSize(folder.totalSize)} • {formatDate(folder.lastModified)}
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowCreateForm(folder.id)
                  }}
                  className="p-1 text-secondary-500 hover:text-primary-600 hover:bg-primary-100 dark:hover:bg-primary-900/20 rounded"
                  title="Create subfolder"
                >
                  <FolderPlus className="w-3 h-3" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    startRename(folder)
                  }}
                  className="p-1 text-secondary-500 hover:text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded"
                  title="Rename folder"
                >
                  <Edit3 className="w-3 h-3" />
                </button>
                {folder.id !== 'root' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteFolder(folder.id)
                    }}
                    className="p-1 text-secondary-500 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20 rounded"
                    title="Delete folder"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Create Folder Form */}
        {showCreateForm === folder.id && (
          <div className="mt-2 mb-2" style={{ paddingLeft: `${(level + 1) * 16 + 8}px` }}>
            <div className="flex items-center space-x-2">
              <FolderPlus className="w-4 h-4 text-primary-500" />
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') createFolder(folder.id)
                  if (e.key === 'Escape') setShowCreateForm(null)
                }}
                placeholder="New folder name..."
                className="flex-1 px-2 py-1 text-sm border border-secondary-300 dark:border-secondary-600 rounded bg-white dark:bg-secondary-800 focus:ring-1 focus:ring-primary-500 focus:border-transparent"
                autoFocus
              />
              <button
                onClick={() => createFolder(folder.id)}
                className="p-1 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/20 rounded"
              >
                <Check className="w-3 h-3" />
              </button>
              <button
                onClick={() => setShowCreateForm(null)}
                className="p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20 rounded"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        {/* Children */}
        {folder.isExpanded && folder.children.map(child => 
          renderFolder(child, level + 1)
        )}
      </div>
    )
  }

  return (
    <div className={`h-full flex flex-col ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-secondary-200 dark:border-secondary-700">
        <div className="flex items-center space-x-2">
          <Folder className="w-5 h-5 text-primary-500" />
          <h3 className="text-lg font-medium text-secondary-900 dark:text-secondary-100">
            Folders
          </h3>
        </div>
        <button
          onClick={() => setShowCreateForm('root')}
          className="p-2 text-secondary-500 hover:text-primary-600 hover:bg-primary-100 dark:hover:bg-primary-900/20 rounded-lg transition-colors duration-200"
          title="Create folder"
        >
          <FolderPlus className="w-4 h-4" />
        </button>
      </div>

      {/* Folder Tree */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {folders.map(folder => renderFolder(folder))}
        
        {/* Root Create Form */}
        {showCreateForm === 'root' && (
          <div className="mt-2 px-2">
            <div className="flex items-center space-x-2">
              <FolderPlus className="w-4 h-4 text-primary-500" />
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') createFolder(null)
                  if (e.key === 'Escape') setShowCreateForm(null)
                }}
                placeholder="New folder name..."
                className="flex-1 px-2 py-1 text-sm border border-secondary-300 dark:border-secondary-600 rounded bg-white dark:bg-secondary-800 focus:ring-1 focus:ring-primary-500 focus:border-transparent"
                autoFocus
              />
              <button
                onClick={() => createFolder(null)}
                className="p-1 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/20 rounded"
              >
                <Check className="w-3 h-3" />
              </button>
              <button
                onClick={() => setShowCreateForm(null)}
                className="p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20 rounded"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}