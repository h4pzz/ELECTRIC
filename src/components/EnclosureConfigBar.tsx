import React from 'react';
import type { EnclosureConfig } from '../types/electric';
import { Box, Layers, ShieldCheck, Eye } from 'lucide-react';

interface EnclosureConfigBarProps {
  config: EnclosureConfig;
  onChange: (updated: Partial<EnclosureConfig>) => void;
  children?: React.ReactNode;
}

export const EnclosureConfigBar: React.FC<EnclosureConfigBarProps> = ({ config, onChange, children }) => {
  const totalExtra = Object.values(config.railExtraModules || {}).reduce((sum, v) => sum + v, 0);
  const totalModulesCount = config.rows * config.modulesPerRow + totalExtra;

  return (
    <div className="bg-white border-b border-slate-200 px-4 md:px-6 py-2.5 shadow-xs overflow-x-auto">
      <div className="w-full max-w-7xl mx-auto flex items-start gap-[20px] flex-nowrap min-w-max">
        
        {/* 1. Тип монтажу (Внутрішній / Зовнішній вертикально) */}
        <div className="flex flex-col gap-1.5 shrink-0">
          <label className="h-5 text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Box className="w-3.5 h-3.5 text-amber-500" />
            Тип щитка
          </label>
          <div className="inline-flex flex-col p-0.5 bg-slate-100 rounded-lg border border-slate-200 h-[56px] justify-between">
            <button
              type="button"
              onClick={() => onChange({ mountType: 'flush' })}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all cursor-pointer text-center leading-tight ${
                config.mountType === 'flush'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Внутрішній
            </button>
            <button
              type="button"
              onClick={() => onChange({ mountType: 'surface' })}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all cursor-pointer text-center leading-tight ${
                config.mountType === 'surface'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Зовнішній
            </button>
          </div>
        </div>

        {/* Ледь помітний вертикальний розділювач 1px між Тип та Кількість */}
        <div className="w-[1px] h-[52px] bg-slate-200/70 mt-6.5 shrink-0" />

        {/* 2. Кількість рядів та модулів (Разом під Ряди) */}
        <div className="flex flex-col gap-1.5 shrink-0">
          <label className="h-5 text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-amber-500" />
            Кількість рядів та модулів
          </label>
          <div className="flex flex-col gap-1 h-[56px] justify-between">
            {/* Верхній рядок: Ряди × Мод./ряд */}
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-200 h-[26px]">
                <span className="text-[11px] text-slate-500">Ряди:</span>
                <select
                  value={config.rows}
                  onChange={(e) => onChange({ rows: Number(e.target.value) })}
                  className="bg-transparent text-[11px] font-bold text-slate-800 focus:outline-none cursor-pointer pr-0.5"
                >
                  {[1, 2, 3, 4, 5, 6].map((num) => (
                    <option key={num} value={num} className="bg-white text-slate-800">
                      {num} {num === 1 ? 'ряд' : num < 5 ? 'ряди' : 'рядів'}
                    </option>
                  ))}
                </select>
              </div>

              <span className="text-slate-400 text-xs">×</span>

              <div className="flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-200 h-[26px]">
                <span className="text-[11px] text-slate-500">Мод./ряд:</span>
                <select
                  value={config.modulesPerRow}
                  onChange={(e) => onChange({ modulesPerRow: Number(e.target.value) })}
                  className="bg-transparent text-[11px] font-bold text-slate-800 focus:outline-none cursor-pointer pr-0.5"
                >
                  {[8, 12, 14, 18, 24].map((num) => (
                    <option key={num} value={num} className="bg-white text-slate-800">
                      {num} мод
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Нижній рядок: Разом під Ряди */}
            <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg h-[24px] w-fit">
              <span className="text-[11px] text-amber-900 font-medium">
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

        {/* Ледь помітний вертикальний розділювач 1px між Кількість та Захист */}
        <div className="w-[1px] h-[52px] bg-slate-200/70 mt-6.5 shrink-0" />

        {/* 3. Ступінь захисту (тільки IP 40 / IP 65) */}
        <div className="flex flex-col gap-1.5 shrink-0">
          <label className="h-5 text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
            Захист
          </label>
          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg px-2 h-[56px]">
            <select
              value={config.ipRating}
              onChange={(e) => onChange({ ipRating: e.target.value as any })}
              className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer pr-1"
            >
              <option value="IP40">IP 40</option>
              <option value="IP65">IP 65</option>
            </select>
          </div>
        </div>

        {/* Ледь помітний вертикальний розділювач 1px між Захист та Дверцята */}
        <div className="w-[1px] h-[52px] bg-slate-200/70 mt-6.5 shrink-0" />

        {/* 4. Дверцята */}
        <div className="flex flex-col gap-1.5 shrink-0">
          <label className="h-5 text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-amber-500" />
            Дверцята
          </label>
          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg px-2 h-[56px]">
            <select
              value={config.doorType}
              onChange={(e) => onChange({ doorType: e.target.value as any })}
              className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer pr-1"
            >
              <option value="white">Білі глухі</option>
              <option value="transparent">Прозорі</option>
            </select>
          </div>
        </div>

        {/* 5. Блок Проводка (вирівняно по правому краю) */}
        {children && (
          <div className="ml-auto shrink-0 flex items-start">
            {children}
          </div>
        )}

      </div>
    </div>
  );
};
