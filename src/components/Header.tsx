import { Zap, RotateCcw, Sparkles, Printer, Tag, FileText } from 'lucide-react';

interface HeaderProps {
  onReset: () => void;
  onLoadPreset: () => void;
  onPrintLabels: () => void;
  onExportSpec: () => void;
  onPrintScheme: () => void;
  totalModulesPlaced: number;
  totalCapacity: number;
}

export const Header: React.FC<HeaderProps> = ({
  onReset,
  onLoadPreset,
  onPrintLabels,
  onExportSpec,
  onPrintScheme,
  totalModulesPlaced,
  totalCapacity,
}) => {
  return (
    <header className="no-print border-b border-slate-200 bg-white/95 backdrop-blur px-4 py-3 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Logo & App Name */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center shadow-md shadow-amber-500/20">
            <Zap className="w-6 h-6 text-slate-950 fill-slate-950" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              ElectroBox <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-mono font-bold border border-amber-300">PRO</span>
            </h1>
            <p className="text-xs text-slate-500">
              Проектування та розрахунок електричного щитка
            </p>
          </div>
        </div>

        {/* Status Badge */}
        <div className="hidden sm:flex items-center gap-3 px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-xs">
          <span className="text-slate-600">Заповнення щита:</span>
          <span className="font-bold text-slate-800">
            {totalModulesPlaced} / {totalCapacity} мод.
          </span>
          <div className="w-20 bg-slate-200 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                totalModulesPlaced > totalCapacity
                  ? 'bg-rose-500'
                  : totalModulesPlaced === totalCapacity
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, (totalModulesPlaced / (totalCapacity || 1)) * 100)}%` }}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onLoadPreset}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 hover:border-slate-400 transition cursor-pointer shadow-xs"
            title="Завантажити зразок щитка для квартири"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span className="hidden md:inline">Зразок квартири</span>
          </button>

          <button
            onClick={onReset}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white hover:bg-slate-50 text-slate-600 border border-slate-300 hover:border-slate-400 transition cursor-pointer shadow-xs"
            title="Очистити всі модулі"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden md:inline">Очистити</span>
          </button>

          <button
            onClick={onPrintLabels}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition cursor-pointer shadow-xs"
            title="Роздрукувати наліпки для підпису автоматів"
          >
            <Tag className="w-3.5 h-3.5 text-indigo-600" />
            <span>Наліпки</span>
          </button>

          <button
            onClick={onExportSpec}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 transition cursor-pointer shadow-xs"
            title="Переглянути кошторис та специфікацію"
          >
            <FileText className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Кошторис</span>
          </button>

          <button
            onClick={onPrintScheme}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20 transition cursor-pointer"
            title="Роздрукувати схему електричного щитка"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Друк</span>
          </button>
        </div>
      </div>
    </header>
  );
};
