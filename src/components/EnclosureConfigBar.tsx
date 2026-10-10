import React from 'react';
import type { EnclosureConfig } from '../types/electric';
import { Box, Layers, Grid, ShieldCheck, Eye } from 'lucide-react';


interface EnclosureConfigBarProps {
  config: EnclosureConfig;
  onChange: (updated: Partial<EnclosureConfig>) => void;
}

export const EnclosureConfigBar: React.FC<EnclosureConfigBarProps> = ({ config, onChange }) => {
  const PRESETS = [
    { label: '12M (1×12)', rows: 1, modulesPerRow: 12 },
    { label: '24M (2×12)', rows: 2, modulesPerRow: 12 },
    { label: '36M (3×12)', rows: 3, modulesPerRow: 12 },
    { label: '48M (4×12)', rows: 4, modulesPerRow: 12 },
    { label: '54M (3×18)', rows: 3, modulesPerRow: 18 },
    { label: '70M (5×14)', rows: 5, modulesPerRow: 14 },
    { label: '72M (4×18)', rows: 4, modulesPerRow: 18 },
  ];

  const totalExtra = Object.values(config.railExtraModules || {}).reduce((sum, v) => sum + v, 0);
  const totalModulesCount = config.rows * config.modulesPerRow + totalExtra;

  return (
    <div className="bg-white border-b border-slate-200 p-3.5 shadow-xs">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
        
        {/* Крок 1: Тип монтажу */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Box className="w-3.5 h-3.5 text-amber-500" />
            1. Тип щитка
          </label>
          <div className="inline-flex p-1 bg-slate-100 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => onChange({ mountType: 'flush' })}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                config.mountType === 'flush'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Внутрішній (врізний)
            </button>
            <button
              type="button"
              onClick={() => onChange({ mountType: 'surface' })}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                config.mountType === 'surface'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Зовнішній (навісний)
            </button>
          </div>
        </div>

        {/* Крок 2: Ряди та модулі в рядку */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-amber-500" />
            2. Кількість рядів та модулів
          </label>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200">
              <span className="text-xs text-slate-500">Ряди:</span>
              <select
                value={config.rows}
                onChange={(e) => onChange({ rows: Number(e.target.value) })}
                className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer pr-1"
              >
                {[1, 2, 3, 4, 5, 6].map((num) => (
                  <option key={num} value={num} className="bg-white text-slate-800">
                    {num} {num === 1 ? 'ряд' : num < 5 ? 'ряди' : 'рядів'}
                  </option>
                ))}
              </select>
            </div>

            <span className="text-slate-400">×</span>

            <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-lg border border-slate-200">
              <span className="text-xs text-slate-500">Мод./ряд:</span>
              <select
                value={config.modulesPerRow}
                onChange={(e) => onChange({ modulesPerRow: Number(e.target.value) })}
                className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer pr-1"
              >
                {[8, 12, 14, 18, 24].map((num) => (
                  <option key={num} value={num} className="bg-white text-slate-800">
                    {num} мод
                  </option>
                ))}
              </select>
            </div>

            <div className="hidden lg:flex items-center gap-1 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
              <span className="text-xs text-amber-900 font-medium">
                Разом: <strong className="text-amber-700 font-bold">{totalModulesCount}</strong> мод.
                {totalExtra > 0 && (
                  <span className="text-[10px] text-amber-700 font-normal ml-0.5">
                    ({config.rows * config.modulesPerRow}+{totalExtra})
                  </span>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Швидкі пресети типорозмірів */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Grid className="w-3.5 h-3.5 text-amber-500" />
            Популярні розміри
          </label>
          <div className="flex flex-wrap items-center gap-1.5">
            {PRESETS.map((p) => {
              const isActive = config.rows === p.rows && config.modulesPerRow === p.modulesPerRow;
              return (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => onChange({ rows: p.rows, modulesPerRow: p.modulesPerRow })}
                  className={`px-2.5 py-1 text-xs rounded-md border transition cursor-pointer ${
                    isActive
                      ? 'bg-amber-500 text-slate-950 border-amber-500 font-bold shadow-xs'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Ступінь захисту та Дверцята */}
        <div className="hidden xl:flex items-center gap-3 border-l border-slate-200 pl-4">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-slate-500" /> Захист
            </span>
            <select
              value={config.ipRating}
              onChange={(e) => onChange({ ipRating: e.target.value as any })}
              className="bg-slate-50 text-xs text-slate-800 border border-slate-200 rounded px-2 py-1 focus:outline-none"
            >
              <option value="IP40">IP40 (Квартира)</option>
              <option value="IP65">IP65 (Вологозахист)</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
              <Eye className="w-3 h-3 text-slate-500" /> Дверцята
            </span>
            <select
              value={config.doorType}
              onChange={(e) => onChange({ doorType: e.target.value as any })}
              className="bg-slate-50 text-xs text-slate-800 border border-slate-200 rounded px-2 py-1 focus:outline-none"
            >
              <option value="white">Білі глухі</option>
              <option value="transparent">Прозорі димчасті</option>
            </select>
          </div>
        </div>

      </div>
    </div>
  );
};
