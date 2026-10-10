import React, { useState } from 'react';
import type {
  ManufacturerId,
  PlacedModule,
  EnclosureConfig,
  ModuleCategory,
  MappedDeviceProduct,
} from '../types/electric';
import {
  MANUFACTURERS,
  getEnclosureProduct,
  getAvailableEnclosureSeries,
  mapDeviceToProduct,
  getAvailableSeriesForCategory,
  getAvailableProductsForModule,
  getMainBreakerSeries,
} from '../data/manufacturers';
import {
  FileText,
  Download,
  Printer,
  Box,
  Edit2,
  RotateCcw,
  Check,
  X,
  Sparkles,
  Layers,
  ChevronDown,
} from 'lucide-react';

interface SpecificationTableProps {
  config: EnclosureConfig;
  modules: PlacedModule[];
  manufacturerId: ManufacturerId;
  onUpdateModules?: (modules: PlacedModule[]) => void;
  onUpdateConfig?: (updates: Partial<EnclosureConfig>) => void;
}

interface AggregatedSpecItem {
  key: string;
  article: string;
  modelName: string;
  series: string;
  unitPrice: number;
  count: number;
  totalPrice: number;
  circuits: string[];
  category: ModuleCategory;
  poles: 1 | 2 | 3 | 4;
  rating: string;
  moduleIds: string[];
  isCustomized: boolean;
  availableSeries: string[];
  sampleModule: PlacedModule;
}

export const SpecificationTable: React.FC<SpecificationTableProps> = ({
  config,
  modules,
  manufacturerId,
  onUpdateModules,
  onUpdateConfig,
}) => {
  const currentMfr = MANUFACTURERS.find((m) => m.id === manufacturerId) || MANUFACTURERS[0];
  const totalCapacity = config.rows * config.modulesPerRow;

  // Підібраний корпус щитка з урахуванням перевизначень
  const currentEnclosureOverride = config.enclosureOverrides?.[manufacturerId];
  const enclosure = getEnclosureProduct(
    manufacturerId,
    config.mountType,
    totalCapacity,
    currentEnclosureOverride?.series,
    currentEnclosureOverride
  );

  const availableEnclosureSeries = getAvailableEnclosureSeries(manufacturerId, config.mountType);

  // Стан модального вікна редагування моделі модуля
  const [editingItem, setEditingItem] = useState<AggregatedSpecItem | null>(null);

  // Стан модального вікна редагування корпусу
  const [isEditingEnclosure, setIsEditingEnclosure] = useState(false);
  const [customEnclosureForm, setCustomEnclosureForm] = useState({
    modelName: enclosure.modelName,
    article: enclosure.article,
    series: enclosure.series,
    priceUah: enclosure.priceUah,
  });

  // Агрегація однакових пристроїв за артикулом, серією та моделлю
  const itemMap = new Map<string, AggregatedSpecItem>();

  modules.forEach((mod) => {
    const product = mapDeviceToProduct(mod, manufacturerId);
    const key = `${mod.category}__${product.series}__${product.article}`;
    const existing = itemMap.get(key);
    const hasOverride = Boolean(mod.manufacturerOverrides?.[manufacturerId]);

    if (existing) {
      existing.count += 1;
      existing.totalPrice += product.priceUah;
      existing.moduleIds.push(mod.id);
      if (hasOverride) existing.isCustomized = true;
      if (mod.label && !existing.circuits.includes(mod.label)) {
        existing.circuits.push(mod.label);
      }
    } else {
      const availableSeries = getAvailableSeriesForCategory(manufacturerId, mod.category, mod.rating);
      itemMap.set(key, {
        key,
        article: product.article,
        modelName: product.modelName,
        series: product.series,
        unitPrice: product.priceUah,
        count: 1,
        totalPrice: product.priceUah,
        circuits: mod.label ? [mod.label] : [],
        category: mod.category,
        poles: mod.poles,
        rating: mod.rating,
        moduleIds: [mod.id],
        isCustomized: hasOverride,
        availableSeries,
        sampleModule: mod,
      });
    }
  });

  const aggregatedItems = Array.from(itemMap.values());
  const devicesTotalCost = aggregatedItems.reduce((acc, item) => acc + item.totalPrice, 0);
  const grandTotalCost = devicesTotalCost + enclosure.priceUah;

  // 1. Швидка зміна серії в рядку таблиці через dropdown
  const handleInlineSeriesChange = (item: AggregatedSpecItem, newSeries: string) => {
    if (!onUpdateModules) return;

    const updated = modules.map((m) => {
      if (item.moduleIds.includes(m.id)) {
        const newProduct = mapDeviceToProduct(m, manufacturerId, newSeries);
        return {
          ...m,
          manufacturerOverrides: {
            ...m.manufacturerOverrides,
            [manufacturerId]: {
              series: newSeries,
              modelName: newProduct.modelName,
              article: newProduct.article,
              priceUah: newProduct.priceUah,
            },
          },
        };
      }
      return m;
    });

    onUpdateModules(updated);
  };

  // 2. Масова зміна серії автоматів для всього щита
  const handleBulkBreakerSeriesChange = (targetSeries: string) => {
    if (!onUpdateModules) return;

    const updated = modules.map((m) => {
      if (m.category === 'breaker') {
        const newProduct = mapDeviceToProduct(m, manufacturerId, targetSeries);
        return {
          ...m,
          manufacturerOverrides: {
            ...m.manufacturerOverrides,
            [manufacturerId]: {
              series: targetSeries,
              modelName: newProduct.modelName,
              article: newProduct.article,
              priceUah: newProduct.priceUah,
            },
          },
        };
      }
      return m;
    });

    onUpdateModules(updated);
  };

  // 3. Скидання налаштувань рядка до стандартних
  const handleResetItem = (item: AggregatedSpecItem) => {
    if (!onUpdateModules) return;

    const updated = modules.map((m) => {
      if (item.moduleIds.includes(m.id)) {
        if (!m.manufacturerOverrides) return m;
        const newOverrides = { ...m.manufacturerOverrides };
        delete newOverrides[manufacturerId];
        return {
          ...m,
          manufacturerOverrides: Object.keys(newOverrides).length > 0 ? newOverrides : undefined,
        };
      }
      return m;
    });

    onUpdateModules(updated);
  };

  // 4. Збереження з модального вікна вибору моделі
  const handleSaveItemModal = (
    item: AggregatedSpecItem,
    savedProduct: {
      series: string;
      modelName: string;
      article: string;
      priceUah: number;
    }
  ) => {
    if (!onUpdateModules) return;

    const updated = modules.map((m) => {
      if (item.moduleIds.includes(m.id)) {
        return {
          ...m,
          manufacturerOverrides: {
            ...m.manufacturerOverrides,
            [manufacturerId]: savedProduct,
          },
        };
      }
      return m;
    });

    onUpdateModules(updated);
    setEditingItem(null);
  };

  // 5. Зміна серії корпусу
  const handleEnclosureSeriesChange = (newSeries: string) => {
    if (!onUpdateConfig) return;
    const newEnclosure = getEnclosureProduct(
      manufacturerId,
      config.mountType,
      totalCapacity,
      newSeries
    );
    onUpdateConfig({
      enclosureOverrides: {
        ...config.enclosureOverrides,
        [manufacturerId]: {
          series: newSeries,
          modelName: newEnclosure.modelName,
          article: newEnclosure.article,
          priceUah: newEnclosure.priceUah,
        },
      },
    });
  };

  // 6. Збереження кастомного корпусу
  const handleSaveEnclosureModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onUpdateConfig) return;

    onUpdateConfig({
      enclosureOverrides: {
        ...config.enclosureOverrides,
        [manufacturerId]: {
          ...customEnclosureForm,
        },
      },
    });
    setIsEditingEnclosure(false);
  };

  const handleResetEnclosure = () => {
    if (!onUpdateConfig) return;
    if (!config.enclosureOverrides) return;

    const newOverrides = { ...config.enclosureOverrides };
    delete newOverrides[manufacturerId];
    onUpdateConfig({
      enclosureOverrides: Object.keys(newOverrides).length > 0 ? newOverrides : undefined,
    });
    setIsEditingEnclosure(false);
  };

  // Експорт специфікації в CSV
  const handleExportCsv = () => {
    let csv = '\uFEFF'; // UTF-8 BOM
    csv += '№;Артикул;Найменування обладнання;Серія;К-сть;Ціна (грн);Сума (грн);Призначення ліній\n';

    // Корпус
    csv += `1;${enclosure.article};${enclosure.modelName};${enclosure.series};1;${enclosure.priceUah};${enclosure.priceUah};Корпус щита\n`;

    // Пристрої
    aggregatedItems.forEach((item, idx) => {
      csv += `${idx + 2};${item.article};"${item.modelName}";${item.series};${item.count};${item.unitPrice};${item.totalPrice};"${item.circuits.join(', ')}"\n`;
    });

    csv += `\n;;РАЗОМ;;;;${grandTotalCost};грн\n`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `специфікація_щита_${currentMfr.name.toLowerCase()}_${totalCapacity}M.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  const mainBreakerSeriesList = getMainBreakerSeries(manufacturerId);

  return (
    <section className="bg-white border-t border-slate-200 p-4 md:p-6 shadow-xs" id="specification-section">
      <div className="max-w-7xl mx-auto space-y-4">
        
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-amber-500" />
              <h3 className="text-base font-bold text-slate-900">
                Специфікація та підібрані моделі ({currentMfr.name})
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Ви можете змінювати серію та модель модулів у таблиці нижче або обрати серію масово
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 transition cursor-pointer shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Експорт в Excel (CSV)</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Друк специфікації</span>
            </button>
          </div>
        </div>

        {/* Швидка масова зміна серії автоматів */}
        <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="text-xs font-bold text-amber-950">
              Швидка зміна серії автоматів ({currentMfr.name}):
            </span>
            <span className="text-[11px] text-amber-800 hidden sm:inline">
              Застосувати серію до всіх автоматичних вимикачів в один клік:
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {mainBreakerSeriesList.map((ser) => (
              <button
                key={ser}
                type="button"
                onClick={() => handleBulkBreakerSeriesChange(ser)}
                className="px-2.5 py-1 text-xs font-semibold bg-white hover:bg-amber-100 hover:border-amber-400 text-slate-800 border border-amber-300 rounded-md shadow-2xs transition cursor-pointer flex items-center gap-1"
                title={`Перевести всі автоматичні вимикачі на серію ${ser}`}
              >
                <Sparkles className="w-3 h-3 text-amber-500" />
                <span>{ser}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Корпус щитка картка */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-600">
              <Box className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-900">
                  {enclosure.modelName}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white text-amber-800 border border-slate-200 font-bold">
                  Арт: {enclosure.article}
                </span>
                {currentEnclosureOverride && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300 font-medium">
                    налаштовано
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-slate-500">
                  {config.mountType === 'flush' ? 'Вбудований' : 'Навісний'} • {config.ipRating} • Серія:
                </span>
                <select
                  value={enclosure.series}
                  onChange={(e) => handleEnclosureSeriesChange(e.target.value)}
                  className="text-xs font-semibold px-2 py-0.5 bg-white border border-slate-300 rounded hover:border-amber-400 focus:outline-none focus:border-amber-500 cursor-pointer text-slate-800"
                >
                  {availableEnclosureSeries.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    setCustomEnclosureForm({
                      modelName: enclosure.modelName,
                      article: enclosure.article,
                      series: enclosure.series,
                      priceUah: enclosure.priceUah,
                    });
                    setIsEditingEnclosure(true);
                  }}
                  className="text-xs text-amber-700 hover:text-amber-900 font-semibold flex items-center gap-1 cursor-pointer underline ml-1"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>Змінити дані</span>
                </button>
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className="text-sm font-bold text-slate-900">
              {enclosure.priceUah.toLocaleString('uk-UA')} ₴
            </div>
            <span className="text-[11px] text-slate-500">1 шт.</span>
          </div>
        </div>

        {/* Таблиця модулів */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-100 text-slate-600 uppercase font-mono text-[10px] border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">№</th>
                <th className="py-2.5 px-3">Артикул</th>
                <th className="py-2.5 px-3">Найменування моделі</th>
                <th className="py-2.5 px-3">Серія (зміна)</th>
                <th className="py-2.5 px-3">Призначення / лінії</th>
                <th className="py-2.5 px-3 text-center">К-сть</th>
                <th className="py-2.5 px-3 text-right">Ціна (грн)</th>
                <th className="py-2.5 px-3 text-right">Сума (грн)</th>
                <th className="py-2.5 px-3 text-center">Дії</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {/* Рядок корпусу */}
              <tr className="bg-amber-50/30 font-medium">
                <td className="py-2.5 px-3 text-slate-400">1</td>
                <td className="py-2.5 px-3 font-mono text-amber-800 font-bold">{enclosure.article}</td>
                <td className="py-2.5 px-3 text-slate-900 font-bold">
                  {enclosure.modelName}
                </td>
                <td className="py-2.5 px-3">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white text-slate-700 border border-slate-200 font-medium">
                    {enclosure.series}
                  </span>
                </td>
                <td className="py-2.5 px-3 text-slate-600">Корпус розподільчого щита</td>
                <td className="py-2.5 px-3 text-center font-bold text-slate-900">1</td>
                <td className="py-2.5 px-3 text-right">{enclosure.priceUah.toLocaleString('uk-UA')} ₴</td>
                <td className="py-2.5 px-3 text-right font-bold text-slate-900">{enclosure.priceUah.toLocaleString('uk-UA')} ₴</td>
                <td className="py-2.5 px-3 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setCustomEnclosureForm({
                        modelName: enclosure.modelName,
                        article: enclosure.article,
                        series: enclosure.series,
                        priceUah: enclosure.priceUah,
                      });
                      setIsEditingEnclosure(true);
                    }}
                    className="p-1 text-slate-500 hover:text-amber-600 hover:bg-slate-100 rounded transition cursor-pointer"
                    title="Змінити параметри корпусу"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>

              {/* Модульні пристрої */}
              {aggregatedItems.map((item, index) => (
                <tr key={item.key} className="hover:bg-slate-50 transition group">
                  <td className="py-2.5 px-3 text-slate-400">{index + 2}</td>
                  
                  {/* Артикул */}
                  <td className="py-2.5 px-3 font-mono text-amber-800 font-bold">
                    <div className="flex items-center gap-1">
                      <span>{item.article}</span>
                      {item.isCustomized && (
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" title="Модель змінено вручну" />
                      )}
                    </div>
                  </td>

                  {/* Найменування моделі */}
                  <td className="py-2.5 px-3 text-slate-900 font-medium max-w-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate" title={item.modelName}>{item.modelName}</span>
                      <button
                        type="button"
                        onClick={() => setEditingItem(item)}
                        className="opacity-0 group-hover:opacity-100 text-[11px] text-amber-600 hover:text-amber-800 hover:underline flex items-center gap-0.5 shrink-0 transition cursor-pointer"
                        title="Змінити модель або ввести власну"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Змінити</span>
                      </button>
                    </div>
                  </td>

                  {/* Серія (інтерактивний Dropdown) */}
                  <td className="py-2.5 px-3">
                    {item.availableSeries.length > 1 ? (
                      <div className="relative inline-block">
                        <select
                          value={item.series}
                          onChange={(e) => handleInlineSeriesChange(item, e.target.value)}
                          className="text-xs font-semibold px-2 py-1 bg-slate-50 hover:bg-white border border-slate-300 rounded-md focus:outline-none focus:border-amber-500 cursor-pointer text-slate-800 shadow-2xs pr-6"
                        >
                          {item.availableSeries.map((ser) => (
                            <option key={ser} value={ser}>
                              {ser}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-2 pointer-events-none" />
                      </div>
                    ) : (
                      <span className="text-slate-600 text-xs px-2 py-0.5 rounded bg-slate-100">
                        {item.series}
                      </span>
                    )}
                  </td>

                  {/* Призначення */}
                  <td className="py-2.5 px-3 text-slate-600 max-w-xs truncate" title={item.circuits.join(', ')}>
                    {item.circuits.join(', ') || '—'}
                  </td>

                  {/* Кількість */}
                  <td className="py-2.5 px-3 text-center font-bold text-slate-900">
                    {item.count}
                  </td>

                  {/* Ціна за 1 шт. */}
                  <td className="py-2.5 px-3 text-right text-slate-600">
                    {item.unitPrice.toLocaleString('uk-UA')} ₴
                  </td>

                  {/* Сума */}
                  <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                    {item.totalPrice.toLocaleString('uk-UA')} ₴
                  </td>

                  {/* Дії */}
                  <td className="py-2.5 px-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => setEditingItem(item)}
                        className="p-1 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded transition cursor-pointer"
                        title="Змінити модель / артикул / ціну"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {item.isCustomized && (
                        <button
                          type="button"
                          onClick={() => handleResetItem(item)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                          title="Скинути до стандартної моделі виробника"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {aggregatedItems.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    Ще не додано жодного модульного апарата. Перетягніть модулі з каталогу зліва!
                  </td>
                </tr>
              )}
            </tbody>

            {/* Підсумок */}
            <tfoot className="bg-slate-50 border-t-2 border-slate-200 text-sm">
              <tr>
                <td colSpan={7} className="py-3 px-3 text-right font-bold text-slate-700">
                  Загальна вартість обладнання ({currentMfr.name}):
                </td>
                <td colSpan={2} className="py-3 px-3 text-right font-extrabold text-amber-700 text-base">
                  {grandTotalCost.toLocaleString('uk-UA')} ₴
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

      </div>

      {/* =================================================================== */}
      {/* МОДАЛЬНЕ ВІКНО ЗМІНИ МОДЕЛІ ТА СЕРІЇ МОДУЛЯ */}
      {/* =================================================================== */}
      {editingItem && (
        <ChangeModelModal
          item={editingItem}
          manufacturerId={manufacturerId}
          onClose={() => setEditingItem(null)}
          onSave={(prod) => handleSaveItemModal(editingItem, prod)}
          onReset={() => {
            handleResetItem(editingItem);
            setEditingItem(null);
          }}
        />
      )}

      {/* =================================================================== */}
      {/* МОДАЛЬНЕ ВІКНО РЕДАГУВАННЯ КОРПУСУ ЩИТА */}
      {/* =================================================================== */}
      {isEditingEnclosure && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <Box className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-bold text-slate-900">
                  Редагування корпусу щита ({currentMfr.name})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditingEnclosure(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEnclosureModal} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Серія корпусу:
                </label>
                <select
                  value={customEnclosureForm.series}
                  onChange={(e) => {
                    const newSer = e.target.value;
                    const autoEncl = getEnclosureProduct(
                      manufacturerId,
                      config.mountType,
                      totalCapacity,
                      newSer
                    );
                    setCustomEnclosureForm({
                      series: newSer,
                      modelName: autoEncl.modelName,
                      article: autoEncl.article,
                      priceUah: autoEncl.priceUah,
                    });
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:border-amber-500"
                >
                  {availableEnclosureSeries.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Найменування моделі:
                </label>
                <input
                  type="text"
                  value={customEnclosureForm.modelName}
                  onChange={(e) =>
                    setCustomEnclosureForm((prev) => ({ ...prev, modelName: e.target.value }))
                  }
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Артикул:
                  </label>
                  <input
                    type="text"
                    value={customEnclosureForm.article}
                    onChange={(e) =>
                      setCustomEnclosureForm((prev) => ({ ...prev, article: e.target.value }))
                    }
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:bg-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Ціна (грн):
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={customEnclosureForm.priceUah}
                    onChange={(e) =>
                      setCustomEnclosureForm((prev) => ({
                        ...prev,
                        priceUah: Number(e.target.value) || 0,
                      }))
                    }
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={handleResetEnclosure}
                  className="px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Скинути за замовчуванням</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingEnclosure(false)}
                    className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-lg cursor-pointer"
                  >
                    Скасувати
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Зберегти корпус</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

    </section>
  );
};

// ===========================================================================
// КОМПОНЕНТ МОДАЛЬНОГО ВІКНА ВИБОРУ ТА НАЛАШТУВАННЯ МОДЕЛІ МОДУЛЯ
// ===========================================================================

interface ChangeModelModalProps {
  item: AggregatedSpecItem;
  manufacturerId: ManufacturerId;
  onClose: () => void;
  onSave: (product: {
    series: string;
    modelName: string;
    article: string;
    priceUah: number;
  }) => void;
  onReset: () => void;
}

const ChangeModelModal: React.FC<ChangeModelModalProps> = ({
  item,
  manufacturerId,
  onClose,
  onSave,
  onReset,
}) => {
  const currentMfr = MANUFACTURERS.find((m) => m.id === manufacturerId) || MANUFACTURERS[0];
  const [selectedSeries, setSelectedSeries] = useState(item.series);
  
  // Каталожні готові альтернативні моделі
  const catalogAlternatives = getAvailableProductsForModule(item.sampleModule, manufacturerId);

  // Ручні поля
  const [modelName, setModelName] = useState(item.modelName);
  const [article, setArticle] = useState(item.article);
  const [priceUah, setPriceUah] = useState(item.unitPrice);
  const [isManualMode, setIsManualMode] = useState(item.isCustomized);

  const handleSelectCatalogProduct = (prod: MappedDeviceProduct) => {
    setSelectedSeries(prod.series);
    setModelName(prod.modelName);
    setArticle(prod.article);
    setPriceUah(prod.priceUah);
  };

  const handleSeriesFilterChange = (ser: string) => {
    setSelectedSeries(ser);
    const prod = mapDeviceToProduct(item.sampleModule, manufacturerId, ser);
    setModelName(prod.modelName);
    setArticle(prod.article);
    setPriceUah(prod.priceUah);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      series: selectedSeries,
      modelName,
      article,
      priceUah,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Вибір моделі та серії ({currentMfr.name})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Для {item.count} шт. пристроїв «{item.sampleModule.name}» ({item.rating})
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 space-y-4 pr-1">
          {/* 1. Вибір серії */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Оберіть лінійку / серію виробника:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {item.availableSeries.map((ser) => (
                <button
                  key={ser}
                  type="button"
                  onClick={() => handleSeriesFilterChange(ser)}
                  className={`px-3 py-2 text-xs rounded-xl border font-semibold text-left transition cursor-pointer flex flex-col justify-between ${
                    selectedSeries === ser
                      ? 'bg-amber-500 text-slate-950 font-bold border-amber-500 shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  <span>{ser}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 2. Готові варіанти з каталогу виробника */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700">
                Готові моделі каталогу {currentMfr.name}:
              </label>
              <span className="text-[11px] text-slate-500">Клацніть для швидкого вибору</span>
            </div>

            <div className="space-y-2">
              {catalogAlternatives.map((alt) => {
                const isSelected = alt.article === article && alt.series === selectedSeries;
                return (
                  <div
                    key={alt.article}
                    onClick={() => handleSelectCatalogProduct(alt)}
                    className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-amber-50/80 border-amber-400 shadow-2xs'
                        : 'bg-white hover:bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-900">
                          {alt.modelName}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-amber-800 font-bold border border-slate-200">
                          Арт: {alt.article}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                          {alt.series}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 truncate">
                        {alt.description}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-bold text-slate-900 block">
                        {alt.priceUah.toLocaleString('uk-UA')} ₴
                      </span>
                      {isSelected ? (
                        <span className="text-[10px] text-amber-700 font-bold flex items-center gap-0.5 justify-end">
                          <Check className="w-3 h-3" />
                          <span>Обрано</span>
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">Вибрати</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. Кнопка розгортання ручного режиму */}
          <div className="pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsManualMode((prev) => !prev)}
              className="text-xs text-amber-700 hover:text-amber-900 font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>
                {isManualMode
                  ? 'Приховати ручне коригування'
                  : 'Потрібно змінити назву, артикул або ціну постачальника вручну?'}
              </span>
            </button>
          </div>

          {/* 4. Поля форми ручного редагування */}
          {isManualMode && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Найменування моделі:
                </label>
                <input
                  type="text"
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Артикул:
                  </label>
                  <input
                    type="text"
                    value={article}
                    onChange={(e) => setArticle(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Ціна за 1 шт. (грн):
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={priceUah}
                    onChange={(e) => setPriceUah(Number(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={onReset}
            className="px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer flex items-center gap-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Скинути за замовчуванням</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-lg cursor-pointer"
            >
              Скасувати
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="px-4 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Застосувати до {item.count} шт.</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
