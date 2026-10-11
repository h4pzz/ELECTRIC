import React, { useState, useEffect } from 'react';
import { Bookmark, X, Check, Box, Cpu } from 'lucide-react';
import type { GoogleUserProfile } from '../types/auth';
import type { EnclosureConfig } from '../types/electric';

interface SaveSwitchboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
  user: GoogleUserProfile | null;
  config: EnclosureConfig;
  totalModules: number;
  totalCapacity: number;
}

export const SaveSwitchboardModal: React.FC<SaveSwitchboardModalProps> = ({
  isOpen,
  onClose,
  onSave,
  user,
  config,
  totalModules,
  totalCapacity,
}) => {
  const [name, setName] = useState(config.title || 'Електричний щит');

  useEffect(() => {
    if (isOpen) {
      setName(config.title || 'Електричний щит');
    }
  }, [isOpen, config.title]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave(name.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Bookmark className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Зберегти</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Назва конфігурації
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Наприклад: Щит квартири"
              autoFocus
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-sm font-semibold text-slate-900 outline-none transition"
            />
          </div>

          {/* Параметри щитка */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
            <div className="flex items-center gap-1.5">
              <Box className="w-4 h-4 text-amber-500" />
              <span>
                {config.mountType === 'flush' ? 'Внутрішній' : 'Зовнішній'} • {config.rows}×{config.modulesPerRow} ({config.ipRating})
              </span>
            </div>
            <div className="flex items-center gap-1 font-bold text-slate-800">
              <Cpu className="w-4 h-4 text-emerald-600" />
              <span>{totalModules} / {totalCapacity} мод.</span>
            </div>
          </div>

          {/* Статус акаунта */}
          {user ? (
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
              {user.picture ? (
                <img
                  src={user.picture}
                  alt={user.name}
                  className="w-6 h-6 rounded-full object-cover ring-1 ring-emerald-300"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-[10px]">
                  {user.name[0]}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <span className="font-bold">Збережеться в акаунті:</span>{' '}
                <span className="truncate">{user.name} ({user.email})</span>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
              <p className="font-bold">Вхід у Google акаунт</p>
              <p className="text-[11px] text-amber-700 mt-0.5">
                Конфігурацію буде збережено у вашому браузері. Увійдіть через Google (вгорі праворуч), щоб отримати доступ з будь-якого пристрою.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              Скасувати
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Зберегти</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
