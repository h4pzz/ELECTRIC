import React, { useState } from 'react';
import type { PlacedModule, ManufacturerId } from '../types/electric';
import { CATALOG_DEVICES } from '../data/catalog';
import {
  MANUFACTURERS,
  getAvailableSeriesForCategory,
  mapDeviceToProduct,
  matchSeriesForRating,
} from '../data/manufacturers';
import { X, Check } from 'lucide-react';

interface EditModuleModalProps {
  module: PlacedModule | null;
  manufacturerId?: ManufacturerId;
  onClose: () => void;
  onSave: (updated: PlacedModule) => void;
}

export const EditModuleModal: React.FC<EditModuleModalProps> = ({
  module,
  manufacturerId,
  onClose,
  onSave,
}) => {
  if (!module) return null;

  const currentMfr = manufacturerId
    ? MANUFACTURERS.find((m) => m.id === manufacturerId) || MANUFACTURERS[0]
    : null;

  const catalogDef = CATALOG_DEVICES.find((d) => d.id === module.catalogId);
  const availableRatings = catalogDef?.availableRatings || [module.rating];

  const initialRating = module.rating || 'C16';
  const [label, setLabel] = useState(module.label || '');
  const [rating, setRating] = useState(initialRating);
  const [phase, setPhase] = useState<PlacedModule['phase']>(module.phase || 'L1');

  // Доступні серії для виробника, категорії та обраного номіналу (наприклад C16 -> MCN, B16 -> MBN для Hager)
  const availableSeries = currentMfr
    ? getAvailableSeriesForCategory(currentMfr.id, module.category, rating)
    : [];

  const initialOverride = currentMfr
    ? module.manufacturerOverrides?.[currentMfr.id]
    : undefined;

  const [selectedSeries, setSelectedSeries] = useState<string>(() => {
    const initialSeriesList = currentMfr
      ? getAvailableSeriesForCategory(currentMfr.id, module.category, initialRating)
      : [];
    return matchSeriesForRating(initialOverride?.series, initialSeriesList);
  });

  const [terminalsPerRow, setTerminalsPerRow] = useState<4 | 7 | 8 | 11>(
    module.crossModuleTerminalsPerRow || 7
  );

  const handleRatingChange = (newRating: string) => {
    setRating(newRating);
    // If rating specifies terminal count (e.g. 4x7, 4x4, 4x8, 4x11), update terminalsPerRow
    if (newRating.includes('4 клем') || newRating.includes('4 отвор') || newRating.includes('×4')) {
      setTerminalsPerRow(4);
    } else if (newRating.includes('7 клем') || newRating.includes('7 отвор') || newRating.includes('×7')) {
      setTerminalsPerRow(7);
    } else if (newRating.includes('8 клем') || newRating.includes('8 отвор') || newRating.includes('×8')) {
      setTerminalsPerRow(8);
    } else if (newRating.includes('11 клем') || newRating.includes('11 отвор') || newRating.includes('×11')) {
      setTerminalsPerRow(11);
    }

    if (currentMfr) {
      const nextSeriesList = getAvailableSeriesForCategory(currentMfr.id, module.category, newRating);
      const adaptedSeries = matchSeriesForRating(selectedSeries, nextSeriesList);
      if (adaptedSeries) {
        setSelectedSeries(adaptedSeries);
      }
    }
  };

  const matchedProduct = currentMfr
    ? mapDeviceToProduct(
        { ...module, rating, manufacturerOverrides: undefined },
        currentMfr.id,
        selectedSeries
      )
    : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let updatedOverrides = module.manufacturerOverrides;
    if (currentMfr && selectedSeries) {
      updatedOverrides = {
        ...module.manufacturerOverrides,
        [currentMfr.id]: {
          series: selectedSeries,
          modelName: matchedProduct?.modelName,
          article: matchedProduct?.article,
          priceUah: matchedProduct?.priceUah,
        },
      };
    }

    // Adjust module width according to terminalsPerRow for cross-modules if 11 or 4
    let updatedWidth = module.width;
    if (module.category === 'cross_module') {
      if (terminalsPerRow === 11 && module.poles === 4) updatedWidth = 6;
      else if (terminalsPerRow === 4 && module.poles === 4) updatedWidth = 2;
      else if (terminalsPerRow === 11 && module.poles === 2) updatedWidth = 4;
      else if (module.poles === 4) updatedWidth = 4;
      else if (module.poles === 2) updatedWidth = 2;
    }

    onSave({
      ...module,
      label,
      rating,
      phase,
      width: updatedWidth,
      crossModuleTerminalsPerRow: terminalsPerRow,
      manufacturerOverrides: updatedOverrides,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
        
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <h3 className="text-base font-semibold text-slate-900">
            Параметри модуля (<span className="font-normal">{module.name}</span>)
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Circuit Label */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Підпис лінії / Призначення:
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="напр. Розетки Кухня, Кондиціонер, Бойлер"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-amber-500"
              autoFocus
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Цей текст буде надруковано на наліпці автомата
            </p>
          </div>

          {/* Rating */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Номінал та характеристика:
            </label>
            <div className="flex flex-wrap gap-1.5">
              {availableRatings.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => handleRatingChange(r)}
                  className={`px-2.5 py-1 text-xs rounded-md border transition cursor-pointer font-mono ${
                    rating === r
                      ? 'bg-amber-500 text-slate-950 font-bold border-amber-500 shadow-xs'
                      : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Phase selector */}
          {module.category !== 'cross_module' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Фаза підключення:
              </label>
              <div className="grid grid-cols-4 gap-2">
                {(['L1', 'L2', 'L3', '3F'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPhase(p)}
                    className={`py-1.5 text-xs font-bold rounded-lg border transition cursor-pointer ${
                      phase === p
                        ? 'bg-amber-100 text-amber-900 border-amber-400 font-bold'
                        : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Cross-Module terminals per row selector */}
          {module.category === 'cross_module' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Кількість отворів / клем в одному ряду (шині):
              </label>
              <div className="grid grid-cols-4 gap-2">
                {([4, 7, 8, 11] as const).map((cnt) => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => {
                      setTerminalsPerRow(cnt);
                      const prefix = module.poles === 4 ? '4×' : '2×';
                      const newR = `${prefix}${cnt} клем (${cnt === 11 ? '125A' : '100A'})`;
                      setRating(newR);
                    }}
                    className={`py-2 text-xs font-bold rounded-lg border transition cursor-pointer font-mono flex flex-col items-center justify-center ${
                      terminalsPerRow === cnt
                        ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-sm font-black'
                        : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    <span className="text-sm font-extrabold">{cnt}</span>
                    <span className="text-[10px] opacity-75">клем/ряд</span>
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {module.poles === 4
                  ? `4 шини (L1, L2, L3, N) × ${terminalsPerRow} клем = ${4 * terminalsPerRow} точок підключення`
                  : `2 шини × ${terminalsPerRow} клем = ${2 * terminalsPerRow} точок підключення`}
              </p>
            </div>
          )}

          {/* Series & Model for manufacturer */}
          {currentMfr && availableSeries.length > 0 && (
            <div className="pt-2 border-t border-slate-200 space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                Серія та модель ({currentMfr.name}):
              </label>
              <div className="flex flex-wrap gap-1.5">
                {availableSeries.map((ser) => (
                  <button
                    key={ser}
                    type="button"
                    onClick={() => setSelectedSeries(ser)}
                    className={`px-2.5 py-1 text-xs rounded-md border transition cursor-pointer ${
                      selectedSeries === ser
                        ? 'bg-amber-500 text-slate-950 font-bold border-amber-500 shadow-2xs'
                        : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {ser}
                  </button>
                ))}
              </div>

              {matchedProduct && (
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
                  <div className="font-normal text-slate-900">{matchedProduct.modelName}</div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span className="font-mono text-amber-800 font-bold">Арт: {matchedProduct.article}</span>
                    <span className="font-bold text-slate-900">{matchedProduct.priceUah} ₴</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-lg cursor-pointer"
            >
              Скасувати
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg shadow-xs cursor-pointer"
            >
              <Check className="w-4 h-4" />
              Зберегти
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
