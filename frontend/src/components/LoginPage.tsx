import React, { useState } from 'react';
import { Database, Lock, Mail, Eye, EyeOff, LogIn, AlertCircle, ShieldCheck } from 'lucide-react';
import { api } from '../services/api';
import { User } from '../types';

interface LoginPageProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Harap masukkan email dan password.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await api.login(email.trim(), password);
      onLoginSuccess(res.user);
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
        err?.message ||
        'Gagal login. Pastikan email dan password Anda benar.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Decorative background glow */}
      <div className="absolute w-[500px] h-[500px] bg-sky-500/10 rounded-full blur-3xl pointer-events-none -top-40 -left-20"></div>
      <div className="absolute w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -bottom-40 -right-20"></div>

      <div className="max-w-md w-full space-y-8 relative z-10">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white shadow-xl shadow-sky-500/20 mb-2">
            <Database className="w-8 h-8" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            S3 File Manager
          </h2>
          <div className="flex items-center justify-center gap-2 text-xs">
            <span className="px-2.5 py-0.5 rounded-full bg-sky-950 border border-sky-800 text-sky-400 font-medium">
              FastAPI + MinIO
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-950 border border-indigo-800 text-indigo-400 font-medium flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              PostgreSQL Auth
            </span>
          </div>
          <p className="text-xs text-slate-400 pt-1">
            Masuk dengan akun terdaftar untuk mengelola file dan folder S3 Anda
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-slate-800/90 backdrop-blur-xl border border-slate-700/60 rounded-3xl p-7 shadow-2xl space-y-6">
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 p-3.5 rounded-2xl flex items-start gap-2.5 text-xs animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-300">
                Email Pengguna
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-900/70 border border-slate-700 rounded-xl text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-300">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-900/70 border border-slate-700 rounded-xl text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 active:from-sky-600 active:to-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-sky-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              <span>{loading ? 'Memverifikasi...' : 'Masuk ke Aplikasi'}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
