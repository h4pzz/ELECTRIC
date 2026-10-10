import React from 'react';
import type { PlacedModule, TerminalId, WireColor, WireConnection } from '../types/electric';
import { Trash2, Edit2, Copy, ChevronLeft, ChevronRight, Plus, Minus } from 'lucide-react';
import { WIRE_COLOR_CONFIG } from './WiringToolbar';

interface ModuleItemProps {
  module: PlacedModule;
  onEdit: (module: PlacedModule) => void;
  onDelete: (id: string) => void;
  onDuplicate: (module: PlacedModule) => void;
  onMoveLeft: (module: PlacedModule) => void;
  onMoveRight: (module: PlacedModule) => void;
  isFirst: boolean;
  isLast: boolean;
  onTerminalClick?: (terminal: TerminalId) => void;
  onDeleteWire?: (wireId: string) => void;
  activeTerminal?: TerminalId | null;
  connectedTerminals?: Map<string, WireColor[]>; // key: `${terminalType}-${poleIndex}`
  connectedWires?: Map<string, WireConnection[]>; // key: `${terminalType}-${poleIndex}`
  // Drag reordering
  onDragStart?: (moduleId: string) => void;
  onDragEnd?: () => void;
  isDragging?: boolean;
  // Circuit highlighting
  isCircuitHighlighted?: boolean;
  isCircuitDimmed?: boolean;
  highlightedTerminals?: Set<string>; // key: `${terminalType}-${poleIndex}`
}

export const ModuleItem: React.FC<ModuleItemProps> = ({
  module,
  onEdit,
  onDelete,
  onDuplicate,
  onMoveLeft,
  onMoveRight,
  isFirst,
  isLast,
  onTerminalClick,
  onDeleteWire,
  activeTerminal,
  connectedTerminals,
  connectedWires,
  onDragStart,
  onDragEnd,
  isDragging,
  isCircuitHighlighted,
  isCircuitDimmed,
  highlightedTerminals,
}) => {

  const handleDragStart = (e: React.DragEvent) => {
    const payload = JSON.stringify({ type: 'placed-module', module });
    e.dataTransfer.setData('application/json', payload);
    e.dataTransfer.setData('text/plain', payload);
    e.dataTransfer.effectAllowed = 'copyMove';
    onDragStart?.(module.id);
  };

  const handleDragEnd = () => {
    onDragEnd?.();
  };

  const widthPx = module.width * 64;

  const isRcd = module.category === 'rcd' || module.category === 'rcbo';
  const isVoltageRelay = module.category === 'voltage_relay';
  const isBlank = module.category === 'blank';
  const isSwitch = module.category === 'switch';
  const isCrossModule = module.category === 'cross_module';

  // Для крос-модуля: 4 шини для 4P (L1, L2, L3, N) або 2 шини для 2P (L, N), або 1 шина для окремої din-bus
  const crossBarsCount = isCrossModule ? (module.poles === 4 ? 4 : module.poles === 2 ? 2 : 1) : 0;
  const crossTerminalsPerRow = (module.crossModuleTerminalsPerRow || 7) as 4 | 7 | 8 | 11;

  // Для перемикача 1-0-2: по 2 входи на кожен полюс/модуль зверху (Ввід I та Ввід II)
  // та по 1 виходу знизу (Навантаження)
  const topTerminalsCount = isBlank || isCrossModule ? 0 : isSwitch ? module.poles * 2 : module.poles;
  const bottomTerminalsCount = isBlank || isCrossModule ? 0 : module.poles;

  const isTerminalActive = (type: TerminalId['terminalType'], poleIdx: number) => {
    return (
      activeTerminal?.moduleId === module.id &&
      activeTerminal?.terminalType === type &&
      activeTerminal?.poleIndex === poleIdx
    );
  };

  const renderTerminal = (type: TerminalId['terminalType'], poleIdx: number, customTitle?: string, customBadge?: string | null) => {
    const isActive = isTerminalActive(type, poleIdx);
    const termKey = `${type}-${poleIdx}`;
    const termWires = connectedWires?.get(termKey) || [];
    const wireColors = connectedTerminals?.get(termKey) || termWires.map((w) => w.color);
    const isCircuitTerm = highlightedTerminals?.has(termKey);
    const hasWires = termWires.length > 0;

    let termTitle = customTitle || '';
    let termBadge: string | null = customBadge !== undefined ? customBadge : null;

    if (!customTitle) {
      if (isSwitch) {
        if (type === 'top') {
          const isGen = poleIdx % 2 === 1;
          const poleNum = Math.floor(poleIdx / 2) + 1;
          const phaseLabel =
            module.poles === 1
              ? '1Ф'
              : module.poles === 2
              ? (poleNum === 1 ? 'L' : 'N')
              : module.poles === 3
              ? `L${poleNum}`
              : (poleNum === 4 ? 'N' : `L${poleNum}`);
          termTitle = `${isGen ? 'Ввід II (Генератор/Резерв)' : 'Ввід I (Мережа)'} ${phaseLabel}. Підключено проводів: ${termWires.length}/2.`;
          termBadge = isGen ? 'II' : 'I';
        } else {
          const poleNum = poleIdx + 1;
          const phaseLabel =
            module.poles === 1
              ? '1Ф'
              : module.poles === 2
              ? (poleNum === 1 ? 'L' : 'N')
              : module.poles === 3
              ? `L${poleNum}`
              : (poleNum === 4 ? 'N' : `L${poleNum}`);
          termTitle = `Вихід навантаження ${phaseLabel}. Підключено проводів: ${termWires.length}/2.`;
          termBadge = 'OUT';
        }
      } else {
        termTitle = `Клема ${type === 'top' ? 'входу' : 'виходу'} (Полюс ${poleIdx + 1}). Підключено проводів: ${termWires.length}/2.`;
      }
    }

    return (
      <div
        key={`${type}-${poleIdx}`}
        className="relative group/term flex items-center justify-center p-0.5"
      >
        <button
          id={`term-${module.id}-${type}-${poleIdx}`}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onTerminalClick?.({
              moduleId: module.id,
              terminalType: type,
              poleIndex: poleIdx,
            });
          }}
          className={`relative w-3.5 h-3.5 md:w-4 md:h-4 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-inner z-10 ${
            isActive
              ? 'ring-3 ring-amber-400 bg-amber-300 border-amber-600 animate-pulse'
              : isCircuitTerm
              ? 'ring-3 ring-amber-400 bg-amber-300 border-amber-600 shadow-[0_0_10px_#f59e0b] animate-pulse'
              : 'bg-slate-200 hover:bg-white border border-slate-300 hover:border-amber-500 hover:ring-2 hover:ring-amber-400/60'
          }`}
          title={termTitle}
        >
          {/* Позначка I / II / OUT для перемикача 1-0-2 */}
          {termBadge && (
            <span
              className={`absolute pointer-events-none text-[7px] font-mono font-black ${
                type === 'top'
                  ? '-top-2.5 ' + (termBadge === 'I' ? 'text-amber-700' : 'text-orange-700')
                  : '-bottom-2.5 text-slate-500'
              }`}
            >
              {termBadge}
            </span>
          )}

          {/* Гвинт клеми */}
          <div
            className={`w-2 md:w-2.5 h-0.5 rounded transition-transform ${
              type === 'top' || type === 'cm1' || type === 'cm2' ? 'rotate-45' : '-rotate-45'
            } ${isActive || isCircuitTerm ? 'bg-slate-950 font-bold' : 'bg-slate-500 group-hover/term:bg-slate-800'}`}
          />

          {/* Кольорові маркери підключених дротів (до 2 дротів) */}
          {wireColors.length > 0 && !isActive && (
            <div className="no-print absolute -top-1.5 -right-1.5 flex items-center gap-0.5 pointer-events-none z-20">
              {wireColors.map((wColor, idx) => (
                <span
                  key={idx}
                  className="w-2 h-2 rounded-full border border-black/40 shadow-2xs"
                  style={{
                    background:
                      wColor === 'yellow_green'
                        ? 'repeating-linear-gradient(45deg, #eab308, #eab308 2px, #22c55e 2px, #22c55e 4px)'
                        : WIRE_COLOR_CONFIG[wColor]?.hex || '#3b82f6',
                  }}
                />
              ))}
            </div>
          )}
        </button>

        {/* Значки "+" та "-" при наведенні прямо на клему з підключеним проводом */}
        {hasWires && !activeTerminal && (
          <div
            className="no-print absolute z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-1 bg-slate-900/95 text-white px-1.5 py-0.5 rounded-md shadow-xl border border-slate-700 backdrop-blur-xs opacity-0 pointer-events-none group-hover/term:opacity-100 group-hover/term:pointer-events-auto transition-all duration-150 scale-95 group-hover/term:scale-100 whitespace-nowrap"
          >
            {/* Кнопка "+" — додає другий провід з цієї клеми */}
            {termWires.length < 2 ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onTerminalClick?.({
                    moduleId: module.id,
                    terminalType: type,
                    poleIndex: poleIdx,
                  });
                }}
                className="w-4 h-4 rounded bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-xs transition-transform flex items-center justify-center hover:scale-115 active:scale-95"
                title="Додати 2-й провід з цієї клеми"
              >
                <Plus className="w-2.5 h-2.5 stroke-[3]" />
              </button>
            ) : (
              <div
                className="w-4 h-4 rounded bg-slate-800 text-slate-500 cursor-not-allowed flex items-center justify-center"
                title="Максимум 2 проводи на клему (за нормами ПУЕ)"
              >
                <Plus className="w-2.5 h-2.5 stroke-[2] opacity-40" />
              </div>
            )}

            {/* Кнопка(и) "-" — видаляє існуючий провід */}
            {termWires.map((w, idx) => (
              <button
                key={w.id}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteWire?.(w.id);
                }}
                className="h-4 px-1 rounded bg-rose-600 hover:bg-rose-500 text-white cursor-pointer shadow-xs transition-transform flex items-center gap-0.5 hover:scale-110 active:scale-95"
                title={termWires.length > 1 ? `Видалити провід #${idx + 1}` : 'Видалити існуючий провід'}
              >
                <Minus className="w-2.5 h-2.5 stroke-[3]" />
                {termWires.length > 1 && (
                  <span
                    className="w-1.5 h-1.5 rounded-full border border-black/40"
                    style={{
                      background:
                        w.color === 'yellow_green'
                          ? 'repeating-linear-gradient(45deg, #eab308, #eab308 2px, #22c55e 2px, #22c55e 4px)'
                          : WIRE_COLOR_CONFIG[w.color]?.hex || '#3b82f6',
                    }}
                  />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Конфігурація шин для крос-модуля (колір, назва фази, тип клеми)
  const crossModuleBarsConfig: Array<{
    tierType: TerminalId['terminalType'];
    label: string;
    badgeBg: string;
    barBg: string;
    borderCol: string;
  }> =
    crossBarsCount === 4
      ? [
          { tierType: 'cm1', label: 'L1', badgeBg: 'bg-amber-600 text-white', barBg: 'bg-gradient-to-r from-amber-100 to-amber-200/90', borderCol: 'border-amber-400' },
          { tierType: 'cm2', label: 'L2', badgeBg: 'bg-emerald-600 text-white', barBg: 'bg-gradient-to-r from-emerald-100 to-emerald-200/90', borderCol: 'border-emerald-400' },
          { tierType: 'cm3', label: 'L3', badgeBg: 'bg-red-600 text-white', barBg: 'bg-gradient-to-r from-red-100 to-red-200/90', borderCol: 'border-red-400' },
          { tierType: 'cm4', label: 'N', badgeBg: 'bg-blue-600 text-white', barBg: 'bg-gradient-to-r from-blue-100 to-blue-200/90', borderCol: 'border-blue-400' },
        ]
      : crossBarsCount === 2
      ? [
          { tierType: 'cm1', label: 'L', badgeBg: 'bg-amber-600 text-white', barBg: 'bg-gradient-to-r from-amber-100 to-amber-200/90', borderCol: 'border-amber-400' },
          { tierType: 'cm2', label: 'N', badgeBg: 'bg-blue-600 text-white', barBg: 'bg-gradient-to-r from-blue-100 to-blue-200/90', borderCol: 'border-blue-400' },
        ]
      : [
          {
            tierType: 'cm1',
            label: module.name.includes('PE') ? 'PE' : 'N',
            badgeBg: module.name.includes('PE') ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white',
            barBg: module.name.includes('PE') ? 'bg-gradient-to-r from-yellow-100 to-green-100' : 'bg-gradient-to-r from-blue-100 to-blue-200',
            borderCol: module.name.includes('PE') ? 'border-emerald-400' : 'border-blue-400',
          },
        ];


  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      style={{ width: `${widthPx}px` }}
      className={`group relative flex-shrink-0 h-[160px] min-h-[160px] max-h-[160px] box-border bg-gradient-to-b from-white to-slate-100 text-slate-800 rounded-md border-2 shadow-xs flex flex-col justify-between p-1.5 transition-all select-none cursor-grab active:cursor-grabbing ${
        isDragging
          ? 'opacity-30 border-dashed border-amber-400 ring-2 ring-amber-400/40'
          : isCircuitHighlighted
          ? 'border-amber-400 ring-4 ring-amber-400/80 shadow-[0_0_24px_rgba(251,191,36,0.65)] z-20'
          : isCircuitDimmed
          ? 'opacity-35 grayscale-[35%] border-slate-300'
          : 'border-slate-300 hover:shadow-md hover:border-amber-400'
      } ${isBlank ? 'opacity-60 bg-slate-200' : ''}`}
    >
      {/* Circuit highlighted indicator badge */}
      {isCircuitHighlighted && (
        <div className="absolute -top-3.5 left-1/2 transform -translate-x-1/2 bg-amber-400 text-slate-950 text-[9px] font-black uppercase px-2 py-0.5 rounded-full shadow-lg flex items-center gap-1 z-30 pointer-events-none whitespace-nowrap animate-pulse border border-amber-500">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-ping" />
          <span>⚡ В колі</span>
        </div>
      )}

      {/* Top Screw Terminals - строго однаковий рівень висоти для всіх стандартних модулів */}
      {!isCrossModule && (
        <div className="h-7 min-h-[28px] max-h-[28px] flex justify-around items-center border-b border-slate-300 pb-0.5">
          {!isBlank && Array.from({ length: topTerminalsCount }).map((_, i) => renderTerminal('top', i))}
        </div>
      )}

      {/* Cross-Module Specialized Body (Східчастий крос-блок з 4 або 2 латунними шинами) */}
      {isCrossModule ? (
        <div
          data-module-body="true"
          className="flex-1 min-h-0 w-full flex flex-col justify-between rounded bg-sky-950/5 border border-sky-300/80 p-1 relative overflow-hidden backdrop-blur-[0.5px]"
        >
          {/* Напівпрозора кришка-козирок крос-блока */}
          <div className="flex items-center justify-between pb-0.5 border-b border-sky-200/80">
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
              <span
                onClick={() => onEdit(module)}
                className="text-[10px] font-black text-slate-800 tracking-tight cursor-pointer hover:underline truncate max-w-[120px]"
                title={`Редагувати: ${module.label || module.name}`}
              >
                {module.label || module.name}
              </span>
            </div>
            <span className="text-[8px] font-mono font-bold bg-sky-100 text-sky-800 px-1 rounded border border-sky-300">
              {crossBarsCount > 1 ? `${crossBarsCount}×${crossTerminalsPerRow}` : `${crossTerminalsPerRow}`} кл.
            </span>
          </div>

          {/* Паралельні латунні шини (сходинки) */}
          <div className="flex-1 flex flex-col justify-around py-0.5 gap-0.5">
            {crossModuleBarsConfig.map((bar, barIdx) => (
              <div
                key={barIdx}
                className={`flex items-center justify-between px-1 py-0.5 rounded border ${bar.borderCol} ${bar.barBg} shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)] relative`}
              >
                {/* Бейдж шини (L1, L2, L3, N) */}
                <span
                  className={`w-4 h-4 rounded-xs text-[8px] font-mono font-black flex items-center justify-center flex-shrink-0 shadow-2xs ${bar.badgeBg}`}
                >
                  {bar.label}
                </span>

                {/* Гвинтові клеми шини */}
                <div className="flex items-center justify-around flex-1 px-1">
                  {Array.from({ length: crossTerminalsPerRow }).map((_, termIdx) =>
                    renderTerminal(
                      bar.tierType,
                      termIdx,
                      `Шина ${bar.label} (клема #${termIdx + 1} з ${crossTerminalsPerRow}). Всі клеми цієї шини з'єднані паралельно.`
                    )
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Нижній підпис характеристик крос-блока */}
          <div className="flex items-center justify-between pt-0.5 border-t border-sky-200/60 text-[7.5px] font-mono text-slate-500">
            <span>{crossBarsCount === 4 ? '3P+N (400V)' : '1P+N (230V)'}</span>
            <span className="font-bold text-slate-700">{crossTerminalsPerRow === 11 ? '125A' : '100A'}</span>
          </div>
        </div>
      ) : (
        /* Main Body для класичних модулів */
        <div data-module-body="true" className="flex-1 min-h-0 overflow-hidden flex flex-col justify-center items-center text-center px-1 py-0.5">
          {/* Phase Pill */}
          {module.phase && (
            <span
              className={`text-[9px] font-bold px-1.5 py-0.2 rounded font-mono mb-0.5 ${
                module.phase === 'L1'
                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                  : module.phase === 'L2'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : module.phase === 'L3'
                  ? 'bg-red-100 text-red-800 border border-red-300'
                  : 'bg-indigo-100 text-indigo-800 border border-indigo-300'
              }`}
            >
              {module.phase}
            </span>
          )}

          {/* User Label (circuit name) */}
          <div
            onClick={() => onEdit(module)}
            className="text-[11px] font-bold text-slate-900 leading-tight line-clamp-2 px-1 py-0.5 rounded hover:bg-amber-100/80 cursor-pointer w-full text-center"
            title={`Клікніть для редагування: ${module.label}`}
          >
            {module.label || module.name}
          </div>

          {/* Rating or Specific Hardware Simulation */}
          {isVoltageRelay ? (
            <div className="my-1 px-1.5 py-0.5 bg-slate-950 rounded border border-slate-800 text-red-500 font-mono font-bold text-xs tracking-wider shadow-inner flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              230 V
            </div>
          ) : (
            <div className="font-mono font-black text-xs text-slate-900 my-0.5 bg-white/70 px-1 rounded border border-slate-200">
              {module.rating}
            </div>
          )}

          {/* Physical Breaker Toggle & Test Button Simulation */}
          <div className="flex items-center justify-center gap-1.5 mt-0.5">
            {/* Test Button for RCD */}
            {isRcd && (
              <div
                className="w-4 h-4 rounded bg-amber-400 border border-amber-600 text-[8px] font-black text-amber-950 flex items-center justify-center shadow-xs cursor-pointer hover:bg-amber-300"
                title="Кнопка Тест ПЗВ"
              >
                T
              </div>
            )}

            {/* 1-0-2 Changeover Switch Lever */}
            {isSwitch ? (
              <div className="flex flex-col items-center gap-0.5">
                <div className="flex items-center gap-1.5 bg-slate-900/90 px-2 py-0.5 rounded border border-slate-700 shadow-inner">
                  <span className="text-[9px] font-mono font-bold text-amber-400">I</span>
                  <div className="h-5 bg-gradient-to-b from-slate-700 to-slate-900 rounded-xs border border-slate-950 flex flex-col justify-center items-center shadow px-1.5 min-w-[20px]">
                    <div className="w-full h-1.5 bg-orange-500 rounded-2xs" />
                  </div>
                  <span className="text-[9px] font-mono font-bold text-slate-400">0</span>
                  <span className="text-[9px] font-mono font-bold text-amber-400">II</span>
                </div>
                <span className="text-[7.5px] font-mono text-slate-500 font-semibold leading-tight">
                  {module.poles === 1
                    ? '2 входи / 1 вих'
                    : `2×${module.poles} входів / ${module.poles} вих`}
                </span>
              </div>
            ) : !isBlank && (
              <div className="flex gap-1">
                {Array.from({ length: module.poles }).map((_, i) => (
                  <div
                    key={i}
                    className="w-3.5 h-5 bg-gradient-to-b from-slate-800 to-slate-900 rounded-sm border border-slate-950 flex flex-col justify-start items-center p-0.5 shadow"
                  >
                    <div className="w-2.5 h-1.5 bg-emerald-500 rounded-2xs" title="ON" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bottom Terminal Screws - строго однаковий рівень висоти для всіх стандартних модулів */}
      {!isCrossModule && (
        <div className="h-7 min-h-[28px] max-h-[28px] flex justify-around items-center border-t border-slate-300 pt-0.5">
          {!isBlank && Array.from({ length: bottomTerminalsCount }).map((_, i) => renderTerminal('bottom', i))}
        </div>
      )}

      {/* Hover Action Bar */}
      <div className="no-print absolute -top-3.5 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 bg-white text-slate-700 px-1.5 py-0.5 rounded-md shadow-lg border border-slate-300 z-20 pointer-events-auto">
        {!isFirst && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onMoveLeft(module);
            }}
            className="p-1 hover:text-amber-600 cursor-pointer"
            title="Зсунути вліво"
          >
            <ChevronLeft className="w-3 h-3" />
          </button>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(module);
          }}
          className="p-1 hover:text-amber-600 cursor-pointer"
          title="Редагувати назву / номінал"
        >
          <Edit2 className="w-3 h-3" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate(module);
          }}
          className="p-1 hover:text-amber-600 cursor-pointer"
          title="Дублювати модуль"
        >
          <Copy className="w-3 h-3" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(module.id);
          }}
          className="p-1 hover:text-rose-600 cursor-pointer"
          title="Видалити"
        >
          <Trash2 className="w-3 h-3" />
        </button>
        {!isLast && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onMoveRight(module);
            }}
            className="p-1 hover:text-amber-400 cursor-pointer"
            title="Зсунути вправо"
          >
            <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Module width badge in bottom right corner */}
      <span className="absolute bottom-0.5 right-1 text-[8px] font-mono text-slate-400 pointer-events-none">
        {module.width}M
      </span>
    </div>
  );
};
