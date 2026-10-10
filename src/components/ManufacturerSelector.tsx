import React from 'react';
import { MANUFACTURERS } from '../data/manufacturers';
import type { ManufacturerId } from '../types/electric';
import { Factory, Check, Sparkles } from 'lucide-react';


interface ManufacturerSelectorProps {
  selectedManufacturer: ManufacturerId;
  onSelectManufacturer: (id: ManufacturerId) => void;
}

export const ManufacturerSelector: React.FC<ManufacturerSelectorProps> = ({
  selectedManufacturer,
  onSelectManufacturer,
}) => {
  return (
    <div className="bg-white border-t border-slate-200 p-4 md:p-5 shadow-xs">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Factory className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-bold text-slate-900 tracking-wide">
              3. Вибір виробника обладнання
            </h3>
            <span className="text-xs text-slate-500">
              (автоматично підтягне моделі, артикули та ціни під ваші модулі)
            </span>
          </div>

          <span className="text-xs text-amber-700 font-medium flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            Зміна виробника миттєво перераховує кошторис
          </span>
        </div>

        {/* Картки виробників */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {MANUFACTURERS.map((m) => {
            const isSelected = selectedManufacturer === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => onSelectManufacturer(m.id)}
                className={`text-left p-3 rounded-xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                  isSelected
                    ? 'border-amber-500 bg-amber-50/50 shadow-md ring-2 ring-amber-400/20'
                    : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 shadow-2xs'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm text-slate-900">
                      {m.name}
                    </span>
                    {isSelected && (
                      <span className="w-4 h-4 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500 block line-clamp-1">
                    {m.country}
                  </span>
                </div>

                <div className="mt-2 pt-2 border-t border-slate-100">
                  <span className="text-[11px] font-mono text-amber-700 font-bold block truncate">
                    {m.series}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
