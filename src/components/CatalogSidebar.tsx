import React, { useState } from 'react';
import { CATALOG_DEVICES } from '../data/catalog';
import type { CatalogDevice, ModuleCategory } from '../types/electric';
import { Search, Plus, GripVertical, Layers, HelpCircle } from 'lucide-react';


interface CatalogSidebarProps {
  onAddDevice: (device: CatalogDevice, targetRailIndex?: number) => void;
  rowsCount: number;
}

export const CatalogSidebar: React.FC<CatalogSidebarProps> = ({ onAddDevice, rowsCount }) => {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [selectedTargetRail, setSelectedTargetRail] = useState<number>(0);

  const categories = [
    { id: 'all', label: 'Всі' },
    { id: 'breaker', label: 'Автомати' },
    { id: 'switch', label: '1-0-2 Резерв' },
    { id: 'phase_selector', label: 'Вибір фаз' },
    { id: 'rcd', label: 'ПЗВ (УЗО)' },
    { id: 'rcbo', label: 'Дифавтомати' },
    { id: 'voltage_relay', label: 'Реле напруги' },
    { id: 'other', label: 'Інше' },
  ];

  const filteredDevices = CATALOG_DEVICES.filter((dev) => {
    const matchesSearch =
      dev.name.toLowerCase().includes(search.toLowerCase()) ||
      dev.description.toLowerCase().includes(search.toLowerCase()) ||
      dev.defaultRating.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    if (activeCategory === 'all') return true;
    if (activeCategory === 'other') {
      return !['breaker', 'rcd', 'rcbo', 'voltage_relay', 'switch', 'phase_selector'].includes(dev.category);
    }
    return dev.category === activeCategory;
  });

  const handleDragStart = (e: React.DragEvent, device: CatalogDevice) => {
    const payload = JSON.stringify({ type: 'catalog-device', device });
    e.dataTransfer.setData('application/json', payload);
    e.dataTransfer.setData('text/plain', payload);
    e.dataTransfer.effectAllowed = 'copyMove';
  };

  const getCategoryBadge = (cat: ModuleCategory) => {
    switch (cat) {
      case 'breaker':
        return <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-medium">MCB</span>;
      case 'switch':
        return <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-50 text-orange-700 border border-orange-200 font-bold">1-0-2</span>;
      case 'phase_selector':
        return <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-50 text-violet-700 border border-violet-200 font-bold">ПЕФ</span>;
      case 'rcd':
        return <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">RCD</span>;
      case 'rcbo':
        return <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 font-medium">RCBO</span>;
      case 'voltage_relay':
        return <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 font-medium">Реле V</span>;
      default:
        return <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 font-medium">Модуль</span>;
    }
  };


  return (
    <aside className="w-80 flex-shrink-0 bg-slate-100 border-r border-slate-300 flex flex-col h-full shadow-xs">
      {/* Header & Search */}
      <div className="p-3.5 border-b border-slate-300 space-y-3 bg-slate-100">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-500" />
            Каталог модульних пристроїв
          </h2>
          <span className="text-[11px] text-slate-500 font-mono">
            {filteredDevices.length} поз.
          </span>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Пошук (напр. C16, ПЗВ, 63A, ZUBR)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-white text-xs text-slate-800 placeholder-slate-400 rounded-lg border border-slate-300 focus:outline-none focus:border-amber-500 shadow-2xs"
          />
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap gap-1">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveCategory(c.id)}
              className={`px-2 py-1 text-[11px] rounded-md transition cursor-pointer ${
                activeCategory === c.id
                  ? 'bg-amber-100 text-amber-900 border border-amber-400 font-bold shadow-2xs'
                  : 'bg-white/90 text-slate-700 hover:text-slate-900 hover:bg-white border border-slate-250'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Target Rail selector for 1-click addition */}
        <div className="flex items-center justify-between text-xs bg-white/90 px-2.5 py-1.5 rounded-lg border border-slate-250 shadow-2xs">
          <span className="text-slate-600 text-[11px]">Клік додає на рейку:</span>
          <select
            value={selectedTargetRail}
            onChange={(e) => setSelectedTargetRail(Number(e.target.value))}
            className="bg-slate-50 text-xs text-slate-900 font-bold px-2 py-0.5 rounded border border-slate-300 cursor-pointer focus:outline-none focus:border-amber-500"
          >
            {Array.from({ length: rowsCount }, (_, i) => (
              <option key={i} value={i}>
                Рейка №{i + 1}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Device List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-slate-200/50">
        {filteredDevices.map((dev) => (
          <div
            key={dev.id}
            draggable
            onDragStart={(e) => handleDragStart(e, dev)}
            className="group relative bg-white hover:bg-slate-50 border border-slate-300 hover:border-amber-500 rounded-xl p-2.5 transition shadow-xs cursor-grab active:cursor-grabbing hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2 flex-1 min-w-0">
                <div
                  className="w-1.5 h-10 rounded-full flex-shrink-0 mt-0.5 shadow-2xs"
                  style={{ backgroundColor: dev.color }}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-normal text-slate-900 group-hover:text-amber-800 transition truncate">
                      {dev.name}
                    </span>
                    {getCategoryBadge(dev.category)}
                  </div>
                  <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                    {dev.description}
                  </p>
                </div>
              </div>

              {/* Action Button */}
              <button
                type="button"
                draggable={false}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onAddDevice(dev, selectedTargetRail);
                }}
                className="opacity-90 group-hover:opacity-100 p-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition cursor-pointer shadow-xs flex-shrink-0"
                title={`Додати на рейку №${selectedTargetRail + 1}`}
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
              <span className="font-mono text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 font-medium">
                {dev.width} DIN ({dev.width * 18} мм)
              </span>
              <span className="font-mono text-amber-700 font-bold">
                {dev.defaultRating}
              </span>
              <div className="flex items-center gap-1 text-slate-400 group-hover:text-slate-600 text-[10px]">
                <GripVertical className="w-3 h-3" />
                <span>Тягніть</span>
              </div>
            </div>
          </div>
        ))}

        {filteredDevices.length === 0 && (
          <div className="text-center py-8 text-slate-400 text-xs">
            Пристроїв за запитом не знайдено
          </div>
        )}
      </div>

      {/* Footer Hint */}
      <div className="p-2.5 bg-slate-100 border-t border-slate-300 text-[11px] text-slate-600 flex items-center gap-2">
        <HelpCircle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
        <span>Перетягніть модуль на рейку або клікніть <strong>+</strong></span>
      </div>
    </aside>
  );
};
