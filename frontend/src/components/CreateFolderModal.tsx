import React, { useState } from 'react';
import { FolderPlus, X } from 'lucide-react';

interface CreateFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (folderName: string) => Promise<void>;
  currentPrefix: string;
}

export const CreateFolderModal: React.FC<CreateFolderModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  currentPrefix,
}) => {
  const [folderName, setFolderName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderName.trim()) {
      setError('Nama folder tidak boleh kosong');
      return;
    }
    if (folderName.includes('/') || folderName.includes('\\')) {
      setError("Nama folder tidak boleh mengandung karakter '/' atau '\\'");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await onSubmit(folderName.trim());
      setFolderName('');
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message || 'Gagal membuat folder');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-800 font-semibold">
            <FolderPlus className="w-5 h-5 text-sky-600" />
            <span>Buat Folder Baru</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Lokasi Folder
            </label>
            <div className="text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-700 truncate">
              {currentPrefix ? `/${currentPrefix}` : '/ (Root)'}
            </div>
          </div>

          <div>
            <label htmlFor="folderName" className="block text-xs font-medium text-slate-700 mb-1">
              Nama Folder
            </label>
            <input
              id="folderName"
              type="text"
              autoFocus
              value={folderName}
              onChange={(e) => {
                setFolderName(e.target.value);
                if (error) setError(null);
              }}
              placeholder="misal: dokumen-keuangan"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-sm transition-all"
            />
            {error && <p className="text-xs text-rose-600 mt-1.5">{error}</p>}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting || !folderName.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 active:bg-sky-800 rounded-xl transition-all shadow-sm shadow-sky-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Membuat...' : 'Buat Folder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
