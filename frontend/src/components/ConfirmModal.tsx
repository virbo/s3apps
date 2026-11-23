import React from 'react';
import { AlertTriangle, Trash2, Info, X, Loader2 } from 'lucide-react';

export interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Hapus',
  cancelLabel = 'Batal',
  variant = 'danger',
  isLoading = false,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (variant) {
      case 'warning':
        return (
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200/60 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
        );
      case 'info':
        return (
          <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 border border-sky-200/60 flex items-center justify-center flex-shrink-0">
            <Info className="w-6 h-6" />
          </div>
        );
      case 'danger':
      default:
        return (
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200/60 flex items-center justify-center flex-shrink-0">
            <Trash2 className="w-6 h-6" />
          </div>
        );
    }
  };

  const getConfirmButtonClasses = () => {
    switch (variant) {
      case 'warning':
        return 'bg-amber-600 hover:bg-amber-700 text-white shadow-sm shadow-amber-200 focus:ring-amber-500';
      case 'info':
        return 'bg-sky-600 hover:bg-sky-700 text-white shadow-sm shadow-sky-200 focus:ring-sky-500';
      case 'danger':
      default:
        return 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm shadow-rose-200 focus:ring-rose-500';
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 space-y-5 animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Close Button */}
        <button
          onClick={onCancel}
          disabled={isLoading}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50"
          title="Tutup"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header with Icon and Title */}
        <div className="flex items-start gap-4 pr-6">
          {getIcon()}
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-900 tracking-tight">
              {title}
            </h3>
            <div className="text-sm text-slate-600 leading-relaxed">
              {message}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium text-sm transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-all flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-60 disabled:cursor-not-allowed ${getConfirmButtonClasses()}`}
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
