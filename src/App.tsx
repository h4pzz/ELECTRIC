import React, { useState, useEffect } from 'react';
import type {
  EnclosureConfig,
  PlacedModule,
  CatalogDevice,
  ManufacturerId,
  WireColor,
  TerminalId,
  WireConnection,
  BusBar,
  BusBarType,
} from './types/electric';

import { Header } from './components/Header';
import { EnclosureConfigBar } from './components/EnclosureConfigBar';
import { WiringToolbar } from './components/WiringToolbar';
import { CatalogSidebar } from './components/CatalogSidebar';
import { DinRailCanvas } from './components/DinRailCanvas';
import { ManufacturerSelector } from './components/ManufacturerSelector';
import { SpecificationTable } from './components/SpecificationTable';
import { EditModuleModal } from './components/EditModuleModal';
import { LabelSheetModal } from './components/LabelSheetModal';
import { APARTMENT_PRESET_MODULES, APARTMENT_PRESET_WIRES } from './data/presets';

const STORAGE_KEY_CONFIG = 'electrobox_config_v1';
const STORAGE_KEY_MODULES = 'electrobox_modules_v1';
const STORAGE_KEY_MFR = 'electrobox_mfr_v1';
const STORAGE_KEY_WIRES = 'electrobox_wires_v1';
const STORAGE_KEY_BUSBARS = 'electrobox_busbars_v1';

export const App: React.FC = () => {
  // 1. Стан конфігурації щитка
  const [config, setConfig] = useState<EnclosureConfig>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_CONFIG);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // ignore
      }
    }
    return {
      mountType: 'flush', // за замовчуванням врізний
      rows: 3,
      modulesPerRow: 12,
      ipRating: 'IP40',
      doorType: 'white',
      title: 'Електричний щит квартири',
    };
  });

  // 2. Розміщені модулі
  const [modules, setModules] = useState<PlacedModule[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_MODULES);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // ignore
      }
    }
    return APARTMENT_PRESET_MODULES;
  });

  // 3. Обраний виробник
  const [manufacturerId, setManufacturerId] = useState<ManufacturerId>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_MFR) as ManufacturerId;
    return saved || 'hager';
  });

  // 4. Стан шин N та PE
  const [busBars, setBusBars] = useState<BusBar[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_BUSBARS);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // ignore
      }
    }
    return [
      { id: 'bus-n-main', type: 'n', name: 'N-головна', terminalsCount: 8 },
      { id: 'bus-pe-main', type: 'pe', name: 'PE-головна', terminalsCount: 8 },
    ];
  });

  // 5. Стан проводки (Wires)
  const [wires, setWires] = useState<WireConnection[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_WIRES);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // ignore
      }
    }
    return APARTMENT_PRESET_WIRES;
  });

  // 6. Обраний колір дроту та активна клема
  const [selectedWireColor, setSelectedWireColor] = useState<WireColor>('blue');
  const [activeTerminal, setActiveTerminal] = useState<TerminalId | null>(null);
  const [showWires, setShowWires] = useState<boolean>(true);

  // Модальні вікна
  const [editingModule, setEditingModule] = useState<PlacedModule | null>(null);
  const [isLabelsModalOpen, setIsLabelsModalOpen] = useState(false);

  // Збереження в LocalStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
  }, [config]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_MODULES, JSON.stringify(modules));
  }, [modules]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_MFR, manufacturerId);
  }, [manufacturerId]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_BUSBARS, JSON.stringify(busBars));
  }, [busBars]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_WIRES, JSON.stringify(wires));
  }, [wires]);

  // Підрахунок загальної кількості зайнятих модулів
  const totalModulesPlaced = modules.reduce((sum, m) => sum + m.width, 0);
  const totalCapacity = Array.from({ length: config.rows }).reduce<number>((sum, _, r) => {
    return sum + config.modulesPerRow + (config.railExtraModules?.[r] ?? 0);
  }, 0);

  // Зміна додаткових модулів рейки (+1 або -1, розширення пластрона)
  const handleUpdateRailExtraModules = (railIndex: number, delta: number) => {
    setConfig((prev) => {
      const current = prev.railExtraModules?.[railIndex] ?? 0;
      const nextVal = Math.max(0, current + delta);
      const updated = { ...(prev.railExtraModules || {}) };
      if (nextVal === 0) {
        delete updated[railIndex];
      } else {
        updated[railIndex] = nextVal;
      }
      return {
        ...prev,
        railExtraModules: updated,
      };
    });
  };

  // Додавання модуля з каталогу на рейку (з можливістю вибору позиції)
  const handleAddDevice = (
    device: CatalogDevice,
    targetRailIndex?: number,
    targetPosition?: number
  ) => {
    let railIdx = targetRailIndex ?? 0;

    if (targetRailIndex === undefined) {
      for (let r = 0; r < config.rows; r++) {
        const occupied = modules
          .filter((m) => m.railIndex === r)
          .reduce((sum, m) => sum + m.width, 0);
        const railCap = config.modulesPerRow + (config.railExtraModules?.[r] ?? 0);
        if (occupied + device.width <= railCap) {
          railIdx = r;
          break;
        }
      }
    }

    if (railIdx >= config.rows) {
      railIdx = config.rows - 1;
    }

    setModules((prev) => {
      const railModules = prev
        .filter((m) => m.railIndex === railIdx)
        .sort((a, b) => a.position - b.position);

      const insertIdx =
        targetPosition !== undefined
          ? Math.max(0, Math.min(targetPosition, railModules.length))
          : railModules.length;

      const newModule: PlacedModule = {
        id: `mod-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        catalogId: device.id,
        name: device.name,
        label: device.defaultLabel,
        category: device.category,
        width: device.width,
        poles: device.poles,
        rating: device.defaultRating,
        phase: 'L1',
        railIndex: railIdx,
        position: insertIdx,
        crossModuleTerminalsPerRow: device.crossModuleTerminalsPerRow,
      };

      railModules.splice(insertIdx, 0, newModule);

      const posMap = new Map<string, number>();
      railModules.forEach((m, idx) => posMap.set(m.id, idx));

      return [
        ...prev.filter((m) => m.railIndex !== railIdx),
        ...railModules.map((m) => ({
          ...m,
          position: posMap.get(m.id)!,
        })),
      ];
    });
  };

  // Переміщення модуля (Drag & Drop) на будь-яку рейку та будь-яку позицію
  const handleMoveModule = (
    moduleId: string,
    targetRailIndex: number,
    targetPosition?: number
  ) => {
    if (targetRailIndex >= config.rows) return;

    setModules((prev) => {
      const movingModule = prev.find((m) => m.id === moduleId);
      if (!movingModule) return prev;

      const sourceRail = movingModule.railIndex;

      if (sourceRail === targetRailIndex) {
        // Переміщення всередині однієї і тієї ж рейки
        const railModules = prev
          .filter((m) => m.railIndex === targetRailIndex)
          .sort((a, b) => a.position - b.position);

        const originalIndex = railModules.findIndex((m) => m.id === moduleId);
        if (originalIndex === -1) return prev;

        const filtered = railModules.filter((m) => m.id !== moduleId);

        let insertIdx =
          targetPosition !== undefined
            ? targetPosition
            : filtered.length;

        // Якщо тягнемо праворуч від поточної позиції, коригуємо зміщення
        if (targetPosition !== undefined && targetPosition > originalIndex) {
          insertIdx = targetPosition - 1;
        }

        insertIdx = Math.max(0, Math.min(insertIdx, filtered.length));
        filtered.splice(insertIdx, 0, movingModule);

        const posMap = new Map<string, number>();
        filtered.forEach((m, idx) => posMap.set(m.id, idx));

        return prev.map((m) => {
          if (m.railIndex === targetRailIndex && posMap.has(m.id)) {
            return { ...m, position: posMap.get(m.id)! };
          }
          return m;
        });
      } else {
        // Переміщення між різними рейками
        const sourceRailModules = prev
          .filter((m) => m.railIndex === sourceRail && m.id !== moduleId)
          .sort((a, b) => a.position - b.position);
        const sourcePosMap = new Map<string, number>();
        sourceRailModules.forEach((m, idx) => sourcePosMap.set(m.id, idx));

        const targetRailModules = prev
          .filter((m) => m.railIndex === targetRailIndex)
          .sort((a, b) => a.position - b.position);

        const insertIdx =
          targetPosition !== undefined
            ? Math.max(0, Math.min(targetPosition, targetRailModules.length))
            : targetRailModules.length;

        const updatedModule: PlacedModule = {
          ...movingModule,
          railIndex: targetRailIndex,
        };

        targetRailModules.splice(insertIdx, 0, updatedModule);
        const targetPosMap = new Map<string, number>();
        targetRailModules.forEach((m, idx) => targetPosMap.set(m.id, idx));

        return prev.map((m) => {
          if (m.id === moduleId) {
            return {
              ...updatedModule,
              position: targetPosMap.get(m.id)!,
            };
          }
          if (m.railIndex === sourceRail && sourcePosMap.has(m.id)) {
            return { ...m, position: sourcePosMap.get(m.id)! };
          }
          if (m.railIndex === targetRailIndex && targetPosMap.has(m.id)) {
            return { ...m, position: targetPosMap.get(m.id)! };
          }
          return m;
        });
      }
    });
  };

  // Зміна порядку модулів на одній рейці (зсув вліво/вправо)
  const handleReorderInRail = (railIndex: number, sourceId: string, direction: 'left' | 'right') => {
    setModules((prev) => {
      const railModules = prev
        .filter((m) => m.railIndex === railIndex)
        .sort((a, b) => a.position - b.position);

      const sourceIdx = railModules.findIndex((m) => m.id === sourceId);
      if (sourceIdx === -1) return prev;

      const targetIdx = direction === 'left' ? sourceIdx - 1 : sourceIdx + 1;
      if (targetIdx < 0 || targetIdx >= railModules.length) return prev;

      const reorderedRail = [...railModules];
      const temp = reorderedRail[sourceIdx];
      reorderedRail[sourceIdx] = reorderedRail[targetIdx];
      reorderedRail[targetIdx] = temp;

      const updatedPositions = new Map<string, number>();
      reorderedRail.forEach((m, i) => {
        updatedPositions.set(m.id, i);
      });

      return prev.map((m) => {
        if (updatedPositions.has(m.id)) {
          return { ...m, position: updatedPositions.get(m.id)! };
        }
        return m;
      });
    });
  };

  // Видалення модуля (також видаляє прикріплені дроти)
  const handleDeleteModule = (moduleId: string) => {
    setModules((prev) => prev.filter((m) => m.id !== moduleId));
    setWires((prev) =>
      prev.filter((w) => w.from.moduleId !== moduleId && w.to.moduleId !== moduleId)
    );
    if (activeTerminal?.moduleId === moduleId) {
      setActiveTerminal(null);
    }
  };

  // Дублювання модуля
  const handleDuplicateModule = (module: PlacedModule) => {
    const duplicated: PlacedModule = {
      ...module,
      id: `mod-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      position: module.position + 1,
    };
    setModules((prev) => [...prev, duplicated]);
  };

  // Оновлення параметрів модуля
  const handleSaveModule = (updated: PlacedModule) => {
    setModules((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
    setEditingModule(null);
  };

  // =========================================================================
  // УПРАВЛІННЯ ШИНАМИ N ТА PE
  // =========================================================================
  const handleAddBusBar = (type: BusBarType) => {
    const countOfType = busBars.filter((b) => b.type === type).length;
    const newBusBar: BusBar = {
      id: `bus-${type}-${Date.now()}`,
      type,
      name: type === 'n' ? `Шина N${countOfType + 1}` : `Шина PE${countOfType + 1}`,
      terminalsCount: 8,
    };
    setBusBars((prev) => [...prev, newBusBar]);
  };

  const handleDeleteBusBar = (busBarId: string) => {
    if (window.confirm('Видалити цю шину та всі підключені до неї проводи?')) {
      setBusBars((prev) => prev.filter((b) => b.id !== busBarId));
      setWires((prev) =>
        prev.filter((w) => w.from.moduleId !== busBarId && w.to.moduleId !== busBarId)
      );
      if (activeTerminal?.moduleId === busBarId) {
        setActiveTerminal(null);
      }
    }
  };

  const handleUpdateBusBar = (updated: BusBar) => {
    setBusBars((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
  };

  // =========================================================================
  const getTerminalWireCount = (term: TerminalId) => {
    return wires.filter(
      (w) => isSameTerminal(w.from, term) || isSameTerminal(w.to, term)
    ).length;
  };

  const handleTerminalClick = (terminal: TerminalId) => {
    if (!activeTerminal) {
      if (getTerminalWireCount(terminal) >= 2) {
        alert('На цю клему вже підключено 2 проводи (максимум для однієї клеми за нормами ПУЕ).');
        return;
      }
      setActiveTerminal(terminal);
    } else {
      if (
        activeTerminal.moduleId === terminal.moduleId &&
        activeTerminal.terminalType === terminal.terminalType &&
        activeTerminal.poleIndex === terminal.poleIndex
      ) {
        setActiveTerminal(null);
        return;
      }

      if (getTerminalWireCount(terminal) >= 2) {
        alert('На цю клему вже підключено 2 проводи (максимум для однієї клеми за нормами ПУЕ). Оберіть іншу клему.');
        return;
      }

      const alreadyExists = wires.some(
        (w) =>
          (isSameTerminal(w.from, activeTerminal) && isSameTerminal(w.to, terminal)) ||
          (isSameTerminal(w.from, terminal) && isSameTerminal(w.to, activeTerminal))
      );

      if (!alreadyExists) {
        const newWire: WireConnection = {
          id: `wire-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          from: activeTerminal,
          to: terminal,
          color: selectedWireColor,
        };
        setWires((prev) => [...prev, newWire]);
      }

      setActiveTerminal(null);
    }
  };


  const isSameTerminal = (t1: TerminalId, t2: TerminalId) => {
    return (
      t1.moduleId === t2.moduleId &&
      t1.terminalType === t2.terminalType &&
      t1.poleIndex === t2.poleIndex
    );
  };

  const handleDeleteWire = (wireId: string) => {
    setWires((prev) => prev.filter((w) => w.id !== wireId));
  };

  const handleClearWires = () => {
    if (window.confirm('Видалити всі прокладені проводи зі щитка?')) {
      setWires([]);
      setActiveTerminal(null);
    }
  };

  const handleUndoWire = () => {
    setWires((prev) => prev.slice(0, -1));
  };

  // Завантажити типовий приклад квартири
  const handleLoadPreset = () => {
    if (window.confirm('Завантажити стандартний зразок щита для квартири з проводкою?')) {
      setConfig((prev) => ({
        ...prev,
        mountType: 'flush',
        rows: 3,
        modulesPerRow: 12,
      }));
      setModules(APARTMENT_PRESET_MODULES);
      setBusBars([
        { id: 'bus-n-main', type: 'n', name: 'N-головна', terminalsCount: 8 },
        { id: 'bus-pe-main', type: 'pe', name: 'PE-головна', terminalsCount: 8 },
      ]);
      setWires(APARTMENT_PRESET_WIRES);
      setActiveTerminal(null);
    }
  };

  // Очистити щит
  const handleReset = () => {
    if (window.confirm('Ви впевнені, що хочете очистити всі модулі та проводку?')) {
      setModules([]);
      setWires([]);
      setBusBars([
        { id: 'bus-n-main', type: 'n', name: 'N-головна', terminalsCount: 8 },
        { id: 'bus-pe-main', type: 'pe', name: 'PE-головна', terminalsCount: 8 },
      ]);
      setActiveTerminal(null);
    }
  };

  const handleScrollToSpec = () => {
    const el = document.getElementById('specification-section');
    el?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      
      {/* 1. Головна панель / Навігація */}
      <Header
        onReset={handleReset}
        onLoadPreset={handleLoadPreset}
        onPrintLabels={() => setIsLabelsModalOpen(true)}
        onExportSpec={handleScrollToSpec}
        onPrintScheme={() => window.print()}
        totalModulesPlaced={totalModulesPlaced}
        totalCapacity={totalCapacity}
      />

      {/* 2. Вибір типу щитка: Зовнішній/Внутрішній, ряди, модулі */}
      <div className="no-print">
        <EnclosureConfigBar
          config={config}
          onChange={(updates) => setConfig((prev) => ({ ...prev, ...updates }))}
        />
      </div>

      {/* 3. Панель управління проводкою та кольорами */}
      <div className="no-print">
        <WiringToolbar
          selectedColor={selectedWireColor}
          onSelectColor={setSelectedWireColor}
          activeTerminal={activeTerminal}
          onCancelActiveTerminal={() => setActiveTerminal(null)}
          wiresCount={wires.length}
          showWires={showWires}
          onToggleShowWires={() => setShowWires((prev) => !prev)}
          onClearWires={handleClearWires}
          onUndoWire={handleUndoWire}
        />
      </div>

      {/* 4. Головна робоча зона: Сайдбар модулів зліва + Холст з DIN-рейками */}
      <div className="w-full flex-1 flex flex-col items-center border-b border-slate-200 bg-slate-100/50 overflow-hidden print-expand">
        <div className="w-full max-w-7xl flex flex-row h-[calc(100vh-170px)] min-h-[650px] overflow-hidden border-x border-slate-200 bg-white shadow-2xs print-expand">
          {/* Каталог модулів зліва */}
          <div className="no-print h-full">
            <CatalogSidebar
              onAddDevice={handleAddDevice}
              rowsCount={config.rows}
            />
          </div>

          {/* Візуальний щит з DIN-рейками, динамічними шинами N/PE та SVG проводкою */}
          <DinRailCanvas
            config={config}
            modules={modules}
            onAddDevice={handleAddDevice}
            onMoveModule={handleMoveModule}
            onReorderInRail={handleReorderInRail}
            onEditModule={(mod) => setEditingModule(mod)}
            onDeleteModule={handleDeleteModule}
            onDuplicateModule={handleDuplicateModule}
            // Wiring
            wires={wires}
            onDeleteWire={handleDeleteWire}
            selectedWireColor={selectedWireColor}
            activeTerminal={activeTerminal}
            onTerminalClick={handleTerminalClick}
            showWires={showWires}
            // Bus bars
            busBars={busBars}
            onAddBusBar={handleAddBusBar}
            onDeleteBusBar={handleDeleteBusBar}
            onUpdateBusBar={handleUpdateBusBar}
            // Rail capacity extension (+1 module)
            onUpdateRailExtraModules={handleUpdateRailExtraModules}
          />
        </div>
      </div>

      {/* 5. Вибір виробника обладнання */}
      <div className="no-print">
        <ManufacturerSelector
          selectedManufacturer={manufacturerId}
          onSelectManufacturer={(id) => setManufacturerId(id)}
        />
      </div>

      {/* 6. Автоматично підтягнуті моделі, специфікація та кошторис */}
      <div className="no-print">
        <SpecificationTable
          config={config}
          modules={modules}
          manufacturerId={manufacturerId}
          onUpdateModules={setModules}
          onUpdateConfig={(updates) => setConfig((prev) => ({ ...prev, ...updates }))}
        />
      </div>

      {/* Модальне вікно редагування параметрів модуля */}
      <div className="no-print">
        <EditModuleModal
          module={editingModule}
          manufacturerId={manufacturerId}
          onClose={() => setEditingModule(null)}
          onSave={handleSaveModule}
        />
      </div>

      {/* Модальне вікно для друку наліпок */}
      <LabelSheetModal
        isOpen={isLabelsModalOpen}
        onClose={() => setIsLabelsModalOpen(false)}
        config={config}
        modules={modules}
      />

    </div>
  );
};

export default App;
