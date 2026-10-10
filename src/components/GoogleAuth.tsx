import React, { useState, useEffect, useRef } from 'react';
import { LogOut, User as UserIcon, ChevronDown, CheckCircle2, Folder, FolderOpen, Trash2 } from 'lucide-react';
import { GOOGLE_CLIENT_ID } from '../config/auth';
import type { GoogleUserProfile } from '../types/auth';
import type { SavedSwitchboard } from '../types/electric';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              type?: 'standard' | 'icon';
              theme?: 'outline' | 'filled_blue' | 'filled_black';
              size?: 'large' | 'medium' | 'small';
              text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
              shape?: 'rectangular' | 'pill' | 'circle' | 'square';
              logo_alignment?: 'left' | 'center';
              width?: number | string;
              locale?: string;
            }
          ) => void;
          disableAutoSelect: () => void;
        };
      };
    };
  }
}

const STORAGE_KEY_USER = 'electrobox_user_v1';

// Безпечне декодування payload JWT токена від Google
function parseJwt(token: string): GoogleUserProfile | null {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload) as GoogleUserProfile;
  } catch (err) {
    console.error('Помилка парсингу Google токена:', err);
    return null;
  }
}

interface GoogleAuthProps {
  onUserChange?: (user: GoogleUserProfile | null) => void;
  savedSwitchboards?: SavedSwitchboard[];
  onLoadSwitchboard?: (switchboard: SavedSwitchboard) => void;
  onDeleteSwitchboard?: (id: string) => void;
}

export const GoogleAuth: React.FC<GoogleAuthProps> = ({
  onUserChange,
  savedSwitchboards = [],
  onLoadSwitchboard,
  onDeleteSwitchboard,
}) => {
  const [user, setUser] = useState<GoogleUserProfile | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_USER);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const buttonContainerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Закриття меню при кліку поза ним
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Синхронізація з батьківським компонентом
  useEffect(() => {
    onUserChange?.(user);
  }, [user, onUserChange]);

  // Ініціалізація Google Identity Services
  useEffect(() => {
    if (user) return; // Якщо користувач уже увійшов, кнопку рендерити не потрібно

    let intervalId: number | undefined;

    const initGoogleSignIn = () => {
      if (!window.google?.accounts?.id || !buttonContainerRef.current) {
        return false;
      }

      try {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response) => {
            if (response.credential) {
              const profile = parseJwt(response.credential);
              if (profile) {
                setUser(profile);
                try {
                  localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(profile));
                } catch (e) {
                  console.warn('Не вдалося зберегти профіль в localStorage:', e);
                }
              }
            }
          },
        });

        buttonContainerRef.current.innerHTML = '';
        window.google.accounts.id.renderButton(buttonContainerRef.current, {
          theme: 'outline',
          size: 'medium',
          type: 'standard',
          shape: 'rectangular',
          text: 'signin_with',
          logo_alignment: 'left',
          locale: 'uk',
        });

        return true;
      } catch (err) {
        console.error('Помилка ініціалізації Google Sign-In:', err);
        return false;
      }
    };

    // Спробувати відразу
    const initialized = initGoogleSignIn();
    if (!initialized) {
      // Якщо скрипт ще завантажується, перевіряти кожні 150мс
      intervalId = window.setInterval(() => {
        if (initGoogleSignIn()) {
          clearInterval(intervalId);
        }
      }, 150);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [user]);

  const handleLogout = () => {
    try {
      window.google?.accounts?.id?.disableAutoSelect();
      localStorage.removeItem(STORAGE_KEY_USER);
    } catch (e) {
      console.warn('Помилка при виході:', e);
    }
    setUser(null);
    setIsDropdownOpen(false);
  };

  if (!user) {
    return (
      <div className="flex items-center">
        {/* Контейнер для офіційної кнопки Google Sign-In */}
        <div ref={buttonContainerRef} className="min-h-[36px] flex items-center" />
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Кнопка профілю користувача */}
      <button
        type="button"
        onClick={() => setIsDropdownOpen((prev) => !prev)}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition cursor-pointer shadow-xs group"
        title={user.email}
      >
        {user.picture ? (
          <img
            src={user.picture}
            alt={user.name}
            className="w-6 h-6 rounded-full object-cover ring-1 ring-slate-200"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-xs">
            {user.name ? user.name[0].toUpperCase() : <UserIcon className="w-3.5 h-3.5" />}
          </div>
        )}
        <span className="text-xs font-semibold text-slate-700 group-hover:text-slate-900 max-w-[120px] truncate hidden sm:inline">
          {user.given_name || user.name.split(' ')[0]}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-transform" />
      </button>

      {/* Випадаюче меню профілю */}
      {isDropdownOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 p-3 z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            {user.picture ? (
              <img
                src={user.picture}
                alt={user.name}
                className="w-10 h-10 rounded-full object-cover ring-2 ring-amber-400/30"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-sm">
                {user.name ? user.name[0].toUpperCase() : <UserIcon className="w-5 h-5" />}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-slate-900 truncate">{user.name}</p>
              <p className="text-xs text-slate-500 truncate">{user.email}</p>
            </div>
          </div>

          <div className="py-2 flex items-center gap-2 text-[11px] text-emerald-700 bg-emerald-50 rounded-lg px-2.5 my-2 border border-emerald-100">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Вхід виконано через Google</span>
          </div>

          {/* Розділ збережених щитків */}
          <div className="py-2 border-t border-b border-slate-100 my-2">
            <div className="flex items-center justify-between mb-2 px-0.5">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Folder className="w-3.5 h-3.5 text-amber-500" />
                Збережені щитки
              </span>
              <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-full">
                {savedSwitchboards.length}
              </span>
            </div>

            {savedSwitchboards.length === 0 ? (
              <div className="py-3 px-2 text-center bg-slate-50 rounded-lg border border-dashed border-slate-200">
                <p className="text-xs text-slate-500 font-medium">Немає збережених щитків</p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Натисніть кнопку «Зберегти щиток» на панелі щитка
                </p>
              </div>
            ) : (
              <div className="max-h-60 overflow-y-auto space-y-1.5 pr-0.5">
                {savedSwitchboards.map((sw) => (
                  <div
                    key={sw.id}
                    className="p-2 rounded-lg border border-slate-200 hover:border-amber-400 bg-slate-50/50 hover:bg-amber-50/30 transition flex flex-col gap-1.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-900 truncate" title={sw.name}>
                          {sw.name}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {new Date(sw.updatedAt || sw.createdAt).toLocaleString('uk-UA', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Видалити збережений щиток «${sw.name}»?`)) {
                            onDeleteSwitchboard?.(sw.id);
                          }
                        }}
                        className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                        title="Видалити"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between gap-1 pt-1 border-t border-slate-200/60">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-white text-slate-600 font-medium border border-slate-200">
                        {sw.totalModules} мод. • {sw.config.rows}×{sw.config.modulesPerRow}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          onLoadSwitchboard?.(sw);
                          setIsDropdownOpen(false);
                        }}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-2xs transition cursor-pointer"
                        title="Завантажити цей щиток у редактор"
                      >
                        <FolderOpen className="w-3 h-3" />
                        <span>Відкрити</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full mt-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer border border-transparent hover:border-rose-100"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Вийти з акаунта</span>
          </button>
        </div>
      )}
    </div>
  );
};
