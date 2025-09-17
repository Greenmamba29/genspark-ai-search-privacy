import { useState, useCallback } from 'react';
import { Upload, X, File, CheckCircle2 } from 'lucide-react';
import { useDropzone } from 'react-dropzone';

interface UploadedFile {
  file: File;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error';
  progress: number;
  error?: string;
}

export default function FileUploadComponent() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: UploadedFile[] = acceptedFiles.map(file => ({
      file,
      status: 'pending',
      progress: 0,
    }));
    setUploadedFiles(prevFiles => [...prevFiles, ...newFiles]);
    newFiles.forEach(uploadFile);
  }, []);

  const uploadFile = async (uploadedFile: UploadedFile) => {
    const formData = new FormData();
    formData.append('files', uploadedFile.file);

    setUploadedFiles(prevFiles => prevFiles.map(f => 
      f.file === uploadedFile.file ? { ...f, status: 'uploading' } : f
    ));

    try {
      const response = await fetch('http://localhost:3001/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.json();

      setUploadedFiles(prevFiles => prevFiles.map(f => {
        if (f.file === uploadedFile.file) {
          const uploadResult = result.results.find((r: any) => r.fileName === f.file.name);
          if (uploadResult?.success) {
            return { ...f, status: 'completed', progress: 100 };
          } else {
            return { ...f, status: 'error', error: uploadResult?.message || 'Processing failed' };
          }
        }
        return f;
      }));

    } catch (error) {
      setUploadedFiles(prevFiles => prevFiles.map(f => 
        f.file === uploadedFile.file ? { ...f, status: 'error', error: (error as Error).message } : f
      ));
    }
  };

  const removeFile = (fileToRemove: File) => {
    setUploadedFiles(prevFiles => prevFiles.filter(f => f.file !== fileToRemove));
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  return (
    <div className="w-full max-w-2xl mx-auto my-8">
      <div
        {...getRootProps()}
        className={`p-8 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors duration-300 
          ${isDragActive 
            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30' 
            : 'border-secondary-300 dark:border-secondary-600 hover:border-primary-400 hover:bg-secondary-50 dark:hover:bg-secondary-800/20'}`}>
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center space-y-4 text-secondary-600 dark:text-secondary-400">
          <Upload className="w-12 h-12" />
          {isDragActive ? (
            <p className="text-lg font-semibold">Drop the files here ...</p>
          ) : (
            <p className="text-lg font-semibold">Drag & drop files here, or click to select</p>
          )}
          <p className="text-sm">Securely upload and process your documents for AI-powered search</p>
        </div>
      </div>

      {uploadedFiles.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-medium text-secondary-900 dark:text-secondary-100 mb-4">Uploads</h3>
          <div className="space-y-4">
            {uploadedFiles.map(({ file, status, progress }) => (
              <div key={file.name} className="card p-4 flex items-center space-x-4">
                <File className="w-8 h-8 text-secondary-500" />
                <div className="flex-1">
                  <p className="font-medium text-secondary-800 dark:text-secondary-200">{file.name}</p>
                  <p className="text-sm text-secondary-600 dark:text-secondary-400">
                    {(file.size / 1024).toFixed(2)} KB
                  </p>
                </div>
                <div className="w-1/3">
                  <div className="w-full bg-secondary-200 dark:bg-secondary-700 rounded-full h-2.5">
                    <div 
                      className={`h-2.5 rounded-full transition-all duration-300 
                        ${status === 'error' ? 'bg-red-500' : 'bg-primary-600'}`}
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                </div>
                <div className="w-24 text-center">
                  {status === 'uploading' && <p className="text-sm text-secondary-600 dark:text-secondary-400">Uploading...</p>}
                  {status === 'processing' && <p className="text-sm text-orange-500">Processing...</p>}
                  {status === 'completed' && <p className="text-sm text-green-500 flex items-center justify-center"><CheckCircle2 className="w-4 h-4 mr-1"/> Done</p>}
                  {status === 'error' && <p className="text-sm text-red-500">Error</p>}
                  {status === 'pending' && <p className="text-sm text-secondary-500">Pending</p>}
                </div>
                <button onClick={() => removeFile(file)} className="p-1 rounded-full hover:bg-secondary-100 dark:hover:bg-secondary-700">
                  <X className="w-5 h-5 text-secondary-500" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}