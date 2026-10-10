import React from 'react';
import type { WireColor, TerminalId } from '../types/electric';
import { Cable, X, Trash2, Eye, EyeOff, RotateCcw } from 'lucide-react';

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
    role: 'Фаза L1',
  },
  gray: {
    label: 'Сірий',
    name: 'Фаза L2 (Сірий)',
    hex: '#94a3b8',
    bgClass: 'bg-slate-200 text-slate-800',
    borderClass: 'border-slate-300',
    role: 'Фаза L2',
  },
  red: {
    label: 'Червоний',
    name: 'Фаза L3 / Сигнал (Червоний)',
    hex: '#ef4444',
    bgClass: 'bg-red-600 text-white',
    borderClass: 'border-red-600',
    role: 'Фаза L3',
  },
  blue: {
    label: 'Синій',
    name: 'Нуль N (Синій)',
    hex: '#3b82f6',
    bgClass: 'bg-blue-600 text-white',
    borderClass: 'border-blue-600',
    role: 'Нуль (N)',
  },
  yellow_green: {
    label: 'Жовто-зелений',
    name: 'Заземлення PE (Жовто-зелений)',
    hex: '#eab308',
    bgClass: 'bg-gradient-to-r from-yellow-400 to-green-500 text-slate-950 font-black',
    borderClass: 'border-yellow-400',
    role: 'Земля (PE)',
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
}) => {
  return (
    <div className="bg-slate-100 border-b border-slate-200 px-4 py-2.5 shadow-xs">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        
        {/* Left Side: Wire Controls & Prompt/Status */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Wire Controls */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-700 px-2 py-1 bg-white rounded border border-slate-200">
              Дротів: <strong className="text-amber-600 font-bold">{wiresCount}</strong>
            </span>

            <button
              type="button"
              onClick={onToggleShowWires}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 cursor-pointer shadow-xs"
              title={showWires ? 'Сховати проводку' : 'Показати проводку'}
            >
              {showWires ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{showWires ? 'Сховати' : 'Показати'}</span>
            </button>

            {wiresCount > 0 && (
              <>
                <button
                  type="button"
                  onClick={onUndoWire}
                  className="flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 cursor-pointer shadow-xs"
                  title="Скасувати останній провід"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                  <span className="hidden sm:inline">Назад</span>
                </button>

                <button
                  type="button"
                  onClick={onClearWires}
                  className="flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 cursor-pointer shadow-xs"
                  title="Очистити всі проводи"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Очистити</span>
                </button>
              </>
            )}
          </div>

          {/* Active wiring prompt state */}
          {activeTerminal ? (
            <div className="flex items-center gap-2 px-3 py-1 bg-amber-100 border border-amber-300 rounded-lg animate-pulse text-xs text-amber-900">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              <span>
                Клему обрано ({activeTerminal.terminalType === 'top' ? 'верхня' : activeTerminal.terminalType === 'bottom' ? 'нижня' : 'шина'}).{' '}
                <strong>Клікніть другу клему для з'єднання!</strong>
              </span>
              <button
                type="button"
                onClick={onCancelActiveTerminal}
                className="ml-2 p-0.5 rounded bg-white hover:bg-slate-200 text-slate-700 cursor-pointer border border-slate-300"
                title="Скасувати"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-600 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
              <span>💡 Клікніть на будь-яку <strong>клему</strong> модуля, щоб прокласти провід</span>
            </div>
          )}
        </div>

        {/* Right Side: Colors selector */}
        <div className="flex items-center gap-2 flex-wrap ml-auto justify-end">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mr-1">
            <Cable className="w-4 h-4 text-amber-500" />
            <span>Колір проводу:</span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {(Object.keys(WIRE_COLOR_CONFIG) as WireColor[]).map((cKey) => {
              const cfg = WIRE_COLOR_CONFIG[cKey];
              const isSelected = selectedColor === cKey;

              return (
                <button
                  key={cKey}
                  type="button"
                  onClick={() => onSelectColor(cKey)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg border-2 transition-all cursor-pointer shadow-xs ${
                    cfg.bgClass
                  } ${isSelected ? 'ring-2 ring-amber-500 scale-105 font-bold shadow-md' : 'opacity-85 hover:opacity-100 hover:scale-102'} ${
                    cfg.borderClass
                  }`}
                  title={cfg.name}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full border border-black/20 shadow-inner"
                    style={{
                      background:
                        cKey === 'yellow_green'
                          ? 'repeating-linear-gradient(45deg, #eab308, #eab308 3px, #22c55e 3px, #22c55e 6px)'
                          : cfg.hex,
                    }}
                  />
                  <span>{cfg.label}</span>
                  <span className="text-[10px] opacity-80 font-mono">({cfg.role})</span>
                </button>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
};
