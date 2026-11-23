import React, { useState, useEffect } from 'react';
import {
  X,
  Server,
  Shield,
  Mail,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Check,
  Send,
  Lock,
  Eye,
  EyeOff
} from 'lucide-react';
import { api } from '../services/api';
import { S3Config, S3ConfigInput, SMTPConfig } from '../types';
import { ConfirmModal } from './ConfirmModal';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onS3ConfigChanged: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onS3ConfigChanged,
}) => {
  const [activeTab, setActiveTab] = useState<'s3' | 'security' | 'smtp'>('s3');

  // --- S3 Management State ---
  const [s3List, setS3List] = useState<S3Config[]>([]);
  const [loadingS3, setLoadingS3] = useState(false);
  const [showAddS3, setShowAddS3] = useState(false);
  const [s3Form, setS3Form] = useState<S3ConfigInput>({
    name: '',
    endpoint: '',
    access_key: '',
    secret_key: '',
    bucket_name: '',
    region: '',
    secure: true,
    is_default: false,
  });
  const [testingS3, setTestingS3] = useState(false);
  const [s3TestMsg, setS3TestMsg] = useState<{ success: boolean; text: string } | null>(null);
  const [savingS3, setSavingS3] = useState(false);
  const [s3Error, setS3Error] = useState<string | null>(null);
  const [s3ToDelete, setS3ToDelete] = useState<{ id: number; name: string } | null>(null);
  const [isDeletingS3, setIsDeletingS3] = useState(false);
  const [s3ListError, setS3ListError] = useState<string | null>(null);

  // --- Security State ---
  const [newEmail, setNewEmail] = useState('');
  const [emailCodeSent, setEmailCodeSent] = useState(false);
  const [emailVerificationCode, setEmailVerificationCode] = useState('');
  const [devCodeHint, setDevCodeHint] = useState<string | null>(null);
  const [sendingEmailCode, setSendingEmailCode] = useState(false);
  const [emailSuccessMsg, setEmailSuccessMsg] = useState<string | null>(null);
  const [emailErrorMsg, setEmailErrorMsg] = useState<string | null>(null);

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [changingPass, setChangingPass] = useState(false);
  const [passSuccessMsg, setPassSuccessMsg] = useState<string | null>(null);
  const [passErrorMsg, setPassErrorMsg] = useState<string | null>(null);

  // --- SMTP State ---
  const [smtpForm, setSmtpForm] = useState<SMTPConfig>({
    host: '',
    port: 587,
    username: '',
    password: '',
    from_email: '',
    from_name: 'S3 File Manager',
    use_tls: true,
    use_ssl: false,
    is_configured: false,
  });
  const [savingSmtp, setSavingSmtp] = useState(false);
  const [smtpSuccessMsg, setSmtpSuccessMsg] = useState<string | null>(null);
  const [smtpErrorMsg, setSmtpErrorMsg] = useState<string | null>(null);
  const [testEmailTarget, setTestEmailTarget] = useState('');
  const [sendingTestEmail, setSendingTestEmail] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState<{ success: boolean; text: string } | null>(null);

  // Load S3 list
  const fetchS3Configs = async () => {
    try {
      setLoadingS3(true);
      const data = await api.listS3Configs();
      setS3List(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingS3(false);
    }
  };

  // Load SMTP config
  const fetchSMTPConfig = async () => {
    try {
      const data = await api.getSMTPConfig();
      setSmtpForm({ ...data, password: '' });
    } catch (err: any) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchS3Configs();
      fetchSMTPConfig();
      setS3Error(null);
      setS3TestMsg(null);
      setEmailSuccessMsg(null);
      setEmailErrorMsg(null);
      setPassSuccessMsg(null);
      setPassErrorMsg(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // S3 Handlers
  const handleTestS3 = async () => {
    if (!s3Form.endpoint || !s3Form.access_key || !s3Form.secret_key || !s3Form.bucket_name) {
      setS3TestMsg({ success: false, text: 'Mohon lengkapi semua kolom S3 terlebih dahulu.' });
      return;
    }
    try {
      setTestingS3(true);
      setS3TestMsg(null);
      const res = await api.testS3Connection(s3Form);
      setS3TestMsg({ success: res.connected, text: res.message });
    } catch (err: any) {
      setS3TestMsg({ success: false, text: err?.response?.data?.detail || err.message });
    } finally {
      setTestingS3(false);
    }
  };

  const handleSaveS3 = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingS3(true);
      setS3Error(null);
      await api.createS3Config(s3Form);
      setS3Form({
        name: '',
        endpoint: '',
        access_key: '',
        secret_key: '',
        bucket_name: '',
        region: '',
        secure: true,
        is_default: false,
      });
      setShowAddS3(false);
      setS3TestMsg(null);
      await fetchS3Configs();
      onS3ConfigChanged();
    } catch (err: any) {
      setS3Error(err?.response?.data?.detail || err.message || 'Gagal menyimpan S3.');
    } finally {
      setSavingS3(false);
    }
  };

  const handleDeleteS3Click = (id: number, name: string) => {
    setS3ListError(null);
    setS3ToDelete({ id, name });
  };

  const handleConfirmDeleteS3 = async () => {
    if (!s3ToDelete) return;
    try {
      setIsDeletingS3(true);
      setS3ListError(null);
      await api.deleteS3Config(s3ToDelete.id);
      await fetchS3Configs();
      onS3ConfigChanged();
      setS3ToDelete(null);
    } catch (err: any) {
      setS3ListError(err?.response?.data?.detail || err.message || 'Gagal menghapus S3.');
    } finally {
      setIsDeletingS3(false);
    }
  };

  const handleSetDefaultS3 = async (id: number) => {
    try {
      setS3ListError(null);
      await api.setDefaultS3Config(id);
      await fetchS3Configs();
      onS3ConfigChanged();
    } catch (err: any) {
      setS3ListError(err?.response?.data?.detail || err.message || 'Gagal menyetel default.');
    }
  };

  // Security Handlers
  const handleRequestEmailChange = async () => {
    if (!newEmail.trim() || !newEmail.includes('@')) {
      setEmailErrorMsg('Masukkan alamat email baru yang valid.');
      return;
    }
    try {
      setSendingEmailCode(true);
      setEmailErrorMsg(null);
      setEmailSuccessMsg(null);
      const res = await api.requestEmailChange(newEmail.trim());
      setEmailCodeSent(true);
      setEmailSuccessMsg(res.message);
      if (res.dev_code) {
        setDevCodeHint(res.dev_code);
        setEmailVerificationCode(res.dev_code);
      }
    } catch (err: any) {
      setEmailErrorMsg(err?.response?.data?.detail || err.message || 'Gagal mengirim kode.');
    } finally {
      setSendingEmailCode(false);
    }
  };

  const handleConfirmEmailChange = async () => {
    if (!emailVerificationCode.trim()) {
      setEmailErrorMsg('Masukkan 6-digit kode konfirmasi.');
      return;
    }
    try {
      setEmailErrorMsg(null);
      const res = await api.confirmEmailChange(emailVerificationCode.trim());
      setEmailSuccessMsg(res.message);
      setEmailCodeSent(false);
      setEmailVerificationCode('');
      setNewEmail('');
      setDevCodeHint(null);
    } catch (err: any) {
      setEmailErrorMsg(err?.response?.data?.detail || err.message || 'Gagal mengonfirmasi email.');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword || !newPassword) {
      setPassErrorMsg('Semua kolom password harus diisi.');
      return;
    }
    if (newPassword.length < 6) {
      setPassErrorMsg('Password baru minimal 6 karakter.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPassErrorMsg('Konfirmasi password tidak cocok.');
      return;
    }

    try {
      setChangingPass(true);
      setPassErrorMsg(null);
      setPassSuccessMsg(null);
      const res = await api.changePassword(oldPassword, newPassword);
      setPassSuccessMsg(res.message);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPassErrorMsg(err?.response?.data?.detail || err.message || 'Gagal mengubah password.');
    } finally {
      setChangingPass(false);
    }
  };

  // SMTP Handlers
  const handleSaveSMTP = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingSmtp(true);
      setSmtpErrorMsg(null);
      setSmtpSuccessMsg(null);
      const res = await api.saveSMTPConfig(smtpForm);
      setSmtpSuccessMsg(res.message);
    } catch (err: any) {
      setSmtpErrorMsg(err?.response?.data?.detail || err.message || 'Gagal menyimpan SMTP.');
    } finally {
      setSavingSmtp(false);
    }
  };

  const handleTestSMTP = async () => {
    if (!testEmailTarget.trim() || !testEmailTarget.includes('@')) {
      setTestEmailResult({ success: false, text: 'Masukkan alamat email target yang valid.' });
      return;
    }
    try {
      setSendingTestEmail(true);
      setTestEmailResult(null);
      const res = await api.testSMTP(testEmailTarget.trim());
      setTestEmailResult({ success: true, text: res.message });
    } catch (err: any) {
      setTestEmailResult({
        success: false,
        text: err?.response?.data?.detail || err.message || 'Gagal mengirim email uji coba.',
      });
    } finally {
      setSendingTestEmail(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h2 className="text-base font-bold text-slate-800">Pengaturan Sistem</h2>
            <p className="text-xs text-slate-500">Kelola multi-S3 storage, akun pengguna, dan konfigurasi email</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 px-6 gap-6 bg-white">
          <button
            onClick={() => setActiveTab('s3')}
            className={`py-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 's3'
                ? 'border-sky-600 text-sky-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Server className="w-4 h-4" />
            <span>Multi S3 Storage ({s3List.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`py-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'security'
                ? 'border-sky-600 text-sky-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Akun & Keamanan</span>
          </button>
          <button
            onClick={() => setActiveTab('smtp')}
            className={`py-3 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'smtp'
                ? 'border-sky-600 text-sky-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Mail className="w-4 h-4" />
            <span>Pengaturan Email (SMTP)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* =============================================================== */}
          {/* TAB 1: MULTI S3 STORAGE */}
          {/* =============================================================== */}
          {activeTab === 's3' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Daftar Penyimpanan S3</h3>
                  <p className="text-xs text-slate-500">
                    Pilih S3 default atau tambahkan provider S3 baru. Anda dapat mengganti S3 aktif langsung dari Navbar.
                  </p>
                </div>
                {!showAddS3 && (
                  <button
                    onClick={() => setShowAddS3(true)}
                    className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors shadow-sm shadow-sky-200"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Tambah S3</span>
                  </button>
                )}
              </div>

              {/* Form Tambah S3 */}
              {showAddS3 && (
                <form
                  onSubmit={handleSaveS3}
                  className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4 animate-in fade-in duration-150"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Tambah S3 Storage Baru
                    </h4>
                    <button
                      type="button"
                      onClick={() => setShowAddS3(false)}
                      className="text-slate-400 hover:text-slate-600 text-xs"
                    >
                      Batal
                    </button>
                  </div>

                  {s3Error && (
                    <div className="p-2.5 rounded-xl bg-rose-50 text-rose-700 text-xs flex items-center gap-1.5 border border-rose-200">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{s3Error}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="space-y-1 sm:col-span-2">
                      <label className="font-medium text-slate-700">Nama / Label S3</label>
                      <input
                        type="text"
                        required
                        value={s3Form.name}
                        onChange={(e) => setS3Form({ ...s3Form, name: e.target.value })}
                        placeholder="misal: Wasabi Storage, AWS Prod"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-medium text-slate-700">Endpoint Host</label>
                      <input
                        type="text"
                        required
                        value={s3Form.endpoint}
                        onChange={(e) => setS3Form({ ...s3Form, endpoint: e.target.value })}
                        placeholder="s3.example.com atau localhost:9000"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-medium text-slate-700">Bucket Name</label>
                      <input
                        type="text"
                        required
                        value={s3Form.bucket_name}
                        onChange={(e) => setS3Form({ ...s3Form, bucket_name: e.target.value })}
                        placeholder="nama-bucket"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-medium text-slate-700">Access Key</label>
                      <input
                        type="text"
                        required
                        value={s3Form.access_key}
                        onChange={(e) => setS3Form({ ...s3Form, access_key: e.target.value })}
                        placeholder="Access Key"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-medium text-slate-700">Secret Key</label>
                      <input
                        type="password"
                        required
                        value={s3Form.secret_key}
                        onChange={(e) => setS3Form({ ...s3Form, secret_key: e.target.value })}
                        placeholder="Secret Key"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-medium text-slate-700">Region (Opsional)</label>
                      <input
                        type="text"
                        value={s3Form.region || ''}
                        onChange={(e) => setS3Form({ ...s3Form, region: e.target.value })}
                        placeholder="us-east-1"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500"
                      />
                    </div>
                    <div className="flex items-center gap-2 pt-6">
                      <input
                        type="checkbox"
                        id="s3Secure"
                        checked={s3Form.secure}
                        onChange={(e) => setS3Form({ ...s3Form, secure: e.target.checked })}
                        className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                      />
                      <label htmlFor="s3Secure" className="cursor-pointer text-slate-700">
                        Gunakan HTTPS (SSL)
                      </label>
                    </div>
                  </div>

                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={handleTestS3}
                      disabled={testingS3}
                      className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-medium rounded-xl transition-colors disabled:opacity-50"
                    >
                      {testingS3 ? 'Menguji...' : 'Uji Koneksi'}
                    </button>
                    {s3TestMsg && (
                      <span
                        className={`text-xs flex items-center gap-1 ${
                          s3TestMsg.success ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {s3TestMsg.success ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                        {s3TestMsg.text}
                      </span>
                    )}
                    <button
                      type="submit"
                      disabled={savingS3}
                      className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-50 ml-auto"
                    >
                      {savingS3 ? 'Menyimpan...' : 'Simpan S3 Storage'}
                    </button>
                  </div>
                </form>
              )}

              {/* List S3 */}
              {s3ListError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{s3ListError}</span>
                </div>
              )}

              {loadingS3 ? (
                <div className="text-center py-8 text-xs text-slate-500">Memuat konfigurasi S3...</div>
              ) : s3List.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400 bg-slate-50 rounded-2xl border border-slate-100">
                  Belum ada konfigurasi S3 tambahan. Silakan klik tombol 'Tambah S3' di atas.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {s3List.map((s3) => (
                    <div
                      key={s3.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-2xl gap-3 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800 text-xs">{s3.name}</span>
                          {s3.is_default && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">
                              Default
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 font-mono">
                          {s3.endpoint} &bull; bucket: <span className="font-semibold">{s3.bucket_name}</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {!s3.is_default && (
                          <button
                            onClick={() => handleSetDefaultS3(s3.id)}
                            className="px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                          >
                            Set Default
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteS3Click(s3.id, s3.name)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                          title="Hapus S3"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* =============================================================== */}
          {/* TAB 2: AKUN & KEAMANAN */}
          {/* =============================================================== */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              {/* Form Ganti Email */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <Mail className="w-4 h-4 text-sky-600" />
                    <span>Perbarui Alamat Email</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Setiap perubahan email memerlukan verifikasi kode konfirmasi yang dikirim ke email baru.
                  </p>
                </div>

                {emailSuccessMsg && (
                  <div className="p-3 bg-emerald-50 text-emerald-700 text-xs rounded-xl border border-emerald-200 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    <span>{emailSuccessMsg}</span>
                  </div>
                )}
                {emailErrorMsg && (
                  <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl border border-rose-200 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{emailErrorMsg}</span>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="block text-xs font-medium text-slate-700">Email Baru</label>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="email-baru@domain.com"
                      className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-sky-500"
                    />
                    <button
                      type="button"
                      onClick={handleRequestEmailChange}
                      disabled={sendingEmailCode || !newEmail.trim()}
                      className="px-4 py-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-colors"
                    >
                      {sendingEmailCode ? 'Mengirim...' : emailCodeSent ? 'Kirim Ulang' : 'Kirim Kode'}
                    </button>
                  </div>
                  {devCodeHint && (
                    <p className="text-[11px] text-amber-600 bg-amber-50 p-2 rounded-lg border border-amber-200">
                      Simulasi Dev (SMTP belum aktif): Kode verifikasi adalah <strong>{devCodeHint}</strong>
                    </p>
                  )}
                </div>

                {emailCodeSent && (
                  <div className="space-y-2 pt-2 border-t border-slate-200">
                    <label className="block text-xs font-medium text-slate-700">
                      Masukkan 6-Digit Kode Konfirmasi
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        maxLength={6}
                        value={emailVerificationCode}
                        onChange={(e) => setEmailVerificationCode(e.target.value)}
                        placeholder="123456"
                        className="w-40 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono tracking-widest focus:ring-2 focus:ring-sky-500"
                      />
                      <button
                        type="button"
                        onClick={handleConfirmEmailChange}
                        disabled={!emailVerificationCode.trim()}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-50"
                      >
                        Konfirmasi & Aktifkan Email
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Form Ganti Password */}
              <form onSubmit={handleChangePassword} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <Lock className="w-4 h-4 text-indigo-600" />
                    <span>Ganti Password</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Pastikan menggunakan kombinasi password yang kuat dan aman.
                  </p>
                </div>

                {passSuccessMsg && (
                  <div className="p-3 bg-emerald-50 text-emerald-700 text-xs rounded-xl border border-emerald-200 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    <span>{passSuccessMsg}</span>
                  </div>
                )}
                {passErrorMsg && (
                  <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl border border-rose-200 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{passErrorMsg}</span>
                  </div>
                )}

                <div className="space-y-3 text-xs">
                  <div className="space-y-1">
                    <label className="font-medium text-slate-700">Password Lama</label>
                    <input
                      type={showPass ? 'text' : 'password'}
                      required
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-medium text-slate-700">Password Baru</label>
                      <input
                        type={showPass ? 'text' : 'password'}
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Minimal 6 karakter"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-medium text-slate-700">Konfirmasi Password Baru</label>
                      <input
                        type={showPass ? 'text' : 'password'}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1"
                  >
                    {showPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{showPass ? 'Sembunyikan' : 'Tampilkan password'}</span>
                  </button>
                  <button
                    type="submit"
                    disabled={changingPass}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-50"
                  >
                    {changingPass ? 'Menyimpan...' : 'Perbarui Password'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* =============================================================== */}
          {/* TAB 3: PENGATURAN EMAIL (SMTP) */}
          {/* =============================================================== */}
          {activeTab === 'smtp' && (
            <div className="space-y-6">
              <form onSubmit={handleSaveSMTP} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <Mail className="w-4 h-4 text-sky-600" />
                    <span>Konfigurasi Server SMTP</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Diperlukan untuk mengirim email konfirmasi verifikasi, notifikasi, dan reset password.
                  </p>
                </div>

                {smtpSuccessMsg && (
                  <div className="p-3 bg-emerald-50 text-emerald-700 text-xs rounded-xl border border-emerald-200 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    <span>{smtpSuccessMsg}</span>
                  </div>
                )}
                {smtpErrorMsg && (
                  <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl border border-rose-200 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{smtpErrorMsg}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1">
                    <label className="font-medium text-slate-700">SMTP Host</label>
                    <input
                      type="text"
                      required
                      value={smtpForm.host}
                      onChange={(e) => setSmtpForm({ ...smtpForm, host: e.target.value })}
                      placeholder="smtp.gmail.com atau mail.domain.com"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-medium text-slate-700">SMTP Port</label>
                    <input
                      type="number"
                      required
                      value={smtpForm.port}
                      onChange={(e) => setSmtpForm({ ...smtpForm, port: Number(e.target.value) })}
                      placeholder="587 atau 465"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-medium text-slate-700">Username / Email Pengirim</label>
                    <input
                      type="text"
                      value={smtpForm.username || ''}
                      onChange={(e) => setSmtpForm({ ...smtpForm, username: e.target.value })}
                      placeholder="user@domain.com"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-medium text-slate-700">Password / App Password</label>
                    <input
                      type="password"
                      value={smtpForm.password || ''}
                      onChange={(e) => setSmtpForm({ ...smtpForm, password: e.target.value })}
                      placeholder="Kosongkan jika tidak diubah"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-medium text-slate-700">From Email Address</label>
                    <input
                      type="email"
                      required
                      value={smtpForm.from_email}
                      onChange={(e) => setSmtpForm({ ...smtpForm, from_email: e.target.value })}
                      placeholder="no-reply@domain.com"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-medium text-slate-700">From Display Name</label>
                    <input
                      type="text"
                      value={smtpForm.from_name}
                      onChange={(e) => setSmtpForm({ ...smtpForm, from_name: e.target.value })}
                      placeholder="S3 File Manager"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                  <div className="flex items-center gap-4 sm:col-span-2 pt-2">
                    <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                      <input
                        type="checkbox"
                        checked={smtpForm.use_tls}
                        onChange={(e) => setSmtpForm({ ...smtpForm, use_tls: e.target.checked })}
                        className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                      />
                      <span>Gunakan TLS (STARTTLS port 587)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                      <input
                        type="checkbox"
                        checked={smtpForm.use_ssl}
                        onChange={(e) => setSmtpForm({ ...smtpForm, use_ssl: e.target.checked })}
                        className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                      />
                      <span>Gunakan SSL (port 465)</span>
                    </label>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={savingSmtp}
                    className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-50"
                  >
                    {savingSmtp ? 'Menyimpan...' : 'Simpan Pengaturan SMTP'}
                  </button>
                </div>
              </form>

              {/* Uji Coba Pengiriman Email */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                  <Send className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Uji Coba Pengiriman Email</span>
                </h4>
                <p className="text-xs text-slate-500">
                  Kirim email uji coba ke alamat Anda untuk memastikan konfigurasi SMTP di atas berjalan dengan baik.
                </p>

                {testEmailResult && (
                  <div
                    className={`p-3 text-xs rounded-xl border flex items-center gap-1.5 ${
                      testEmailResult.success
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}
                  >
                    {testEmailResult.success ? (
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    )}
                    <span>{testEmailResult.text}</span>
                  </div>
                )}

                <div className="flex gap-2">
                  <input
                    type="email"
                    value={testEmailTarget}
                    onChange={(e) => setTestEmailTarget(e.target.value)}
                    placeholder="email-anda@domain.com"
                    className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-sky-500"
                  />
                  <button
                    type="button"
                    onClick={handleTestSMTP}
                    disabled={sendingTestEmail || !testEmailTarget.trim()}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-colors"
                  >
                    {sendingTestEmail ? 'Mengirim...' : 'Kirim Email Uji'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Styled Confirmation Modal for S3 Delete */}
      <ConfirmModal
        isOpen={!!s3ToDelete}
        title="Hapus Konfigurasi S3"
        message={
          <span>
            Yakin ingin menghapus konfigurasi S3 <strong className="font-semibold text-slate-900">'{s3ToDelete?.name}'</strong>? Penyimpanan ini tidak akan bisa diakses lagi kecuali ditambahkan ulang.
          </span>
        }
        confirmLabel="Hapus S3"
        cancelLabel="Batal"
        variant="danger"
        isLoading={isDeletingS3}
        onConfirm={handleConfirmDeleteS3}
        onCancel={() => {
          if (!isDeletingS3) setS3ToDelete(null);
        }}
      />
    </div>
  );
};
