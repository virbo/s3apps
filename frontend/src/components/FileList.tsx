import React, { useState, useMemo, useEffect } from 'react';
import {
  Folder,
  File,
  FileText,
  FileImage,
  FileArchive,
  FileCode,
  Download,
  Share2,
  Trash2,
  Copy,
  Check,
  ExternalLink,
  X,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  Square,
  Archive
} from 'lucide-react';
import { FileItem } from '../types';
import { api } from '../services/api';
import { ConfirmModal } from './ConfirmModal';

interface FileListProps {
  items: FileItem[];
  loading: boolean;
  onNavigateFolder: (folderFullPath: string) => void;
  onRefresh: () => void;
}

export const FileList: React.FC<FileListProps> = ({
  items,
  loading,
  onNavigateFolder,
  onRefresh,
}) => {
  // Selection state: Map path -> { path, is_dir }
  const [selectedMap, setSelectedMap] = useState<Map<string, boolean>>(new Map());
  const [isDeletingBatch, setIsDeletingBatch] = useState(false);
  const [isDownloadingBatch, setIsDownloadingBatch] = useState(false);
  const [showBatchConfirm, setShowBatchConfirm] = useState(false);

  // Single item presigned modal
  const [presignedModal, setPresignedModal] = useState<{ open: boolean; url: string; fileName: string }>({
    open: false,
    url: '',
    fileName: '',
  });
  const [copied, setCopied] = useState(false);

  // Single item deletion state
  const [singleDeleteTarget, setSingleDeleteTarget] = useState<FileItem | null>(null);
  const [isDeletingSingle, setIsDeletingSingle] = useState(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);

  // Reset selection & page when items change (e.g. folder change)
  useEffect(() => {
    setSelectedMap(new Map());
    setCurrentPage(1);
  }, [items.length]);

  const totalPages = Math.ceil(items.length / pageSize) || 1;

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, currentPage, pageSize]);

  // Checkbox helpers
  const isPageAllSelected = useMemo(() => {
    if (paginatedItems.length === 0) return false;
    return paginatedItems.every((item) => selectedMap.has(item.full_path));
  }, [paginatedItems, selectedMap]);

  const toggleSelectAllPage = () => {
    const nextMap = new Map(selectedMap);
    if (isPageAllSelected) {
      paginatedItems.forEach((it) => nextMap.delete(it.full_path));
    } else {
      paginatedItems.forEach((it) => nextMap.set(it.full_path, it.is_dir));
    }
    setSelectedMap(nextMap);
  };

  const selectEntireFolder = () => {
    const nextMap = new Map<string, boolean>();
    items.forEach((it) => nextMap.set(it.full_path, it.is_dir));
    setSelectedMap(nextMap);
  };

  const clearSelection = () => {
    setSelectedMap(new Map());
  };

  const toggleSelectItem = (item: FileItem) => {
    const nextMap = new Map(selectedMap);
    if (nextMap.has(item.full_path)) {
      nextMap.delete(item.full_path);
    } else {
      nextMap.set(item.full_path, item.is_dir);
    }
    setSelectedMap(nextMap);
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '-';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getFileIcon = (item: FileItem) => {
    if (item.is_dir) {
      return <Folder className="w-5 h-5 text-amber-500 fill-amber-500/20 flex-shrink-0" />;
    }
    const ext = item.name.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
      case 'svg':
      case 'webp':
        return <FileImage className="w-5 h-5 text-emerald-500 flex-shrink-0" />;
      case 'zip':
      case 'tar':
      case 'gz':
      case 'rar':
      case '7z':
        return <FileArchive className="w-5 h-5 text-purple-500 flex-shrink-0" />;
      case 'js':
      case 'ts':
      case 'tsx':
      case 'py':
      case 'json':
      case 'html':
      case 'css':
      case 'sql':
        return <FileCode className="w-5 h-5 text-indigo-500 flex-shrink-0" />;
      case 'pdf':
      case 'doc':
      case 'docx':
      case 'txt':
      case 'md':
        return <FileText className="w-5 h-5 text-sky-500 flex-shrink-0" />;
      default:
        return <File className="w-5 h-5 text-slate-400 flex-shrink-0" />;
    }
  };

  const handleDownload = (item: FileItem) => {
    const url = api.getDownloadUrl(item.full_path);
    window.location.href = url;
  };

  const handleShare = async (item: FileItem) => {
    try {
      setErrorNotice(null);
      const res = await api.getPresignedUrl(item.full_path, 3600);
      setPresignedModal({
        open: true,
        url: res.url,
        fileName: item.name,
      });
      setCopied(false);
    } catch (err: any) {
      setErrorNotice(`Gagal mengambil Presigned URL: ${err?.response?.data?.detail || err.message}`);
    }
  };

  const copyPresignedUrl = () => {
    navigator.clipboard.writeText(presignedModal.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDeleteSingleClick = (item: FileItem) => {
    setErrorNotice(null);
    setSingleDeleteTarget(item);
  };

  const confirmSingleDelete = async () => {
    if (!singleDeleteTarget) return;

    try {
      setIsDeletingSingle(true);
      setErrorNotice(null);
      await api.deleteItem(singleDeleteTarget.full_path, singleDeleteTarget.is_dir);
      const nextMap = new Map(selectedMap);
      nextMap.delete(singleDeleteTarget.full_path);
      setSelectedMap(nextMap);
      setSingleDeleteTarget(null);
      onRefresh();
    } catch (err: any) {
      setErrorNotice(`Gagal menghapus: ${err?.response?.data?.detail || err.message}`);
    } finally {
      setIsDeletingSingle(false);
    }
  };

  const handleBatchDelete = async () => {
    if (selectedMap.size === 0) return;

    try {
      setIsDeletingBatch(true);
      setErrorNotice(null);
      const itemsPayload = Array.from(selectedMap.entries()).map(([path, is_dir]) => ({
        path,
        is_dir,
      }));

      await api.batchDelete(itemsPayload);
      clearSelection();
      setShowBatchConfirm(false);
      onRefresh();
    } catch (err: any) {
      setErrorNotice(`Gagal menghapus batch: ${err?.response?.data?.detail || err.message}`);
    } finally {
      setIsDeletingBatch(false);
    }
  };

  const handleBatchDownload = async () => {
    if (selectedMap.size === 0) return;

    try {
      setIsDownloadingBatch(true);
      setErrorNotice(null);
      const itemsPayload = Array.from(selectedMap.entries()).map(([path, is_dir]) => ({
        path,
        is_dir,
      }));

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const zipName = `s3-download-${timestamp}.zip`;

      const blob = await api.batchDownload(itemsPayload, zipName);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = zipName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      setErrorNotice(`Gagal mengunduh file batch: ${err?.response?.data?.detail || err.message}`);
    } finally {
      setIsDownloadingBatch(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-slate-200 border-t-sky-600 mb-3"></div>
        <p className="text-sm text-slate-500">Memuat isi bucket...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-16 text-center">
        <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-400">
          <Folder className="w-8 h-8 stroke-1" />
        </div>
        <h3 className="text-base font-semibold text-slate-800 mb-1">Folder ini kosong</h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          Belum ada file atau subfolder di lokasi ini. Gunakan tombol 'Upload File' atau 'Buat Folder' di atas.
        </p>
      </div>
    );
  }

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, items.length);

  return (
    <>
      {/* Floating / Sticky Batch Action Bar */}
      {selectedMap.size > 0 && (
        <div className="sticky top-20 z-20 mb-4 bg-slate-900 text-white rounded-2xl px-5 py-3 shadow-xl flex items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 duration-200 border border-slate-800">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-pulse"></span>
            <span className="text-sm font-semibold">
              {selectedMap.size} item terpilih
            </span>
            {selectedMap.size < items.length && (
              <button
                onClick={selectEntireFolder}
                className="text-xs text-sky-400 hover:text-sky-300 underline font-medium ml-2"
              >
                Pilih semua ({items.length} item) di folder ini
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={clearSelection}
              disabled={isDeletingBatch || isDownloadingBatch}
              className="px-3 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors font-medium disabled:opacity-50"
            >
              Batal
            </button>
            <button
              onClick={handleBatchDownload}
              disabled={isDeletingBatch || isDownloadingBatch}
              className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
              title="Unduh semua file/folder terpilih dalam format .zip"
            >
              <Archive className={`w-4 h-4 ${isDownloadingBatch ? 'animate-bounce' : ''}`} />
              <span>{isDownloadingBatch ? 'Membuat ZIP...' : `Download ZIP (${selectedMap.size})`}</span>
            </button>
            <button
              onClick={() => setShowBatchConfirm(true)}
              disabled={isDeletingBatch || isDownloadingBatch}
              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors shadow-sm shadow-rose-950 disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              <span>Hapus ({selectedMap.size})</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                {/* Select All Checkbox */}
                <th scope="col" className="w-12 px-4 py-3.5 text-center">
                  <button
                    type="button"
                    onClick={toggleSelectAllPage}
                    className="p-1 rounded text-slate-400 hover:text-slate-700 transition-colors inline-flex items-center justify-center"
                    title={isPageAllSelected ? 'Batalkan pilihan halaman ini' : 'Pilih semua di halaman ini'}
                  >
                    {isPageAllSelected ? (
                      <CheckSquare className="w-4 h-4 text-sky-600" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th scope="col" className="px-4 py-3.5">Nama</th>
                <th scope="col" className="px-6 py-3.5 w-32">Ukuran</th>
                <th scope="col" className="px-6 py-3.5 w-44">Terakhir Diubah</th>
                <th scope="col" className="px-6 py-3.5 w-36 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedItems.map((item) => {
                const isSelected = selectedMap.has(item.full_path);
                return (
                  <tr
                    key={item.full_path}
                    className={`transition-colors group ${
                      isSelected ? 'bg-sky-50/70' : 'hover:bg-slate-50/75'
                    }`}
                  >
                    {/* Row Checkbox */}
                    <td className="w-12 px-4 py-3.5 text-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelectItem(item);
                        }}
                        className="p-1 rounded text-slate-400 hover:text-slate-700 transition-colors inline-flex items-center justify-center"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-sky-600" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-300 group-hover:text-slate-400" />
                        )}
                      </button>
                    </td>

                    {/* Name column */}
                    <td className="px-4 py-3.5">
                      {item.is_dir ? (
                        <button
                          onClick={() => onNavigateFolder(item.full_path)}
                          className="flex items-center gap-3 text-slate-800 font-medium hover:text-sky-600 transition-colors text-left"
                        >
                          {getFileIcon(item)}
                          <span className="truncate max-w-md">{item.name}</span>
                        </button>
                      ) : (
                        <div className="flex items-center gap-3 text-slate-700">
                          {getFileIcon(item)}
                          <span className="truncate max-w-md" title={item.name}>
                            {item.name}
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Size column */}
                    <td className="px-6 py-3.5 text-xs text-slate-500">
                      {formatSize(item.size)}
                    </td>

                    {/* Last modified column */}
                    <td className="px-6 py-3.5 text-xs text-slate-500">
                      {formatDate(item.last_modified)}
                    </td>

                    {/* Actions column */}
                    <td className="px-6 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {!item.is_dir && (
                          <>
                            <button
                              onClick={() => handleDownload(item)}
                              className="p-1.5 text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
                              title="Download File"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleShare(item)}
                              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="Presigned URL (Share)"
                            >
                              <Share2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleDeleteSingleClick(item)}
                          disabled={isDeletingSingle}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-50"
                          title={item.is_dir ? 'Hapus Folder' : 'Hapus File'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="px-6 py-3.5 bg-slate-50/50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span>
              Menampilkan <span className="font-semibold text-slate-700">{startItem}-{endItem}</span> dari{' '}
              <span className="font-semibold text-slate-700">{items.length}</span> item
            </span>
            <span className="text-slate-300">|</span>
            <label className="flex items-center gap-1.5">
              <span>Per halaman:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-sky-500"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
              </select>
            </label>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="Halaman Sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 font-medium text-slate-700">
              Hal {currentPage} dari {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="Halaman Berikutnya"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Styled Confirmation Modal for Single Delete */}
      <ConfirmModal
        isOpen={!!singleDeleteTarget}
        title={singleDeleteTarget?.is_dir ? 'Hapus Folder' : 'Hapus File'}
        message={
          <span>
            Apakah Anda yakin ingin menghapus {singleDeleteTarget?.is_dir ? 'folder' : 'file'}{' '}
            <strong className="font-semibold text-slate-900">'{singleDeleteTarget?.name}'</strong>
            {singleDeleteTarget?.is_dir ? ' dan seluruh isinya' : ''}? Tindakan ini permanen dan tidak dapat dibatalkan.
          </span>
        }
        confirmLabel="Ya, Hapus"
        cancelLabel="Batal"
        variant="danger"
        isLoading={isDeletingSingle}
        onConfirm={confirmSingleDelete}
        onCancel={() => {
          if (!isDeletingSingle) setSingleDeleteTarget(null);
        }}
      />

      {/* Styled Confirmation Modal for Batch Delete */}
      <ConfirmModal
        isOpen={showBatchConfirm}
        title="Konfirmasi Hapus Beberapa Item"
        message={
          <span>
            Apakah Anda yakin ingin menghapus <strong className="font-semibold text-rose-600">{selectedMap.size} item</strong> yang dipilih?
            Tindakan ini permanen dan tidak dapat dibatalkan.
          </span>
        }
        confirmLabel={`Ya, Hapus (${selectedMap.size})`}
        cancelLabel="Batal"
        variant="danger"
        isLoading={isDeletingBatch}
        onConfirm={handleBatchDelete}
        onCancel={() => {
          if (!isDeletingBatch) setShowBatchConfirm(false);
        }}
      />

      {/* Error Floating Toast */}
      {errorNotice && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md bg-rose-900/95 backdrop-blur text-white text-xs px-4 py-3 rounded-2xl shadow-xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-2">
          <span>{errorNotice}</span>
          <button
            onClick={() => setErrorNotice(null)}
            className="p-1 hover:bg-rose-800 rounded-lg transition-colors flex-shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Modal Presigned URL */}
      {presignedModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden border border-slate-100 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 font-semibold text-slate-800">
                <Share2 className="w-5 h-5 text-indigo-600" />
                <span>Presigned URL (1 Jam)</span>
              </div>
              <button
                onClick={() => setPresignedModal({ open: false, url: '', fileName: '' })}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Tautan download sementara untuk file <span className="font-semibold text-slate-700">{presignedModal.fileName}</span>. Berlaku selama 60 menit.
            </p>

            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-2.5">
              <input
                type="text"
                readOnly
                value={presignedModal.url}
                className="w-full bg-transparent text-xs text-slate-600 outline-none font-mono truncate"
              />
              <button
                onClick={copyPresignedUrl}
                className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 transition-colors flex items-center gap-1.5 flex-shrink-0"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Tersalin' : 'Salin'}</span>
              </button>
            </div>

            <div className="flex justify-end pt-2">
              <a
                href={presignedModal.url}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-sky-600 hover:text-sky-700 font-medium flex items-center gap-1"
              >
                <span>Buka di tab baru</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
