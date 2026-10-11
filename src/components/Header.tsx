import { Zap } from 'lucide-react';
import { GoogleAuth } from './GoogleAuth';
import type { GoogleUserProfile } from '../types/auth';
import type { SavedSwitchboard } from '../types/electric';

interface HeaderProps {
  onReset?: () => void;
  onLoadPreset?: () => void;
  onPrintLabels?: () => void;
  onExportSpec?: () => void;
  onPrintScheme?: () => void;
  totalModulesPlaced?: number;
  totalCapacity?: number;
  onUserChange?: (user: GoogleUserProfile | null) => void;
  savedSwitchboards?: SavedSwitchboard[];
  onLoadSwitchboard?: (switchboard: SavedSwitchboard) => void;
  onDeleteSwitchboard?: (id: string) => void;
  onSaveSwitchboard?: () => void;
  onExportFile?: () => void;
  onImportFile?: (file: File) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onUserChange,
  savedSwitchboards,
  onLoadSwitchboard,
  onDeleteSwitchboard,
  onSaveSwitchboard,
  onExportFile,
  onImportFile,
}) => {
  return (
    <header className="no-print border-b border-slate-200 bg-white/95 backdrop-blur px-4 py-3 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Logo & App Name */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center shadow-md shadow-amber-500/20">
            <Zap className="w-6 h-6 text-slate-950 fill-slate-950" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
              ElectroBox{' '}
              <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-mono font-bold border border-amber-300">
                PRO
              </span>
              <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono font-semibold border border-slate-200">
                v0.2
              </span>
            </h1>
            <p className="text-xs text-slate-500">
              Проектування та розрахунок електричного щитка
            </p>
          </div>
        </div>

        {/* User Menu / Profile (aligned to the right) */}
        <div className="flex items-center justify-end ml-auto">
          <GoogleAuth
            onUserChange={onUserChange}
            savedSwitchboards={savedSwitchboards}
            onLoadSwitchboard={onLoadSwitchboard}
            onDeleteSwitchboard={onDeleteSwitchboard}
            onSaveCurrentSwitchboard={onSaveSwitchboard}
            onExportFile={onExportFile}
            onImportFile={onImportFile}
          />
        </div>
      </div>
    </header>
  );
};
