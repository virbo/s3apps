import { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { Breadcrumb } from './components/Breadcrumb';
import { FileList } from './components/FileList';
import { CreateFolderModal } from './components/CreateFolderModal';
import { FileUploadModal } from './components/FileUploadModal';
import { LoginPage } from './components/LoginPage';
import { SetupWizard } from './components/SetupWizard';
import { SettingsModal } from './components/SettingsModal';
import {
  api,
  getToken,
  clearToken,
  getActiveS3Id,
  setActiveS3Id
} from './services/api';
import { BucketStatus, FileItem, User, S3Config } from './types';
import {
  FolderPlus,
  UploadCloud,
  Search,
  AlertCircle,
  HardDrive,
  File as FileIcon,
  Folder
} from 'lucide-react';

export function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authChecking, setAuthChecking] = useState<boolean>(true);

  // Multi-S3 state
  const [s3Configs, setS3Configs] = useState<S3Config[]>([]);
  const [activeS3Id, setActiveS3IdState] = useState<number | null>(getActiveS3Id());
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // File explorer state
  const [status, setStatus] = useState<BucketStatus | null>(null);
  const [currentPrefix, setCurrentPrefix] = useState<string>('');
  const [items, setItems] = useState<FileItem[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState<boolean>(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [totalFiles, setTotalFiles] = useState<number>(0);
  const [totalFolders, setTotalFolders] = useState<number>(0);
  const [totalSize, setTotalSize] = useState<number>(0);

  // Periksa sesi pengguna
  const checkAuth = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setCurrentUser(null);
      setAuthChecking(false);
      return;
    }

    try {
      const user = await api.getMe();
      setCurrentUser(user);
    } catch {
      clearToken();
      setCurrentUser(null);
    } finally {
      setAuthChecking(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();

    const handleUnauthorized = () => {
      setCurrentUser(null);
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, [checkAuth]);

  // Fetch daftar S3 configs
  const fetchS3Configs = useCallback(async () => {
    if (!currentUser) return;
    try {
      const configs = await api.listS3Configs();
      setS3Configs(configs);

      // Cek apakah activeS3Id masih valid
      const currentActive = getActiveS3Id();
      const exists = configs.find((c) => c.id === currentActive);
      if (!exists && configs.length > 0) {
        const defaultOne = configs.find((c) => c.is_default) || configs[0];
        setActiveS3Id(defaultOne.id);
        setActiveS3IdState(defaultOne.id);
      }
    } catch (err) {
      console.error('Error fetching S3 configs:', err);
    }
  }, [currentUser]);

  // Fetch status & health S3
  const fetchStatus = useCallback(async () => {
    if (!currentUser) return;
    try {
      const data = await api.checkHealth(activeS3Id || undefined);
      setStatus(data);
    } catch (err: any) {
      setStatus({
        bucket_name: '-',
        connected: false,
        exists: false,
        endpoint: '-',
        message: err.message || 'Tidak dapat terhubung ke Backend API',
      });
    }
  }, [currentUser, activeS3Id]);

  // Fetch files in active prefix
  const fetchFiles = useCallback(async (prefix: string) => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const data = await api.listFiles(prefix, activeS3Id || undefined);
      setItems(data.items);
      setTotalFiles(data.total_files);
      setTotalFolders(data.total_folders);
      setTotalSize(data.total_size_bytes);
    } catch (err) {
      console.error('Error fetching files:', err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [currentUser, activeS3Id]);

  useEffect(() => {
    if (currentUser) {
      fetchS3Configs();
    }
  }, [currentUser, fetchS3Configs]);

  useEffect(() => {
    if (currentUser) {
      fetchStatus();
      fetchFiles(currentPrefix);
    }
  }, [currentUser, activeS3Id, currentPrefix, fetchStatus, fetchFiles]);

  const handleRefresh = () => {
    fetchStatus();
    fetchFiles(currentPrefix);
  };

  const handleLogout = () => {
    api.logout();
    setCurrentUser(null);
  };

  const handleSelectS3 = (id: number) => {
    setActiveS3Id(id);
    setActiveS3IdState(id);
    setCurrentPrefix('');
    setSearchQuery('');
  };

  const handleNavigate = (prefix: string) => {
    setCurrentPrefix(prefix);
    setSearchQuery('');
  };

  const handleCreateFolder = async (folderName: string) => {
    await api.createFolder(folderName, currentPrefix);
    fetchFiles(currentPrefix);
  };

  const handleUpload = async (files: File[], onProgress: (percent: number) => void) => {
    await api.uploadFiles(files, currentPrefix, onProgress);
    fetchFiles(currentPrefix);
  };

  const handleWizardComplete = async () => {
    const updatedUser = await api.getMe();
    setCurrentUser(updatedUser);
    await fetchS3Configs();
    handleRefresh();
  };

  // Filter items by search query
  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (authChecking) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-slate-700 border-t-sky-500"></div>
      </div>
    );
  }

  // Jika belum login, tampilkan Login Page
  if (!currentUser) {
    return <LoginPage onLoginSuccess={(user) => setCurrentUser(user)} />;
  }

  // Jika akun default baru login pertama kali, wajibkan Setup Wizard
  if (currentUser.needs_initial_setup) {
    return <SetupWizard onComplete={handleWizardComplete} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans antialiased text-slate-800">
      {/* Navbar with Multi-S3 Switcher & Settings */}
      <Navbar
        status={status}
        loading={loading}
        onRefresh={handleRefresh}
        user={currentUser}
        onLogout={handleLogout}
        onOpenSettings={() => setIsSettingsOpen(true)}
        s3Configs={s3Configs}
        activeS3Id={activeS3Id}
        onSelectS3={handleSelectS3}
      />

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Connection Alert if offline */}
        {status && !status.connected && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-2xl flex items-start gap-3 shadow-sm">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-semibold text-rose-900">
                Koneksi ke S3 '{status.config_name || 'Storage'}' Bermasalah
              </p>
              <p>{status.message || 'Periksa kredensial atau endpoint S3 di Pengaturan.'}</p>
            </div>
          </div>
        )}

        {/* Stats bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Folder className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Subfolder</p>
              <p className="text-lg font-bold text-slate-800">{totalFolders}</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <FileIcon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Total File</p>
              <p className="text-lg font-bold text-slate-800">{totalFiles}</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Ukuran di Lokasi Ini</p>
              <p className="text-lg font-bold text-slate-800">{formatSize(totalSize)}</p>
            </div>
          </div>
        </div>

        {/* Toolbar & Breadcrumb */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <Breadcrumb currentPrefix={currentPrefix} onNavigate={handleNavigate} />

          <div className="flex items-center gap-2 flex-wrap">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-60">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari file..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-sm"
              />
            </div>

            {/* Buat Folder */}
            <button
              onClick={() => setIsFolderModalOpen(true)}
              className="px-3.5 py-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 hover:text-slate-900 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <FolderPlus className="w-4 h-4 text-amber-500" />
              <span>Buat Folder</span>
            </button>

            {/* Upload File */}
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm shadow-sky-200"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Upload File</span>
            </button>
          </div>
        </div>

        {/* File Table / Explorer */}
        <FileList
          items={filteredItems}
          loading={loading}
          onNavigateFolder={handleNavigate}
          onRefresh={() => fetchFiles(currentPrefix)}
        />
      </main>

      {/* Modals */}
      <CreateFolderModal
        isOpen={isFolderModalOpen}
        onClose={() => setIsFolderModalOpen(false)}
        onSubmit={handleCreateFolder}
        currentPrefix={currentPrefix}
      />

      <FileUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUpload={handleUpload}
        currentPrefix={currentPrefix}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onS3ConfigChanged={() => {
          fetchS3Configs();
          handleRefresh();
        }}
      />
    </div>
  );
}

export default App;
