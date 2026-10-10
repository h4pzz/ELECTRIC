import React from 'react';
import type { PlacedModule, EnclosureConfig } from '../types/electric';

import { X, Printer, Tag } from 'lucide-react';

interface LabelSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: EnclosureConfig;
  modules: PlacedModule[];
}

export const LabelSheetModal: React.FC<LabelSheetModalProps> = ({
  isOpen,
  onClose,
  config,
  modules,
}) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-4xl w-full p-6 shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-amber-500" />
            <h3 className="text-base font-bold text-slate-900">
              Маркування та наліпки для щитка (Друк)
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg cursor-pointer shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              Роздрукувати наліпки
            </button>
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Label Area */}
        <div className="flex-1 overflow-y-auto p-4 bg-white text-slate-900 rounded-xl space-y-6 border border-slate-200 shadow-inner">
          <div className="text-center border-b border-slate-200 pb-2">
            <h2 className="text-base font-extrabold text-slate-900 uppercase">
              Маркування розподільчого щита ({config.rows * config.modulesPerRow + Object.values(config.railExtraModules || {}).reduce((s, v) => s + v, 0)} модулів)
            </h2>
            <p className="text-xs text-slate-500">
              Стандартні наліпки для наклеювання на пластрон щита (розраховані на ширину DIN 18мм)
            </p>
          </div>

          {Array.from({ length: config.rows }).map((_, railIdx) => {
            const railModules = modules
              .filter((m) => m.railIndex === railIdx)
              .sort((a, b) => a.position - b.position);

            return (
              <div key={railIdx} className="space-y-1.5">
                <div className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>DIN-РЕЙКА #{railIdx + 1}</span>
                  <span className="font-mono text-slate-500 text-[10px]">Крок 18 мм</span>
                </div>

                {/* Strip of labels */}
                <div className="flex flex-wrap border-2 border-slate-300 rounded bg-slate-50">
                  {railModules.map((m, idx) => {
                    const widthPx = m.width * 54; // scaled for sheet preview
                    return (
                      <div
                        key={m.id}
                        style={{ width: `${widthPx}px` }}
                        className="h-20 border-r border-slate-300 p-1 flex flex-col justify-between items-center text-center bg-white"
                      >
                        <div className="flex items-center justify-between w-full text-[9px] font-mono text-slate-400 border-b pb-0.5">
                          <span>#{idx + 1}</span>
                          <span className="font-bold text-slate-700">{m.rating}</span>
                        </div>
                        <div className="text-[10px] font-extrabold text-slate-900 leading-tight line-clamp-2">
                          {m.label || m.name}
                        </div>
                        <div className="text-[8px] font-mono text-slate-500 uppercase">
                          {m.phase || '230V'}
                        </div>
                      </div>
                    );
                  })}

                  {railModules.length === 0 && (
                    <div className="p-3 text-xs text-slate-400 italic">
                      Рейка порожня
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="pt-3 mt-3 border-t border-slate-200 text-[11px] text-slate-500 flex justify-between items-center">
          <span>Порада: роздрукуйте на матовому самоклеючому папері або плівці А4</span>
          <button
            onClick={onClose}
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
          >
            Закрити
          </button>
        </div>

      </div>
    </div>
  );
};
