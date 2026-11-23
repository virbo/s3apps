import React from 'react';
import { ChevronRight, Home, Folder } from 'lucide-react';

interface BreadcrumbProps {
  currentPrefix: string;
  onNavigate: (prefix: string) => void;
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ currentPrefix, onNavigate }) => {
  const parts = currentPrefix.split('/').filter(Boolean);

  const buildPath = (index: number) => {
    return parts.slice(0, index + 1).join('/') + '/';
  };

  return (
    <nav className="flex items-center space-x-1 text-sm text-slate-600 bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
      <button
        onClick={() => onNavigate('')}
        className={`flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors ${
          parts.length === 0
            ? 'font-semibold text-sky-700 bg-sky-50'
            : 'hover:text-slate-900 hover:bg-slate-100'
        }`}
      >
        <Home className="w-4 h-4 text-slate-500" />
        <span>Root</span>
      </button>

      {parts.map((part, index) => {
        const isLast = index === parts.length - 1;
        return (
          <React.Fragment key={index}>
            <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <button
              onClick={() => onNavigate(buildPath(index))}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors truncate max-w-[200px] ${
                isLast
                  ? 'font-semibold text-sky-700 bg-sky-50'
                  : 'hover:text-slate-900 hover:bg-slate-100'
              }`}
              title={part}
            >
              <Folder className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
              <span className="truncate">{part}</span>
            </button>
          </React.Fragment>
        );
      })}
    </nav>
  );
};
