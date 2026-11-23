import React, { useState, useRef } from 'react';
import { UploadCloud, X, File, AlertCircle } from 'lucide-react';

interface FileUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (files: File[], onProgress: (percent: number) => void) => Promise<void>;
  currentPrefix: string;
}

export const FileUploadModal: React.FC<FileUploadModalProps> = ({
  isOpen,
  onClose,
  onUpload,
  currentPrefix,
}) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesArray = Array.from(e.dataTransfer.files);
      setSelectedFiles((prev) => [...prev, ...filesArray]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      setSelectedFiles((prev) => [...prev, ...filesArray]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleStartUpload = async () => {
    if (selectedFiles.length === 0) return;

    try {
      setUploading(true);
      setError(null);
      setProgress(0);
      await onUpload(selectedFiles, (percent) => setProgress(percent));
      setSelectedFiles([]);
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message || 'Gagal mengunggah file');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-800 font-semibold">
            <UploadCloud className="w-5 h-5 text-sky-600" />
            <span>Upload File ke S3</span>
          </div>
          <button
            onClick={onClose}
            disabled={uploading}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <span className="text-xs font-medium text-slate-500">Tujuan Upload:</span>
            <div className="text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-700 mt-1 truncate">
              {currentPrefix ? `/${currentPrefix}` : '/ (Root)'}
            </div>
          </div>

          {/* Dropzone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-sky-500 bg-sky-50/50 scale-[1.01]'
                : 'border-slate-200 hover:border-sky-400 hover:bg-slate-50/50'
            }`}
          >
            <input
              type="file"
              multiple
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="flex flex-col items-center justify-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center">
                <UploadCloud className="w-6 h-6" />
              </div>
              <div className="text-sm font-medium text-slate-700">
                Tarik & lepas file di sini, atau <span className="text-sky-600 underline">pilih file</span>
              </div>
              <p className="text-xs text-slate-400">Mendukung upload banyak file sekaligus</p>
            </div>
          </div>

          {/* Selected files preview */}
          {selectedFiles.length > 0 && (
            <div className="max-h-48 overflow-y-auto space-y-2 pr-1 border-t border-slate-100 pt-3">
              <div className="text-xs font-medium text-slate-500 flex justify-between">
                <span>File terpilih ({selectedFiles.length}):</span>
                <span>
                  Total: {formatSize(selectedFiles.reduce((acc, f) => acc + f.size, 0))}
                </span>
              </div>
              {selectedFiles.map((f, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100 text-xs"
                >
                  <div className="flex items-center gap-2 truncate mr-2">
                    <File className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <span className="font-medium text-slate-700 truncate">{f.name}</span>
                    <span className="text-slate-400 flex-shrink-0">({formatSize(f.size)})</span>
                  </div>
                  {!uploading && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(i);
                      }}
                      className="text-slate-400 hover:text-rose-500 p-0.5 rounded transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Progress bar */}
          {uploading && (
            <div className="space-y-1.5 pt-2">
              <div className="flex justify-between text-xs font-medium text-slate-600">
                <span>Mengunggah...</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-sky-600 transition-all duration-200"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 text-rose-700 rounded-xl text-xs border border-rose-200">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={uploading}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleStartUpload}
              disabled={uploading || selectedFiles.length === 0}
              className="px-4 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 active:bg-sky-800 rounded-xl transition-all shadow-sm shadow-sky-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <UploadCloud className="w-4 h-4" />
              <span>{uploading ? 'Sedang Mengunggah...' : `Unggah (${selectedFiles.length})`}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
