import React from 'react';
import type { WireColor, TerminalId } from '../types/electric';
import { Cable, X, Trash2, Eye, EyeOff, RotateCcw, Route } from 'lucide-react';

interface WiringToolbarProps {
  selectedColor: WireColor;
  onSelectColor: (color: WireColor) => void;
  activeTerminal: TerminalId | null;
  onCancelActiveTerminal: () => void;
  wiresCount: number;
  showWires: boolean;
  onToggleShowWires: () => void;
  onClearWires: () => void;
  onUndoWire: () => void;
  routingMode?: 'side' | 'direct';
  onToggleRoutingMode?: () => void;
}

export const WIRE_COLOR_CONFIG: Record<
  WireColor,
  { label: string; name: string; hex: string; bgClass: string; borderClass: string; role: string }
> = {
  black: {
    label: 'Чорний',
    name: 'Фаза L1 (Чорний)',
    hex: '#1e293b',
    bgClass: 'bg-slate-900 text-white',
    borderClass: 'border-slate-800',
    role: 'L1',
  },
  gray: {
    label: 'Сірий',
    name: 'Фаза L2 (Сірий)',
    hex: '#94a3b8',
    bgClass: 'bg-slate-200 text-slate-800',
    borderClass: 'border-slate-300',
    role: 'L2',
  },
  red: {
    label: 'Червоний',
    name: 'Фаза L3 / Сигнал (Червоний)',
    hex: '#ef4444',
    bgClass: 'bg-red-600 text-white',
    borderClass: 'border-red-600',
    role: 'L3',
  },
  blue: {
    label: 'Синій',
    name: 'Нуль N (Синій)',
    hex: '#3b82f6',
    bgClass: 'bg-blue-600 text-white',
    borderClass: 'border-blue-600',
    role: 'N',
  },
  yellow_green: {
    label: 'Жовто-зелений',
    name: 'Заземлення PE (Жовто-зелений)',
    hex: '#eab308',
    bgClass: 'bg-gradient-to-r from-yellow-400 to-green-500 text-slate-950 font-black',
    borderClass: 'border-yellow-400',
    role: 'PE',
  },
};

export const WiringToolbar: React.FC<WiringToolbarProps> = ({
  selectedColor,
  onSelectColor,
  activeTerminal,
  onCancelActiveTerminal,
  wiresCount,
  showWires,
  onToggleShowWires,
  onClearWires,
  onUndoWire,
  routingMode = 'side',
  onToggleRoutingMode,
}) => {
  return (
    <div className="flex flex-col gap-1.5 shrink-0">
      {/* Заголовок блоку Проводка (h-5) */}
      <div className="h-5 flex items-center justify-between gap-2">
        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 whitespace-nowrap">
          <Cable className="w-3.5 h-3.5 text-amber-500" />
          Проводка
        </label>

        {activeTerminal && (
          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-amber-100 border border-amber-300 rounded-md animate-pulse text-[11px] font-bold text-amber-900 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping shrink-0" />
            <span className="truncate max-w-[170px] sm:max-w-none">
              Клему обрано. Клікніть 2-гу!
            </span>
            <button
              type="button"
              onClick={onCancelActiveTerminal}
              className="p-0.5 rounded hover:bg-amber-200 text-amber-800 cursor-pointer ml-0.5"
              title="Скасувати вибір клеми"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* Дворівневий контейнер (висота h-[56px]): кольори зверху, опції під ними */}
      <div className="flex flex-col gap-1 h-[56px] justify-between">
        {/* 1. Верхній рядок: Кольори */}
        <div className="flex items-center gap-1 bg-slate-50 p-0.5 rounded-lg border border-slate-200 h-[26px] w-fit">
          {(Object.keys(WIRE_COLOR_CONFIG) as WireColor[]).map((cKey) => {
            const cfg = WIRE_COLOR_CONFIG[cKey];
            const isSelected = selectedColor === cKey;

            return (
              <button
                key={cKey}
                type="button"
                onClick={() => onSelectColor(cKey)}
                className={`h-5 px-1.5 text-[11px] rounded flex items-center gap-1 transition-all cursor-pointer ${
                  cfg.bgClass
                } ${
                  isSelected
                    ? 'ring-2 ring-amber-500 shadow-xs scale-105 font-black'
                    : 'opacity-85 hover:opacity-100 font-semibold'
                }`}
                title={cfg.name}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full border border-black/20 shadow-inner shrink-0"
                  style={{
                    background:
                      cKey === 'yellow_green'
                        ? 'repeating-linear-gradient(45deg, #eab308, #eab308 2px, #22c55e 2px, #22c55e 4px)'
                        : cfg.hex,
                  }}
                />
                <span className="text-[10px] leading-none">{cfg.role}</span>
              </button>
            );
          })}
        </div>

        {/* 2. Нижній рядок (під кольорами): Канал збоку, дротів, сховати */}
        <div className="flex items-center gap-1.5 h-[26px] flex-nowrap">
          {/* Трасування: Канал збоку / Під модулями */}
          {onToggleRoutingMode && (
            <button
              type="button"
              onClick={onToggleRoutingMode}
              className={`h-full flex items-center gap-1 px-2 text-[11px] font-bold rounded-lg border transition-all cursor-pointer shadow-xs whitespace-nowrap ${
                routingMode === 'side'
                  ? 'bg-amber-100/80 hover:bg-amber-100 text-amber-900 border-amber-300'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
              title={
                routingMode === 'side'
                  ? 'Трасування: через бічні кабель-канали'
                  : 'Трасування: прямо під модулями'
              }
            >
              <Route className="w-3 h-3 text-amber-600 stroke-[2.5]" />
              <span>{routingMode === 'side' ? 'Канал збоку' : 'Під модулями'}</span>
            </button>
          )}

          {/* Кількість дротів */}
          <div className="h-full flex items-center px-2 text-[11px] font-medium text-slate-700 bg-slate-50 rounded-lg border border-slate-200 shadow-xs whitespace-nowrap">
            <span>Дротів:&nbsp;</span>
            <strong className="text-amber-600 font-bold">{wiresCount}</strong>
          </div>

          {/* Сховати / Показати дроти */}
          <button
            type="button"
            onClick={onToggleShowWires}
            className="h-full flex items-center gap-1 px-2 text-[11px] font-semibold rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 hover:border-slate-300 cursor-pointer shadow-xs transition whitespace-nowrap"
            title={showWires ? 'Сховати проводку' : 'Показати проводку'}
          >
            {showWires ? <EyeOff className="w-3 h-3 text-slate-500" /> : <Eye className="w-3 h-3 text-slate-500" />}
            <span>{showWires ? 'Сховати' : 'Показати'}</span>
          </button>

          {/* Скасувати та Очистити дроти */}
          {wiresCount > 0 && (
            <>
              <button
                type="button"
                onClick={onUndoWire}
                className="h-full flex items-center gap-1 px-1.5 text-[11px] font-semibold rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 hover:border-slate-300 cursor-pointer shadow-xs transition whitespace-nowrap"
                title="Скасувати останній провід"
              >
                <RotateCcw className="w-3 h-3 text-slate-400" />
                <span>Назад</span>
              </button>

              <button
                type="button"
                onClick={onClearWires}
                className="h-full flex items-center gap-1 px-1.5 text-[11px] font-semibold rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 cursor-pointer shadow-xs transition whitespace-nowrap"
                title="Очистити всі проводи"
              >
                <Trash2 className="w-3 h-3" />
                <span>Очистити</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
