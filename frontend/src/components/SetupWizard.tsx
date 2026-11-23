import React, { useState } from 'react';
import {
  ShieldCheck,
  Mail,
  Lock,
  KeyRound,
  Database,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Server,
  Eye,
  EyeOff,
  Send
} from 'lucide-react';
import { api } from '../services/api';
import { S3ConfigInput, SMTPConfig } from '../types';

interface SetupWizardProps {
  onComplete: () => void;
}

export const SetupWizard: React.FC<SetupWizardProps> = ({ onComplete }) => {
  // Stepper: 1. SMTP Email -> 2. Akun & Keamanan -> 3. S3 Storage
  const [step, setStep] = useState<number>(1);

  // --- STEP 1: SMTP Config State ---
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
  const [smtpTestEmail, setSmtpTestEmail] = useState('');
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [smtpTestResult, setSmtpTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // --- STEP 2: Email & Password State ---
  const [newEmail, setNewEmail] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [devCodeHint, setDevCodeHint] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);

  // --- STEP 3: S3 Configuration State ---
  const [s3Name, setS3Name] = useState('Primary Storage');
  const [endpoint, setEndpoint] = useState('');
  const [accessKey, setAccessKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [bucketName, setBucketName] = useState('');
  const [region, setRegion] = useState('');
  const [secure, setSecure] = useState(true);

  // Test S3 State
  const [testingS3, setTestingS3] = useState(false);
  const [s3TestResult, setS3TestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Submitting final setup
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ============================================================================
  // STEP 1 HANDLERS (SMTP)
  // ============================================================================
  const handleTestSMTP = async () => {
    if (!smtpTestEmail.trim() || !smtpTestEmail.includes('@')) {
      setSmtpTestResult({
        success: false,
        message: 'Masukkan alamat email tujuan uji coba yang valid.',
      });
      return;
    }

    try {
      setTestingSmtp(true);
      setSmtpTestResult(null);
      // Simpan konfigurasi sementara terlebih dahulu agar backend menggunakan config terbaru
      await api.saveSMTPConfig(smtpForm);
      const res = await api.testSMTP(smtpTestEmail.trim());
      setSmtpTestResult({
        success: true,
        message: res.message,
      });
    } catch (err: any) {
      setSmtpTestResult({
        success: false,
        message: err?.response?.data?.detail || err.message || 'Gagal mengirim email uji coba.',
      });
    } finally {
      setTestingSmtp(false);
    }
  };

  const handleNextFromStep1 = async () => {
    if (!smtpForm.host.trim()) {
      setError('SMTP Host wajib diisi.');
      return;
    }
    if (!smtpForm.from_email.trim() || !smtpForm.from_email.includes('@')) {
      setError('From Email Address wajib diisi dengan format email valid.');
      return;
    }

    try {
      setSavingSmtp(true);
      setError(null);
      await api.saveSMTPConfig(smtpForm);
      setStep(2);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message || 'Gagal menyimpan pengaturan SMTP.');
    } finally {
      setSavingSmtp(false);
    }
  };

  // ============================================================================
  // STEP 2 HANDLERS (EMAIL & PASSWORD)
  // ============================================================================
  const handleSendCode = async () => {
    if (!newEmail.trim() || !newEmail.includes('@')) {
      setError('Masukkan alamat email baru yang valid.');
      return;
    }
    try {
      setSendingCode(true);
      setError(null);
      const res = await api.requestEmailChange(newEmail.trim());
      setCodeSent(true);
      if (res.dev_code) {
        setDevCodeHint(res.dev_code);
        setVerificationCode(res.dev_code);
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message || 'Gagal mengirim kode konfirmasi email.');
    } finally {
      setSendingCode(false);
    }
  };

  const handleNextFromStep2 = () => {
    if (!newEmail || !verificationCode) {
      setError('Harap masukkan email baru dan kode konfirmasi verifikasi yang dikirimkan.');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setError('Password baru minimal 6 karakter.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Konfirmasi password tidak cocok.');
      return;
    }
    setError(null);
    setStep(3);
  };

  // ============================================================================
  // STEP 3 HANDLERS (S3)
  // ============================================================================
  const handleTestS3 = async () => {
    if (!endpoint || !accessKey || !secretKey || !bucketName) {
      setS3TestResult({
        success: false,
        message: 'Lengkapi Endpoint, Access Key, Secret Key, dan Bucket Name terlebih dahulu.',
      });
      return;
    }

    try {
      setTestingS3(true);
      setS3TestResult(null);
      const data: S3ConfigInput = {
        name: s3Name,
        endpoint: endpoint.trim(),
        access_key: accessKey.trim(),
        secret_key: secretKey.trim(),
        bucket_name: bucketName.trim(),
        region: region.trim() || undefined,
        secure,
      };
      const res = await api.testS3Connection(data);
      setS3TestResult({
        success: res.connected,
        message: res.message,
      });
    } catch (err: any) {
      setS3TestResult({
        success: false,
        message: err?.response?.data?.detail || err.message || 'Gagal menguji koneksi S3.',
      });
    } finally {
      setTestingS3(false);
    }
  };

  const handleFinishWizard = async () => {
    try {
      setSubmitting(true);
      setError(null);

      let s3Data: S3ConfigInput | undefined = undefined;
      if (endpoint && accessKey && secretKey && bucketName) {
        s3Data = {
          name: s3Name.trim() || 'Primary Storage',
          endpoint: endpoint.trim(),
          access_key: accessKey.trim(),
          secret_key: secretKey.trim(),
          bucket_name: bucketName.trim(),
          region: region.trim() || undefined,
          secure,
          is_default: true,
        };
      }

      await api.completeWizard({
        new_email: newEmail.trim().toLowerCase(),
        verification_code: verificationCode.trim(),
        new_password: newPassword.trim(),
        s3_config: s3Data,
      });

      onComplete();
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message || 'Gagal menyelesaikan konfigurasi.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative my-8 text-white space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white shadow-xl shadow-sky-500/20 mb-1">
            <Sparkles className="w-7 h-7" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
            Wizard Konfigurasi Awal
          </h2>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Selamat datang! Demi keamanan dan fungsionalitas, silakan selesaikan konfigurasi server email, akun admin baru, dan penyimpanan S3 Anda.
          </p>

          {/* Stepper Indicator (3 Langkah) */}
          <div className="flex items-center justify-center gap-2 pt-3 flex-wrap">
            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                step === 1 ? 'bg-sky-500 text-white' : 'bg-slate-800 text-slate-400'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>1. Server Email (SMTP)</span>
            </div>
            <div className="w-4 h-0.5 bg-slate-800 hidden sm:block"></div>
            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                step === 2 ? 'bg-sky-500 text-white' : 'bg-slate-800 text-slate-400'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>2. Akun & Keamanan</span>
            </div>
            <div className="w-4 h-0.5 bg-slate-800 hidden sm:block"></div>
            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                step === 3 ? 'bg-sky-500 text-white' : 'bg-slate-800 text-slate-400'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>3. Penyimpanan S3</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 p-3.5 rounded-2xl flex items-start gap-2.5 text-xs animate-in fade-in duration-150">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* =================================================================== */}
        {/* STEP 1: PENGATURAN SERVER EMAIL (SMTP) */}
        {/* =================================================================== */}
        {step === 1 && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-5 space-y-4">
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-sky-400" />
                  <span>Konfigurasi Server SMTP Email</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Konfigurasi ini diperlukan untuk mengirim kode konfirmasi aktivasi saat Anda mengubah alamat email di langkah berikutnya.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <label className="font-medium text-slate-300">SMTP Host</label>
                  <input
                    type="text"
                    required
                    value={smtpForm.host}
                    onChange={(e) => setSmtpForm({ ...smtpForm, host: e.target.value })}
                    placeholder="misal: smtp.gmail.com atau mail.domain.com"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-slate-300">SMTP Port</label>
                  <input
                    type="number"
                    required
                    value={smtpForm.port}
                    onChange={(e) => setSmtpForm({ ...smtpForm, port: Number(e.target.value) })}
                    placeholder="587 atau 465"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-slate-300">Username / Email Pengirim</label>
                  <input
                    type="text"
                    value={smtpForm.username || ''}
                    onChange={(e) => setSmtpForm({ ...smtpForm, username: e.target.value })}
                    placeholder="user@domain.com"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-slate-300">Password / App Password</label>
                  <input
                    type="password"
                    value={smtpForm.password || ''}
                    onChange={(e) => setSmtpForm({ ...smtpForm, password: e.target.value })}
                    placeholder="Password SMTP"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-slate-300">From Email Address</label>
                  <input
                    type="email"
                    required
                    value={smtpForm.from_email}
                    onChange={(e) => setSmtpForm({ ...smtpForm, from_email: e.target.value })}
                    placeholder="no-reply@domain.com"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-slate-300">From Display Name</label>
                  <input
                    type="text"
                    value={smtpForm.from_name}
                    onChange={(e) => setSmtpForm({ ...smtpForm, from_name: e.target.value })}
                    placeholder="S3 File Manager"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div className="flex items-center gap-4 sm:col-span-2 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                    <input
                      type="checkbox"
                      checked={smtpForm.use_tls}
                      onChange={(e) => setSmtpForm({ ...smtpForm, use_tls: e.target.checked })}
                      className="rounded bg-slate-900 border-slate-700 text-sky-600 focus:ring-sky-500"
                    />
                    <span>Gunakan TLS (STARTTLS port 587)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                    <input
                      type="checkbox"
                      checked={smtpForm.use_ssl}
                      onChange={(e) => setSmtpForm({ ...smtpForm, use_ssl: e.target.checked })}
                      className="rounded bg-slate-900 border-slate-700 text-sky-600 focus:ring-sky-500"
                    />
                    <span>Gunakan SSL (port 465)</span>
                  </label>
                </div>
              </div>

              {/* Uji Coba Pengiriman Email Opsional */}
              <div className="pt-3 border-t border-slate-700/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                    <Send className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Uji Coba Pengiriman Email (Opsional):</span>
                  </span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={smtpTestEmail}
                    onChange={(e) => setSmtpTestEmail(e.target.value)}
                    placeholder="email-tujuan-test@domain.com"
                    className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs placeholder-slate-500 focus:ring-2 focus:ring-sky-500"
                  />
                  <button
                    type="button"
                    onClick={handleTestSMTP}
                    disabled={testingSmtp || !smtpTestEmail.trim()}
                    className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white text-xs font-medium rounded-xl transition-colors flex-shrink-0"
                  >
                    {testingSmtp ? 'Menguji...' : 'Kirim Test'}
                  </button>
                </div>

                {smtpTestResult && (
                  <p
                    className={`text-xs flex items-center gap-1.5 pt-1 ${
                      smtpTestResult.success ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {smtpTestResult.success ? (
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    )}
                    <span>{smtpTestResult.message}</span>
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleNextFromStep1}
                disabled={savingSmtp}
                className="px-6 py-2.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-sky-600/20 disabled:opacity-50"
              >
                <span>{savingSmtp ? 'Menyimpan...' : 'Simpan & Lanjut ke Akun'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* STEP 2: AKUN & KEAMANAN (UPDATE EMAIL & PASSWORD) */}
        {/* =================================================================== */}
        {step === 2 && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-5 space-y-4">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <Mail className="w-4 h-4 text-sky-400" />
                <span>Ubah Email Default</span>
              </h3>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-300">
                  Alamat Email Baru
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="email-anda@domain.com"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleSendCode}
                    disabled={sendingCode || !newEmail.trim()}
                    className="px-4 py-2.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-colors flex-shrink-0"
                  >
                    {sendingCode ? 'Mengirim...' : codeSent ? 'Kirim Ulang' : 'Kirim Kode'}
                  </button>
                </div>
                {codeSent && (
                  <p className="text-[11px] text-emerald-400 flex items-center gap-1 mt-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Kode verifikasi telah dikirim melalui SMTP ke email baru Anda.
                  </p>
                )}
                {devCodeHint && (
                  <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px]">
                    Simulasi Dev: Kode verifikasi adalah <strong>{devCodeHint}</strong>
                  </div>
                )}
              </div>

              {codeSent && (
                <div className="space-y-1.5 animate-in fade-in duration-150">
                  <label className="block text-xs font-medium text-slate-300">
                    Masukkan 6-Digit Kode Konfirmasi
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      maxLength={6}
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      placeholder="123456"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-5 space-y-4">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <Lock className="w-4 h-4 text-indigo-400" />
                <span>Ubah Password Default</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-300">
                    Password Baru
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimal 6 karakter"
                      className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-300">
                    Ulangi Password Baru
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ulangi password"
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-colors flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Kembali ke SMTP</span>
              </button>

              <button
                type="button"
                onClick={handleNextFromStep2}
                className="px-6 py-2.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-sky-600/20"
              >
                <span>Lanjut ke Konfigurasi S3</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* STEP 3: PENYIMPANAN S3 */}
        {/* =================================================================== */}
        {step === 3 && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <Server className="w-4 h-4 text-sky-400" />
                  <span>Tambahkan Penyimpanan S3 Pertama</span>
                </h3>
                <span className="text-[11px] text-slate-400">
                  (Anda dapat menambahkan S3 lain nanti di Pengaturan)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1 sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-300">
                    Nama / Label S3
                  </label>
                  <input
                    type="text"
                    value={s3Name}
                    onChange={(e) => setS3Name(e.target.value)}
                    placeholder="Contoh: Kilat Storage Utama, AWS S3 Prod"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-300">
                    Endpoint Host
                  </label>
                  <input
                    type="text"
                    value={endpoint}
                    onChange={(e) => setEndpoint(e.target.value)}
                    placeholder="s3.example.com atau localhost:9000"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-300">
                    Bucket Name
                  </label>
                  <input
                    type="text"
                    value={bucketName}
                    onChange={(e) => setBucketName(e.target.value)}
                    placeholder="nama-bucket"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-300">
                    Access Key
                  </label>
                  <input
                    type="text"
                    value={accessKey}
                    onChange={(e) => setAccessKey(e.target.value)}
                    placeholder="Access Key S3"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-300">
                    Secret Key
                  </label>
                  <input
                    type="password"
                    value={secretKey}
                    onChange={(e) => setSecretKey(e.target.value)}
                    placeholder="Secret Key S3"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-medium text-slate-300">
                    Region (Opsional)
                  </label>
                  <input
                    type="text"
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    placeholder="us-east-1"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="secureS3"
                    checked={secure}
                    onChange={(e) => setSecure(e.target.checked)}
                    className="rounded bg-slate-900 border-slate-700 text-sky-600 focus:ring-sky-500"
                  />
                  <label htmlFor="secureS3" className="text-xs text-slate-300 cursor-pointer">
                    Gunakan HTTPS (SSL Secure)
                  </label>
                </div>
              </div>

              {/* Uji Koneksi Button & Result */}
              <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-700/60">
                <button
                  type="button"
                  onClick={handleTestS3}
                  disabled={testingS3}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium rounded-xl transition-colors disabled:opacity-50"
                >
                  {testingS3 ? 'Menguji...' : 'Uji Koneksi S3'}
                </button>

                {s3TestResult && (
                  <div
                    className={`text-xs flex items-center gap-1.5 ${
                      s3TestResult.success ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {s3TestResult.success ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <AlertCircle className="w-4 h-4" />
                    )}
                    <span>{s3TestResult.message}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-colors flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Kembali ke Akun</span>
              </button>

              <button
                type="button"
                onClick={handleFinishWizard}
                disabled={submitting}
                className="px-6 py-2.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-sky-600/20 disabled:opacity-50"
              >
                <span>{submitting ? 'Menyimpan...' : 'Selesaikan & Masuk'}</span>
                <CheckCircle2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
