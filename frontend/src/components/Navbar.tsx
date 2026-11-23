import React, { useState, useRef, useEffect } from 'react';
import {
  Database,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  LogOut,
  User as UserIcon,
  Settings as SettingsIcon,
  ChevronDown,
  Cloud,
  Check,
  Plus
} from 'lucide-react';
import { BucketStatus, User, S3Config } from '../types';

interface NavbarProps {
  status: BucketStatus | null;
  loading: boolean;
  onRefresh: () => void;
  user: User | null;
  onLogout: () => void;
  onOpenSettings: () => void;
  s3Configs: S3Config[];
  activeS3Id: number | null;
  onSelectS3: (id: number) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  status,
  loading,
  onRefresh,
  user,
  onLogout,
  onOpenSettings,
  s3Configs,
  activeS3Id,
  onSelectS3,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentS3 = s3Configs.find((s) => s.id === activeS3Id) || (s3Configs.length > 0 ? s3Configs[0] : null);

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left: Brand & Storage Switcher */}
        <div className="flex items-center space-x-3 sm:space-x-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-sky-100 flex-shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                S3 Manager
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 font-semibold uppercase">
                  Multi S3
                </span>
              </h1>
            </div>
          </div>

          {/* S3 Storage Switcher Dropdown (Requirement 3: Bisa dipilih tanpa masuk setting) */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200/80 rounded-xl text-xs font-medium text-slate-800 transition-colors border border-slate-200"
              title="Ganti S3 Storage Aktif"
            >
              <Cloud className="w-3.5 h-3.5 text-sky-600 flex-shrink-0" />
              <div className="flex flex-col text-left">
                <span className="font-bold truncate max-w-[140px] sm:max-w-[180px]">
                  {status?.config_name || currentS3?.name || 'Pilih Storage'}
                </span>
                <span className="text-[10px] text-slate-500 font-mono truncate max-w-[140px]">
                  {status?.bucket_name || currentS3?.bucket_name || '...'}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
            </button>

            {/* Dropdown Menu */}
            {dropdownOpen && (
              <div className="absolute left-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-1.5 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Pilih Penyimpanan S3
                </div>

                <div className="max-h-60 overflow-y-auto py-1">
                  {s3Configs.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-slate-400">Belum ada S3 terdaftar</div>
                  ) : (
                    s3Configs.map((s) => {
                      const isActive = s.id === (activeS3Id || currentS3?.id);
                      return (
                        <button
                          key={s.id}
                          onClick={() => {
                            onSelectS3(s.id);
                            setDropdownOpen(false);
                          }}
                          className={`w-full px-3 py-2 text-left flex items-center justify-between text-xs hover:bg-slate-50 transition-colors ${
                            isActive ? 'bg-sky-50/70 text-sky-800 font-bold' : 'text-slate-700'
                          }`}
                        >
                          <div className="truncate pr-2">
                            <div className="truncate font-semibold">{s.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono truncate">
                              {s.bucket_name} &bull; {s.endpoint}
                            </div>
                          </div>
                          {isActive && <Check className="w-4 h-4 text-sky-600 flex-shrink-0" />}
                        </button>
                      );
                    })
                  )}
                </div>

                <div className="pt-1.5 border-t border-slate-100 px-2">
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      onOpenSettings();
                    }}
                    className="w-full py-1.5 px-3 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5 text-sky-600" />
                    <span>Kelola / Tambah S3</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Status, Refresh, Settings, User */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Status Indicator */}
          {status ? (
            <div
              className={`hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
                status.connected
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}
              title={status.message}
            >
              {status.connected ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>S3 Terhubung</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                  <span>S3 Terputus</span>
                </>
              )}
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
              <span className="w-2 h-2 rounded-full bg-slate-400 animate-pulse"></span>
              Checking...
            </div>
          )}

          {/* Refresh button */}
          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
            title="Refresh File List"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-sky-600' : ''}`} />
          </button>

          {/* Settings button */}
          <button
            onClick={onOpenSettings}
            className="p-2 text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
            title="Buka Pengaturan (S3, Akun, Email)"
          >
            <SettingsIcon className="w-4 h-4" />
          </button>

          {/* User profile & Logout */}
          {user && (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="hidden lg:flex flex-col text-right">
                <span className="text-xs font-bold text-slate-800 leading-tight">
                  {user.full_name || 'User'}
                </span>
                <span className="text-[10px] text-slate-500 truncate max-w-[120px]">
                  {user.email}
                </span>
              </div>
              <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 flex-shrink-0">
                <UserIcon className="w-4 h-4" />
              </div>
              <button
                onClick={onLogout}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                title="Keluar (Logout)"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
