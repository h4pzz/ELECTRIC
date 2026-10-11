import React, { useState, useRef, useEffect, useCallback } from 'react';
import type {
  EnclosureConfig,
  PlacedModule,
  CatalogDevice,
  TerminalId,
  WireConnection,
  WireColor,
  BusBar,
  BusBarType,
} from '../types/electric';
import { ModuleItem } from './ModuleItem';
import { AlertCircle, Plus, Minus, Trash2, Edit2, Printer, Bookmark, RotateCcw } from 'lucide-react';

import { WIRE_COLOR_CONFIG } from './WiringToolbar';

interface DinRailCanvasProps {
  config: EnclosureConfig;
  modules: PlacedModule[];
  onAddDevice: (device: CatalogDevice, railIndex: number, targetPosition?: number) => void;
  onMoveModule: (moduleId: string, targetRailIndex: number, newPosition?: number) => void;
  onReorderInRail: (railIndex: number, sourceId: string, direction: 'left' | 'right') => void;
  onEditModule: (module: PlacedModule) => void;
  onDeleteModule: (moduleId: string) => void;
  onDuplicateModule: (module: PlacedModule) => void;
  // Wiring props
  wires: WireConnection[];
  onDeleteWire: (wireId: string) => void;
  selectedWireColor: WireColor;
  activeTerminal: TerminalId | null;
  onTerminalClick: (terminal: TerminalId) => void;
  showWires: boolean;
  // Bus bars props
  busBars: BusBar[];
  onAddBusBar: (type: BusBarType) => void;
  onDeleteBusBar: (busBarId: string) => void;
  onUpdateBusBar: (busBar: BusBar) => void;
  // Rail extra modules (+1 capacity)
  onUpdateRailExtraModules?: (railIndex: number, delta: number) => void;
  onSaveSwitchboard?: () => void;
  onClearModules?: () => void;
  routingMode?: 'side' | 'direct';
}

interface Rect {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface CircuitHighlight {
  wireIds: Set<string>;
  moduleIds: Set<string>;
  busBarIds: Set<string>;
  terminalKeys: Set<string>; // format: `${moduleId}-${terminalType}-${poleIndex}`
}

// Функція для пошуку всього електричного кола (проводів, модулів, шин) через BFS
// ВАЖЛИВО: підсвічуються ТІЛЬКИ проводи та модулі, з'єднані однаковим кольором дроту (фаза/нуль/земля окремо)
function getCircuitForWire(
  targetWireId: string,
  wires: WireConnection[],
  modules: PlacedModule[],
  busBars: BusBar[]
): CircuitHighlight | null {
  const targetWire = wires.find((w) => w.id === targetWireId);
  if (!targetWire) return null;

  const targetColor = targetWire.color;

  const normalizeTermKey = (moduleId: string, terminalType: string, poleIndex: number) => {
    const mod = modules.find((m) => m.id === moduleId);
    if (!mod || mod.category !== 'cross_module') {
      return `${moduleId}-${terminalType}-${poleIndex}`;
    }
    if (terminalType !== 'top' && terminalType !== 'bottom') {
      return `${moduleId}-${terminalType}-${poleIndex}`;
    }
    const is2P = mod.poles === 2;
    const tier = is2P
      ? (poleIndex === 0 ? 'cm1' : 'cm2')
      : (poleIndex === 0 ? 'cm1' : poleIndex === 1 ? 'cm2' : poleIndex === 2 ? 'cm3' : 'cm4');
    const pole = terminalType === 'bottom' ? 1 : 0;
    return `${moduleId}-${tier}-${pole}`;
  };

  const termKey = (moduleId: string, terminalType: string, poleIndex: number) =>
    normalizeTermKey(moduleId, terminalType, poleIndex);

  const adj = new Map<string, Set<string>>();
  const addEdge = (k1: string, k2: string) => {
    if (!adj.has(k1)) adj.set(k1, new Set());
    if (!adj.has(k2)) adj.set(k2, new Set());
    adj.get(k1)!.add(k2);
    adj.get(k2)!.add(k1);
  };

  // Фільтруємо дроти тільки за цільовим кольором
  const matchingWires = wires.filter((w) => w.color === targetColor);

  // 1. Проводи з'єднують клеми між собою (лише дроти однакового кольору)
  matchingWires.forEach((w) => {
    const k1 = termKey(w.from.moduleId, w.from.terminalType, w.from.poleIndex);
    const k2 = termKey(w.to.moduleId, w.to.terminalType, w.to.poleIndex);
    addEdge(k1, k2);
  });

  // Карта підключень для швидкого визначення кольорів на кожній клемі
  const termColorSet = new Map<string, Set<WireColor>>();
  wires.forEach((w) => {
    const k1 = termKey(w.from.moduleId, w.from.terminalType, w.from.poleIndex);
    const k2 = termKey(w.to.moduleId, w.to.terminalType, w.to.poleIndex);
    if (!termColorSet.has(k1)) termColorSet.set(k1, new Set());
    if (!termColorSet.has(k2)) termColorSet.set(k2, new Set());
    termColorSet.get(k1)!.add(w.color);
    termColorSet.get(k2)!.add(w.color);
  });

  // Перевіряє, чи має дана клема хоча б один підключений провід цільового кольору
  const hasMatchingWire = (k: string) => termColorSet.get(k)?.has(targetColor) ?? false;

  // 2. Внутрішні з'єднання всередині приладів (автомати, УЗО, реле тощо):
  // Кожен полюс проводить струм від верхньої клеми до нижньої.
  // Внутрішнє з'єднання полюса враховується лише якщо з обох боків (або хоча б з одного)
  // підключено провід однакового кольору.
  // Для крос-модулів (розподільчих блоків): всі клеми однієї шини (cm1, cm2, cm3, cm4) з'єднані паралельно.
  modules.forEach((m) => {
    if (m.category === 'blank') return;
    if (m.category === 'cross_module') {
      const barsCount = m.poles === 4 ? 4 : m.poles === 2 ? 2 : 1;
      const termsPerRow = m.crossModuleTerminalsPerRow || 7;
      const tierNames: TerminalId['terminalType'][] = ['cm1', 'cm2', 'cm3', 'cm4'];
      for (let b = 0; b < barsCount; b++) {
        const tier = tierNames[b];
        for (let i = 0; i < termsPerRow; i++) {
          for (let j = i + 1; j < termsPerRow; j++) {
            const k1 = termKey(m.id, tier, i);
            const k2 = termKey(m.id, tier, j);
            addEdge(k1, k2);
          }
        }
      }
    } else if (m.category === 'switch') {
      // Для перемикача 1-0-2: вхід I (top: p*2) та вхід II (top: p*2 + 1)
      // комутуються на вихід відповідного полюса (bottom: p)
      for (let p = 0; p < m.poles; p++) {
        const kTop1 = termKey(m.id, 'top', p * 2);
        const kTop2 = termKey(m.id, 'top', p * 2 + 1);
        const kBottom = termKey(m.id, 'bottom', p);
        if (
          (hasMatchingWire(kTop1) && hasMatchingWire(kBottom)) ||
          (hasMatchingWire(kTop2) && hasMatchingWire(kBottom))
        ) {
          addEdge(kTop1, kBottom);
          addEdge(kTop2, kBottom);
        }
      }
    } else {
      // Стандартні модулі (автомати, УЗО, реле, дифавтомати):
      // Струм проходить через конкретний полюс тільки якщо на його клемах підключено дріт однакового кольору
      for (let p = 0; p < m.poles; p++) {
        const kTop = termKey(m.id, 'top', p);
        const kBottom = termKey(m.id, 'bottom', p);
        if (hasMatchingWire(kTop) && hasMatchingWire(kBottom)) {
          addEdge(kTop, kBottom);
        }
      }
    }
  });

  // 3. Шини N та PE: всі гвинтові отвори шини з'єднані спільною мідною планкою
  // Шина N проводить тільки синій провід (blue), шина PE — тільки жовто-зелений (yellow_green)
  busBars.forEach((b) => {
    const isMatchingBus =
      (b.type === 'n' && targetColor === 'blue') ||
      (b.type === 'pe' && targetColor === 'yellow_green');
    if (!isMatchingBus) return;

    for (let i = 0; i < b.terminalsCount; i++) {
      for (let j = i + 1; j < b.terminalsCount; j++) {
        const k1 = termKey(b.id, 'bus', i);
        const k2 = termKey(b.id, 'bus', j);
        addEdge(k1, k2);
      }
    }
  });

  // 4. Пошук в ширину (BFS) починаючи від обох кінців наведеного дроту
  const startKey1 = termKey(targetWire.from.moduleId, targetWire.from.terminalType, targetWire.from.poleIndex);
  const startKey2 = termKey(targetWire.to.moduleId, targetWire.to.terminalType, targetWire.to.poleIndex);

  const visited = new Set<string>([startKey1, startKey2]);
  const queue: string[] = [startKey1, startKey2];

  while (queue.length > 0) {
    const curr = queue.shift()!;
    const neighbors = adj.get(curr);
    if (neighbors) {
      for (const n of neighbors) {
        if (!visited.has(n)) {
          visited.add(n);
          queue.push(n);
        }
      }
    }
  }

  // 5. Визначаємо всі проводи, що належать до цього кола (суворо однаковий колір)
  const wireIds = new Set<string>();
  matchingWires.forEach((w) => {
    const k1 = termKey(w.from.moduleId, w.from.terminalType, w.from.poleIndex);
    const k2 = termKey(w.to.moduleId, w.to.terminalType, w.to.poleIndex);
    if (visited.has(k1) || visited.has(k2)) {
      wireIds.add(w.id);
    }
  });

  // 6. Визначаємо тільки ті модулі, клеми яких беруть участь у колі і мають дріт однакового кольору
  const moduleIds = new Set<string>();
  matchingWires.forEach((w) => {
    if (wireIds.has(w.id)) {
      moduleIds.add(w.from.moduleId);
      moduleIds.add(w.to.moduleId);
    }
  });

  // 7. Визначаємо всі шини, що задіяні в цьому колі
  const busBarIds = new Set<string>();
  busBars.forEach((b) => {
    for (let i = 0; i < b.terminalsCount; i++) {
      if (visited.has(termKey(b.id, 'bus', i))) {
        busBarIds.add(b.id);
        break;
      }
    }
  });

  return {
    wireIds,
    moduleIds,
    busBarIds,
    terminalKeys: visited,
  };
}

// Функція для оптимального розподілу доріжок (lanes) між прямими проводами коридору:
// дроти з меншою відстанню займають ближні доріжки, паралельні дроти зміщуються з відстанню 2px
function computeCorridorLanes(
  wireList: Array<{ id: string; minX: number; maxX: number }>
): Map<string, number> {
  const sorted = [...wireList].sort((a, b) => {
    const spanA = a.maxX - a.minX;
    const spanB = b.maxX - b.minX;
    if (spanA !== spanB) return spanA - spanB;
    return a.minX - b.minX;
  });

  const laneMap = new Map<string, number>();
  const tracks: Array<Array<{ minX: number; maxX: number }>> = [];

  for (const item of sorted) {
    let assignedLane = -1;
    for (let l = 0; l < tracks.length; l++) {
      const hasOverlap = tracks[l].some(
        (existing) => Math.max(item.minX, existing.minX) <= Math.min(item.maxX, existing.maxX)
      );
      if (!hasOverlap) {
        assignedLane = l;
        tracks[l].push({ minX: item.minX, maxX: item.maxX });
        break;
      }
    }
    if (assignedLane === -1) {
      assignedLane = tracks.length;
      tracks.push([{ minX: item.minX, maxX: item.maxX }]);
    }
    laneMap.set(item.id, assignedLane);
  }

  return laneMap;
}

export const DinRailCanvas: React.FC<DinRailCanvasProps> = ({
  config,
  modules,
  onAddDevice,
  onMoveModule,
  onReorderInRail,
  onEditModule,
  onDeleteModule,
  onDuplicateModule,
  wires,
  onDeleteWire,
  selectedWireColor,
  activeTerminal,
  onTerminalClick,
  showWires,
  busBars,
  onAddBusBar,
  onDeleteBusBar,
  onUpdateBusBar,
  onSaveSwitchboard,
  onClearModules,
  routingMode: propRoutingMode,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isConfirmClearOpen, setIsConfirmClearOpen] = useState(false);
  const [dragOverRail, setDragOverRail] = useState<number | null>(null);
  const [dropIndicator, setDropIndicator] = useState<{ railIndex: number; insertIndex: number } | null>(null);
  const [draggedModuleId, setDraggedModuleId] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [hoveredWireId, setHoveredWireId] = useState<string | null>(null);
  const [editingBusBarId, setEditingBusBarId] = useState<string | null>(null);
  const [internalRoutingMode] = useState<'side' | 'direct'>('side');
  const routingMode = propRoutingMode ?? internalRoutingMode;
  const [containerWidth, setContainerWidth] = useState<number>(800);
  const [isDraggingAny, setIsDraggingAny] = useState(false);

  useEffect(() => {
    const handleGlobalDragEnter = () => setIsDraggingAny(true);
    const handleGlobalDragEnd = () => {
      setIsDraggingAny(false);
      setDragOverRail(null);
      setDropIndicator(null);
      setDraggedModuleId(null);
    };
    window.addEventListener('dragenter', handleGlobalDragEnter);
    window.addEventListener('dragend', handleGlobalDragEnd);
    window.addEventListener('drop', handleGlobalDragEnd);
    return () => {
      window.removeEventListener('dragenter', handleGlobalDragEnter);
      window.removeEventListener('dragend', handleGlobalDragEnd);
      window.removeEventListener('drop', handleGlobalDragEnd);
    };
  }, []);

  // Загальна кількість додаткових розширених модулів
  const totalExtraModules = Object.values(config.railExtraModules || {}).reduce((sum, v) => sum + v, 0);
  const totalCanvasCapacity = config.rows * config.modulesPerRow + totalExtraModules;
  const totalModulesPlaced = modules.reduce((sum, m) => sum + m.width, 0);

  // Обчислення всього електричного кола (проводів, модулів, шин) при наведенні на будь-який провід
  const circuitHighlight = React.useMemo(() => {
    if (!hoveredWireId) return null;
    return getCircuitForWire(hoveredWireId, wires, modules, busBars);
  }, [hoveredWireId, wires, modules, busBars]);

  // Групування шин N та PE по максимум 4 шт в 1 рядок (перенос на наступний рядок при > 4)
  const busBarRows = React.useMemo(() => {
    const rows: BusBar[][] = [];
    for (let i = 0; i < busBars.length; i += 4) {
      rows.push(busBars.slice(i, i + 4));
    }
    return rows;
  }, [busBars]);

  // Прямокутники тіл модулів для SVG напівпрозорості
  const [moduleBodyRects, setModuleBodyRects] = useState<Rect[]>([]);

  // Оновлюємо координати модулів для маски напівпрозорості
  const updateModuleBodyRects = useCallback(() => {
    if (!containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    setContainerWidth(containerRect.width);
    const elements = containerRef.current.querySelectorAll('[data-module-body="true"]');
    const rects: Rect[] = [];

    elements.forEach((el, index) => {
      const r = el.getBoundingClientRect();
      rects.push({
        id: `mb-${index}`,
        x: r.left - containerRect.left,
        y: r.top - containerRect.top,
        width: r.width,
        height: r.height,
      });
    });

    setModuleBodyRects(rects);
  }, []);

  useEffect(() => {
    updateModuleBodyRects();
    const handleResize = () => updateModuleBodyRects();
    window.addEventListener('resize', handleResize);
    window.addEventListener('beforeprint', handleResize);
    window.addEventListener('afterprint', handleResize);
    const timer = setTimeout(updateModuleBodyRects, 100);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('beforeprint', handleResize);
      window.removeEventListener('afterprint', handleResize);
      clearTimeout(timer);
    };
  }, [modules, busBars, config, updateModuleBodyRects]);

  // Відстеження руху миші для лінії попереднього перегляду
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!activeTerminal || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  // Допоміжна нормалізація клем для крос-модулів (сумісність зі старими пресетами та збереженими проектами)
  const normalizeCrossModuleTermKey = (moduleId: string, terminalType: TerminalId['terminalType'], poleIndex: number): string => {
    const mod = modules.find((m) => m.id === moduleId);
    if (!mod || mod.category !== 'cross_module') {
      return `${terminalType}-${poleIndex}`;
    }
    if (terminalType !== 'top' && terminalType !== 'bottom') {
      return `${terminalType}-${poleIndex}`;
    }
    const is2P = mod.poles === 2;
    const tier = is2P
      ? (poleIndex === 0 ? 'cm1' : 'cm2')
      : (poleIndex === 0 ? 'cm1' : poleIndex === 1 ? 'cm2' : poleIndex === 2 ? 'cm3' : 'cm4');
    const pole = terminalType === 'bottom' ? 1 : 0;
    return `${tier}-${pole}`;
  };

  // Отримуємо центр клеми за її TerminalId
  const getTerminalCoords = (term: TerminalId): { x: number; y: number } | null => {
    if (!containerRef.current) return null;
    let elem = document.getElementById(`term-${term.moduleId}-${term.terminalType}-${term.poleIndex}`);
    if (!elem) {
      const normalizedKey = normalizeCrossModuleTermKey(term.moduleId, term.terminalType, term.poleIndex);
      elem = document.getElementById(`term-${term.moduleId}-${normalizedKey}`);
    }
    if (!elem) return null;

    const elemRect = elem.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();

    return {
      x: elemRect.left + elemRect.width / 2 - containerRect.left,
      y: elemRect.top + elemRect.height / 2 - containerRect.top,
    };
  };

  // Карта підключених клем до кольорів дротів для кожного модуля (до 2 дротів)
  const getConnectedTerminalsForModule = (moduleId: string) => {
    const map = new Map<string, WireColor[]>();
    wires.forEach((w) => {
      if (w.from.moduleId === moduleId) {
        const key = normalizeCrossModuleTermKey(moduleId, w.from.terminalType, w.from.poleIndex);
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(w.color);
      }
      if (w.to.moduleId === moduleId) {
        const key = normalizeCrossModuleTermKey(moduleId, w.to.terminalType, w.to.poleIndex);
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(w.color);
      }
    });
    return map;
  };

  // Карта підключених об'єктів проводів для кожної клеми модуля
  const getConnectedWiresForModule = (moduleId: string) => {
    const map = new Map<string, WireConnection[]>();
    wires.forEach((w) => {
      if (w.from.moduleId === moduleId) {
        const key = normalizeCrossModuleTermKey(moduleId, w.from.terminalType, w.from.poleIndex);
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(w);
      }
      if (w.to.moduleId === moduleId) {
        const key = normalizeCrossModuleTermKey(moduleId, w.to.terminalType, w.to.poleIndex);
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(w);
      }
    });
    return map;
  };


  // Отримуємо набір активних клем даного модуля в поточному підсвіченому колі
  const getModuleHighlightedTerminals = (moduleId: string) => {
    if (!circuitHighlight) return undefined;
    const set = new Set<string>();
    circuitHighlight.terminalKeys.forEach((key) => {
      if (key.startsWith(`${moduleId}-`)) {
        const parts = key.slice(moduleId.length + 1);
        set.add(parts);
      }
    });
    return set;
  };

  const getRailModules = (railIndex: number) => {
    return modules
      .filter((m) => m.railIndex === railIndex)
      .sort((a, b) => a.position - b.position);
  };

  const getRailOccupiedWidth = (railIndex: number) => {
    return getRailModules(railIndex).reduce((sum, m) => sum + m.width, 0);
  };

  // Наведення при перетягуванні на конкретний модуль (ліва чи права половина)
  const handleModuleDragOver = (e: React.DragEvent, railIndex: number, moduleIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    const isPlaced = !!draggedModuleId;
    e.dataTransfer.dropEffect = isPlaced ? 'move' : 'copy';

    const rect = e.currentTarget.getBoundingClientRect();
    const midX = rect.left + rect.width / 2;
    const insertIndex = e.clientX < midX ? moduleIndex : moduleIndex + 1;

    setDropIndicator({
      railIndex,
      insertIndex,
    });
    setDragOverRail(railIndex);
  };

  // Наведення на порожній простір рейки
  const handleRailDragOver = (e: React.DragEvent, railIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    const isPlaced = !!draggedModuleId;
    e.dataTransfer.dropEffect = isPlaced ? 'move' : 'copy';
    const railModules = getRailModules(railIndex);
    setDropIndicator({
      railIndex,
      insertIndex: railModules.length,
    });
    setDragOverRail(railIndex);
  };

  const handleRailDragLeave = (e: React.DragEvent, railIndex: number) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const { clientX, clientY } = e;
    if (
      clientX < rect.left ||
      clientX >= rect.right ||
      clientY < rect.top ||
      clientY >= rect.bottom
    ) {
      if (dragOverRail === railIndex) {
        setDragOverRail(null);
        setDropIndicator(null);
      }
    }
  };

  const handleDrop = (e: React.DragEvent, railIndex: number) => {
    e.preventDefault();
    e.stopPropagation();

    const targetPosition =
      dropIndicator?.railIndex === railIndex ? dropIndicator.insertIndex : undefined;

    setDragOverRail(null);
    setDropIndicator(null);
    setDraggedModuleId(null);
    setIsDraggingAny(false);

    const rawData =
      e.dataTransfer.getData('application/json') ||
      e.dataTransfer.getData('text/plain') ||
      e.dataTransfer.getData('text');
    if (!rawData) return;

    try {
      const data = JSON.parse(rawData);
      if (data.type === 'catalog-device') {
        onAddDevice(data.device, railIndex, targetPosition);
      } else if (data.type === 'placed-module') {
        onMoveModule(data.module.id, railIndex, targetPosition);
      }
    } catch (err) {
      console.error('Failed to parse dropped data', err);
    }
  };

  // =========================================================================
  // ТРАСУВАННЯ ПРОВОДІВ: БІЧНІ КАБЕЛЬ-КАНАЛИ АБО ПРЯМЕ ПІД МОДУЛЯМИ
  // =========================================================================

  // Визначаємо номер DIN-рейки для клеми (-1 для верхніх шин N/PE)
  const getTerminalRail = (term: TerminalId): number => {
    if (term.terminalType === 'bus') return -1;
    const mod = modules.find((m) => m.id === term.moduleId);
    return mod ? mod.railIndex : 0;
  };

  // Визначає, чи є клема верхнього спрямування (виходить вгору)
  const isTopTerminal = (termType: TerminalId['terminalType'], moduleId?: string): boolean => {
    if (termType === 'top' || termType === 'cm1') return true;
    if (termType === 'bottom' || termType === 'cm3' || termType === 'cm4') return false;
    if (termType === 'cm2') {
      if (moduleId) {
        const mod = modules.find((m) => m.id === moduleId);
        if (mod && mod.poles === 2) return false; // N-шина на 2P крос-модулі — це нижня шина
      }
      return true;
    }
    return true;
  };

  // Визначає, чи є клема нижнього спрямування (виходить вниз)
  const isBottomTerminal = (termType: TerminalId['terminalType'], moduleId?: string): boolean => {
    return !isTopTerminal(termType, moduleId) && termType !== 'bus';
  };

  // Визначаємо, чи повинен провід проходити через бічний кабель-канал,
  // щоб не перекривати модулі верхнього ряду
  const shouldRouteViaSide = (
    fromTerm: TerminalId,
    toTerm: TerminalId,
    mode: 'side' | 'direct'
  ): boolean => {
    if (mode === 'direct') return false;

    const r1 = getTerminalRail(fromTerm);
    const r2 = getTerminalRail(toTerm);

    const fromIsTop = isTopTerminal(fromTerm.terminalType, fromTerm.moduleId);
    const toIsTop = isTopTerminal(toTerm.terminalType, toTerm.moduleId);

    // Якщо один з кінців - це шина N або PE нагорі (r === -1)
    if (r1 === -1 || r2 === -1) {
      const railMod = r1 === -1 ? r2 : r1;
      const modTermIsTop = r1 === -1 ? toIsTop : fromIsTop;
      // Якщо модуль знаходиться на рейці 1, 2, ... - між ним і шиною є рейка 0,
      // тому провід обов'язково йде через бічний кабель-канал
      if (railMod > 0) return true;
      // Якщо модуль на верхній рейці (0), але підключення до нижньої клеми ('bottom' / 'cm3' / 'cm4') -
      // щоб не перетинати сам модуль 0-ї рейки, ведемо через бічний канал
      if (railMod === 0 && !modTermIsTop) return true;
      // Якщо верхня клема ('top' / 'cm1' / 'cm2') модуля 0-ї рейки та шина - вони виходять прямо в спільний верхній жолоб
      return false;
    }

    // Обидва кінці на DIN-рейках
    const diff = Math.abs(r1 - r2);
    // Через 1 або більше проміжних рейок (наприклад рейка 0 і рейка 2) -> бічний канал!
    if (diff >= 2) return true;

    // Суміжні рейки (наприклад рейка 0 і рейка 1)
    if (diff === 1) {
      const upperIsTop = r1 < r2 ? fromIsTop : toIsTop;
      const lowerIsTop = r1 < r2 ? toIsTop : fromIsTop;
      // Верхній виходить знизу, а нижній виходить зверху:
      // вони дивляться прямо в один спільний міжкабельний жолоб! Не перетинають модулів.
      if (!upperIsTop && lowerIsTop) {
        return false;
      }
      // Якщо ж провід іде на інший бік або перетинав би зображення автомата - ведемо через канал збоку
      return true;
    }

    // На одній і тій же рейці: якщо спрямування різне (один виходить вгору, інший вниз), ведемо через бічний канал
    if (fromIsTop !== toIsTop) {
      return true;
    }

    return false;
  };

  // Трасування через бічний кабель-канал щита (з кутами 90° та радіусами вигину)
  const calculateSideRoutingPath = (
    fromPos: { x: number; y: number },
    toPos: { x: number; y: number },
    fromType: TerminalId['terminalType'],
    toType: TerminalId['terminalType'],
    wireIndex: number,
    cWidth: number
  ): { pathD: string; deletePos: { x: number; y: number } } => {
    const V_MIN = 24;

    // Визначаємо найближчий вертикальний стояк (лівий чи правий)
    const midX = (fromPos.x + toPos.x) / 2;
    const isLeftSide = midX < cWidth / 2;

    // Зміщення доріжок (lanes), щоб кілька паралельних дротів не зливалися
    const laneIndex = wireIndex % 4;
    const laneOffset = laneIndex * 6; // 0, 6, 12, 18px
    const ductYOffset = ((wireIndex % 3) - 1) * 3; // -3, 0, +3px

    const sideX = isLeftSide ? 22 + laneOffset : cWidth - (22 + laneOffset);

    // Розрахунок Y виходу з першої клеми в горизонтальний жолоб
    let y1_duct: number;
    let dirY1: number; // -1 вгору, +1 вниз
    if (isTopTerminal(fromType)) {
      y1_duct = fromPos.y - V_MIN + ductYOffset;
      dirY1 = -1;
    } else {
      y1_duct = fromPos.y + V_MIN + ductYOffset;
      dirY1 = 1;
    }

    // Розрахунок Y входу в другу клему з горизонтального жолоба
    let y2_duct: number;
    let dirYToTerm: number; // +1 входимо зверху вниз, -1 входимо знизу вгору
    if (isTopTerminal(toType)) {
      y2_duct = toPos.y - V_MIN + ductYOffset;
      dirYToTerm = 1;
    } else if (isBottomTerminal(toType)) {
      y2_duct = toPos.y + V_MIN + ductYOffset;
      dirYToTerm = -1;
    } else {
      // bus bar нагорі щита: провід підходить знизу вгору
      y2_duct = toPos.y + V_MIN + ductYOffset;
      dirYToTerm = -1;
    }

    // Напрямки горизонтального та вертикального руху
    const dirX1 = sideX > fromPos.x ? 1 : -1;
    const dirYChannel = y2_duct > y1_duct ? 1 : -1;
    const dirX2 = toPos.x > sideX ? 1 : -1;

    // Радіуси плавного заокруглення (філе)
    const R_BASE = 12;
    const r1 = Math.max(
      4,
      Math.min(
        R_BASE,
        Math.abs(fromPos.x - sideX) / 2,
        Math.abs(y2_duct - y1_duct) / 2,
        V_MIN / 2
      )
    );
    const r2 = Math.max(
      4,
      Math.min(
        R_BASE,
        Math.abs(toPos.x - sideX) / 2,
        Math.abs(y2_duct - y1_duct) / 2,
        V_MIN / 2
      )
    );

    const pathD = [
      `M ${fromPos.x} ${fromPos.y}`,
      `L ${fromPos.x} ${y1_duct - dirY1 * r1}`,
      `Q ${fromPos.x} ${y1_duct}, ${fromPos.x + dirX1 * r1} ${y1_duct}`,
      `L ${sideX - dirX1 * r1} ${y1_duct}`,
      `Q ${sideX} ${y1_duct}, ${sideX} ${y1_duct + dirYChannel * r1}`,
      `L ${sideX} ${y2_duct - dirYChannel * r2}`,
      `Q ${sideX} ${y2_duct}, ${sideX + dirX2 * r2} ${y2_duct}`,
      `L ${toPos.x - dirX2 * r2} ${y2_duct}`,
      `Q ${toPos.x} ${y2_duct}, ${toPos.x} ${y2_duct + dirYToTerm * r2}`,
      `L ${toPos.x} ${toPos.y}`,
    ].join(' ');

    const deletePos = {
      x: sideX,
      y: (y1_duct + y2_duct) / 2,
    };

    return { pathD, deletePos };
  };

  // Пряме трасування під кутом 90 градусів між модулями (з відстанню 2px між паралельними проводами)
  const calculateOrthogonalDirectPath = (
    fromPos: { x: number; y: number },
    toPos: { x: number; y: number },
    fromType: TerminalId['terminalType'],
    toType: TerminalId['terminalType'],
    laneIndex: number,
    railIndex: number
  ): { pathD: string; deletePos: { x: number; y: number } } => {
    // Відстань між паралельними проводами: при товщині 4px крок 6px дає рівно 2px вільного простору
    const laneOffset = laneIndex * 6;

    const fromIsTop = isTopTerminal(fromType);
    const toIsTop = isTopTerminal(toType);

    // 1. Обидва кінці виходять вниз (bottom / cm3 / cm4)
    if (!fromIsTop && !toIsTop) {
      let laneY = Math.max(fromPos.y, toPos.y) + 17 + laneOffset;

      // Обмежуємо висоту: провід повинен строго проходити НАД написами "Модуль 1 - Модуль 12"
      if (containerRef.current) {
        const labelEl = document.getElementById(`rail-labels-${railIndex}`);
        if (labelEl) {
          const cRect = containerRef.current.getBoundingClientRect();
          const lRect = labelEl.getBoundingClientRect();
          const labelTop = lRect.top - cRect.top;
          if (laneY >= labelTop - 4) {
            laneY = labelTop - 4;
          }
        }
      }

      const pathD = `M ${fromPos.x} ${fromPos.y} L ${fromPos.x} ${laneY} L ${toPos.x} ${laneY} L ${toPos.x} ${toPos.y}`;
      const deletePos = {
        x: (fromPos.x + toPos.x) / 2,
        y: laneY,
      };
      return { pathD, deletePos };
    }

    // 2. Обидва кінці виходять вгору (top / cm1 / cm2)
    if (fromIsTop && toIsTop) {
      const laneY = Math.min(fromPos.y, toPos.y) - 17 - laneOffset;
      const pathD = `M ${fromPos.x} ${fromPos.y} L ${fromPos.x} ${laneY} L ${toPos.x} ${laneY} L ${toPos.x} ${toPos.y}`;
      const deletePos = {
        x: (fromPos.x + toPos.x) / 2,
        y: laneY,
      };
      return { pathD, deletePos };
    }

    // 3. З'єднання верх-низ (наприклад між сусідніми рейками або в прямому режимі)
    if (
      (!fromIsTop && toIsTop) ||
      (fromIsTop && !toIsTop)
    ) {
      const upperY = Math.min(fromPos.y, toPos.y);
      const lowerY = Math.max(fromPos.y, toPos.y);
      const isFromUpper = fromPos.y < toPos.y;

      if (Math.abs(fromPos.y - toPos.y) > 40) {
        // Між різними рейками
        const laneY = (upperY + lowerY) / 2 + ((laneIndex % 3) - 1) * 6;
        const pathD = isFromUpper
          ? `M ${fromPos.x} ${fromPos.y} L ${fromPos.x} ${laneY} L ${toPos.x} ${laneY} L ${toPos.x} ${toPos.y}`
          : `M ${fromPos.x} ${fromPos.y} L ${fromPos.x} ${laneY} L ${toPos.x} ${laneY} L ${toPos.x} ${toPos.y}`;
        return {
          pathD,
          deletePos: { x: (fromPos.x + toPos.x) / 2, y: laneY },
        };
      } else {
        // На одній рейці
        const yBot = Math.max(fromPos.y, toPos.y) + 17 + laneOffset;
        const yTop = Math.min(fromPos.y, toPos.y) - 17 - laneOffset;
        const midX = (fromPos.x + toPos.x) / 2;

        const pathD =
          !fromIsTop
            ? `M ${fromPos.x} ${fromPos.y} L ${fromPos.x} ${yBot} L ${midX} ${yBot} L ${midX} ${yTop} L ${toPos.x} ${yTop} L ${toPos.x} ${toPos.y}`
            : `M ${fromPos.x} ${fromPos.y} L ${fromPos.x} ${yTop} L ${midX} ${yTop} L ${midX} ${yBot} L ${toPos.x} ${yBot} L ${toPos.x} ${toPos.y}`;

        return {
          pathD,
          deletePos: { x: midX, y: (yBot + yTop) / 2 },
        };
      }
    }

    // Будь-яке інше трасування: строго під 90 градусів
    const midY = (fromPos.y + toPos.y) / 2;
    const pathD = `M ${fromPos.x} ${fromPos.y} L ${fromPos.x} ${midY} L ${toPos.x} ${midY} L ${toPos.x} ${toPos.y}`;
    return {
      pathD,
      deletePos: { x: (fromPos.x + toPos.x) / 2, y: midY },
    };
  };

  const activeStartCoords = activeTerminal ? getTerminalCoords(activeTerminal) : null;

  return (
    <div className="flex-1 overflow-y-auto p-3 bg-slate-100/70 flex flex-col h-full print-expand">
      
      {/* Контейнер корпуса щитка */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        className="din-switchboard-box w-full bg-white border-2 border-slate-300 rounded-xl p-4 md:p-5 shadow-xs relative select-none"
      >
        
        {/* Верхня панель корпуса щита (інформація та шини N/PE) */}
        <div className="no-print border-b-2 border-slate-200 pb-3 mb-4 space-y-2.5 px-3 md:px-5">
          
          <div className="flex items-center justify-between gap-3 w-full flex-wrap lg:flex-nowrap">
            {/* Ліва частина: назва та параметри щитка */}
            <div className="flex items-center gap-2.5 shrink-0">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-300 border border-slate-400 shadow-inner shrink-0" />
              <div className="leading-tight">
                <span className="text-[11px] uppercase tracking-wider font-bold text-slate-500 block">
                  {config.mountType === 'flush' ? 'Вбудований щит' : 'Навісний щит'}
                </span>
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 whitespace-nowrap">
                  Корпус {config.rows * config.modulesPerRow} мод. {totalExtraModules > 0 ? `(+${totalExtraModules})` : `(${config.rows} × ${config.modulesPerRow})`} • {config.ipRating}
                </h3>
              </div>
            </div>

            {/* Права частина: Заповнення, Очистити, Зберегти щиток та Друк строго на одному рівні */}
            <div className="flex items-center gap-2 sm:gap-2.5 ml-auto shrink-0">
              {/* Індикатор заповнення */}
              <div className="flex items-center gap-2 sm:gap-2.5 px-2.5 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-xs shrink-0">
                <span className="text-slate-600 font-medium whitespace-nowrap">Заповнення:</span>
                <span className="font-bold text-slate-800 whitespace-nowrap">
                  {totalModulesPlaced} / {totalCanvasCapacity} мод.
                </span>
                <div className="w-16 sm:w-20 bg-slate-200 h-2 rounded-full overflow-hidden shrink-0">
                  <div
                    className={`h-full transition-all duration-300 ${
                      totalModulesPlaced > totalCanvasCapacity
                        ? 'bg-rose-500'
                        : totalModulesPlaced === totalCanvasCapacity
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, (totalModulesPlaced / (totalCanvasCapacity || 1)) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Кнопка Очистити */}
              <button
                type="button"
                onClick={() => setIsConfirmClearOpen(true)}
                className="no-print flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-600 border border-slate-300 hover:border-rose-300 text-xs font-semibold transition cursor-pointer shadow-xs whitespace-nowrap shrink-0 group"
                title="Очистити всі модулі"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-400 group-hover:text-rose-500" />
                <span>Очистити</span>
              </button>

              {/* Кнопка зберегти щиток */}
              <button
                type="button"
                onClick={onSaveSwitchboard}
                className="no-print flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition cursor-pointer shadow-xs whitespace-nowrap shrink-0"
                title="Зберегти щиток в акаунт"
              >
                <Bookmark className="w-3.5 h-3.5" />
                <span>Зберегти щиток</span>
              </button>

              {/* Кнопка друку */}
              <button
                type="button"
                onClick={() => window.print()}
                className="no-print flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition cursor-pointer shadow-xs whitespace-nowrap shrink-0"
                title="Роздрукувати схему електричного щитка"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Друк</span>
              </button>
            </div>
          </div>

          {/* Контекстне модальне вікно підтвердження очищення всіх модулів */}
          {isConfirmClearOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
              <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200 p-5 space-y-4 animate-in zoom-in-95 duration-150">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Очищення щитка</h4>
                    <p className="text-xs font-semibold text-rose-600 mt-0.5">Ви впевнені, що хочете видалити всі модулі?</p>
                  </div>
                </div>
                <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  Ця дія видалить усі розміщені модулі ({modules.length} шт.) та їхні з'єднання зі щитка.
                </p>
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsConfirmClearOpen(false)}
                    className="px-3.5 py-2 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                  >
                    Скасувати
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onClearModules?.();
                      setIsConfirmClearOpen(false);
                    }}
                    className="px-4 py-2 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/20 transition cursor-pointer"
                  >
                    Видалити всі
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Кнопки додавання шин N/PE */}
          <div className="no-print flex flex-wrap items-center gap-2 pt-0.5">
            <button
              type="button"
              onClick={() => onAddBusBar('n')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-300 text-xs font-bold transition cursor-pointer shadow-xs"
              title="Додати додаткову нульову шину N"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Шина N</span>
            </button>

            <button
              type="button"
              onClick={() => onAddBusBar('pe')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-yellow-50 hover:bg-yellow-100 text-yellow-800 border border-yellow-300 text-xs font-bold transition cursor-pointer shadow-xs"
              title="Додати додаткову шину заземлення PE"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Шина PE</span>
            </button>
          </div>

          {/* ============================================================== */}
          {/* СЕКЦІЯ ШИН N ТА PE (ДИНАМІЧНІ ШИНИ: МАКС 4 В 1 РЯД)            */}
          {/* ============================================================== */}
          <div className="space-y-2.5 pt-2">
            {busBarRows.map((row, rowIdx) => (
              <div key={rowIdx} className="flex flex-wrap items-center gap-3">
                {row.map((bus) => {
                  const isN = bus.type === 'n';
                  const isEditing = editingBusBarId === bus.id;
                  const isBusHighlighted = circuitHighlight ? circuitHighlight.busBarIds.has(bus.id) : false;
                  const isBusDimmed = circuitHighlight && !isBusHighlighted;

                  return (
                    <div
                      key={bus.id}
                      className={`flex items-center gap-2 p-1.5 px-3 rounded-xl border transition-all ${
                        isBusHighlighted
                          ? 'ring-4 ring-amber-400/80 border-amber-400 shadow-[0_0_22px_rgba(251,191,36,0.6)] scale-[1.02] z-20'
                          : isBusDimmed
                          ? 'opacity-35 grayscale-[40%]'
                          : ''
                      } ${
                        isN
                          ? 'bg-blue-50/90 border-blue-300 shadow-blue-100/50'
                          : 'bg-yellow-50/90 border-yellow-300 shadow-yellow-100/50'
                      } shadow-xs`}
                    >
                      {/* Назва та бейдж шини */}
                      <div className="flex items-center gap-1.5 pr-1 border-r border-slate-300">
                        <span
                          className={`text-[9px] font-black px-1.5 py-0.5 rounded font-mono ${
                            isN
                              ? 'bg-blue-600 text-white'
                              : 'bg-gradient-to-r from-yellow-400 to-green-500 text-slate-950'
                          }`}
                        >
                          {isN ? 'N' : 'PE'}
                        </span>

                        {isEditing ? (
                          <input
                            type="text"
                            value={bus.name}
                            onChange={(e) => onUpdateBusBar({ ...bus, name: e.target.value })}
                            onBlur={() => setEditingBusBarId(null)}
                            onKeyDown={(e) => e.key === 'Enter' && setEditingBusBarId(null)}
                            autoFocus
                            className="bg-white text-xs text-slate-800 px-1.5 py-0.5 rounded border border-slate-300 focus:outline-none w-24"
                          />
                        ) : (
                          <span
                            onClick={() => setEditingBusBarId(bus.id)}
                            className={`text-xs font-bold font-mono cursor-pointer hover:underline ${
                              isN ? 'text-blue-900' : 'text-yellow-950'
                            }`}
                            title="Клікніть, щоб перейменувати шину"
                          >
                            {bus.name}
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => setEditingBusBarId(isEditing ? null : bus.id)}
                          className="no-print p-0.5 text-slate-400 hover:text-slate-700 cursor-pointer"
                          title="Перейменувати"
                        >
                          <Edit2 className="w-2.5 h-2.5" />
                        </button>
                      </div>

                      {/* Інтерактивні гвинтові клеми шини: макс. 4 в 1 ряд, при збільшенні перенос */}
                      <div className="grid grid-cols-4 gap-1.5 py-1 w-fit">
                        {Array.from({ length: bus.terminalsCount }).map((_, i) => {
                          const isActive =
                            activeTerminal?.moduleId === bus.id && activeTerminal?.poleIndex === i;
                          const isTermInCircuit = circuitHighlight?.terminalKeys.has(`${bus.id}-bus-${i}`);
                          const busTermWires = wires.filter(
                            (w) =>
                              (w.from.moduleId === bus.id && w.from.terminalType === 'bus' && w.from.poleIndex === i) ||
                              (w.to.moduleId === bus.id && w.to.terminalType === 'bus' && w.to.poleIndex === i)
                          );
                          const hasWires = busTermWires.length > 0;

                          return (
                            <div key={i} className="relative group/term flex items-center justify-center p-1 -m-1">
                              <button
                                id={`term-${bus.id}-bus-${i}`}
                                type="button"
                                onClick={() =>
                                  onTerminalClick({
                                    moduleId: bus.id,
                                    terminalType: 'bus',
                                    poleIndex: i,
                                  })
                                }
                                className={`w-3.5 h-3.5 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-inner ${
                                  isActive
                                    ? 'bg-amber-300 ring-2 ring-amber-500 scale-130'
                                    : isTermInCircuit
                                    ? 'bg-amber-300 ring-3 ring-amber-500 scale-135 shadow-[0_0_10px_#f59e0b] animate-pulse'
                                    : isN
                                    ? 'bg-blue-200 hover:bg-white hover:scale-120 border border-blue-400'
                                    : 'bg-yellow-200 hover:bg-white hover:scale-120 border border-yellow-400'
                                }`}
                                title={`Клема ${bus.name} #${i + 1}. Підключено: ${busTermWires.length}/2.`}
                              >
                                <div
                                  className={`w-2 h-0.5 rounded rotate-45 ${
                                    isActive || isTermInCircuit
                                      ? 'bg-slate-950 font-bold'
                                      : isN
                                      ? 'bg-blue-800'
                                      : 'bg-yellow-800'
                                  }`}
                                />
                              </button>

                              {/* Значки "+" та "-" при наведенні прямо на клему шини */}
                              {hasWires && !activeTerminal && (
                                <div className="no-print absolute z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-1 bg-slate-900/95 text-white px-1.5 py-0.5 rounded-md shadow-xl border border-slate-700 backdrop-blur-xs opacity-0 pointer-events-none group-hover/term:opacity-100 group-hover/term:pointer-events-auto transition-all duration-150 scale-95 group-hover/term:scale-100 whitespace-nowrap">
                                  {busTermWires.length < 2 ? (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onTerminalClick({
                                          moduleId: bus.id,
                                          terminalType: 'bus',
                                          poleIndex: i,
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
                                      title="Максимум 2 проводи на клему"
                                    >
                                      <Plus className="w-2.5 h-2.5 stroke-[2] opacity-40" />
                                    </div>
                                  )}

                                  {busTermWires.map((w, idx) => (
                                    <button
                                      key={w.id}
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onDeleteWire(w.id);
                                      }}
                                      className="h-4 px-1 rounded bg-rose-600 hover:bg-rose-500 text-white cursor-pointer shadow-xs transition-transform flex items-center gap-0.5 hover:scale-110 active:scale-95"
                                      title={busTermWires.length > 1 ? `Видалити провід #${idx + 1}` : 'Видалити існуючий провід'}
                                    >
                                      <Minus className="w-2.5 h-2.5 stroke-[3]" />
                                      {busTermWires.length > 1 && (
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
                        })}
                      </div>

                      {/* Кількість клем селектор та видалення */}
                      <div className="no-print flex items-center gap-1 pl-1 border-l border-slate-300">
                        <select
                          value={bus.terminalsCount}
                          onChange={(e) =>
                            onUpdateBusBar({ ...bus, terminalsCount: Number(e.target.value) })
                          }
                          className="bg-white text-[10px] text-slate-700 rounded px-1 py-0.5 border border-slate-300 cursor-pointer focus:outline-none"
                          title="Кількість отворів шини (макс. 4 в 1 ряд)"
                        >
                          {[4, 6, 8, 12, 16].map((cnt) => (
                            <option key={cnt} value={cnt}>
                              {cnt} кл.
                            </option>
                          ))}
                        </select>

                        {busBars.length > 2 && (
                          <button
                            type="button"
                            onClick={() => onDeleteBusBar(bus.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                            title="Видалити шину"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

        </div>

        {/* DIN-рейки */}
        <div className="space-y-3.5 print:space-y-2 relative z-10 px-3 md:px-5 print:px-2">
          {Array.from({ length: config.rows }).map((_, railIndex) => {
            const railModules = getRailModules(railIndex);
            const occupied = getRailOccupiedWidth(railIndex);
            const extra = config.railExtraModules?.[railIndex] ?? 0;
            const railCapacity = config.modulesPerRow + extra;
            const free = railCapacity - occupied;
            const isOverflow = free < 0;
            const isDropActive = dragOverRail === railIndex;

            return (
              <div
                key={railIndex}
                onDragOver={(e) => handleRailDragOver(e, railIndex)}
                onDragLeave={(e) => handleRailDragLeave(e, railIndex)}
                onDrop={(e) => handleDrop(e, railIndex)}
                className={`din-rail-row relative rounded-xl border-2 transition-all p-3 ${
                  isDropActive
                    ? 'border-amber-400 bg-amber-50/50 shadow-md'
                    : isOverflow
                    ? 'border-rose-400 bg-rose-50/60'
                    : 'border-slate-200 bg-slate-50/90 shadow-2xs'
                }`}
              >
                {/* Заголовок рейки */}
                <div className="flex items-center justify-between mb-3 print:mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200 print:bg-transparent print:border-none print:px-0 print:py-0">
                      Рейка #{railIndex + 1}
                    </span>
                    <span className="no-print text-[11px] text-slate-500">
                      DIN-35 мм
                    </span>
                  </div>

                  <div className="no-print flex items-center gap-2 text-xs">
                    <span className="font-mono text-slate-700">
                      Зайнято: <strong>{occupied}</strong> / {config.modulesPerRow} мод.
                    </span>

                    {isOverflow ? (
                      <span className="flex items-center gap-1 text-rose-700 font-bold bg-rose-100 px-2 py-0.5 rounded border border-rose-300">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Переповнено на {Math.abs(free)} мод.!
                      </span>
                    ) : free === 0 ? (
                      <span className="no-print text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                        Повністю заповнена
                      </span>
                    ) : (
                      <span className="no-print text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                        Вільно: {free} мод.
                      </span>
                    )}
                  </div>
                </div>

                {/* Фізична рейка TS35 (металева смуга) з модулями */}
                <div
                  onDragOver={(e) => handleRailDragOver(e, railIndex)}
                  onDrop={(e) => handleDrop(e, railIndex)}
                  className="relative min-h-[192px] bg-slate-100 rounded-lg border border-slate-200 flex items-start px-3 pt-2.5 pb-7 overflow-x-auto print:overflow-visible shadow-inner group/rail"
                >
                  
                  {/* Металева полоса рейки по центру модулів (y = 90px) */}
                  <div className="absolute left-0 right-0 top-[90px] transform -translate-y-1/2 h-8 bg-gradient-to-b from-slate-200 via-slate-100 to-slate-300 opacity-90 pointer-events-none flex items-center justify-around border-y border-slate-300/80">
                    {Array.from({ length: 16 }).map((_, i) => (
                      <div key={i} className="w-3 h-1.5 rounded-xs bg-slate-400/60 border border-slate-500/20" />
                    ))}
                  </div>

                  {/* Список розміщених модулів на рейці з точним Drag & Drop */}
                  <div className="relative z-10 flex items-center gap-1.5 min-w-max pr-12 print:pr-0">
                    {railModules.map((m, idx) => {
                      const isDropHere =
                        dropIndicator?.railIndex === railIndex && dropIndicator?.insertIndex === idx;

                      return (
                        <React.Fragment key={m.id}>
                          {/* Індикатор вставки перед цим модулем */}
                          {isDropHere && (
                            <div className="relative flex items-center justify-center -mx-1 z-30 flex-shrink-0 h-[160px] pointer-events-none animate-in fade-in duration-150">
                              <div className="w-1.5 h-36 bg-amber-400 rounded-full shadow-[0_0_14px_rgba(251,191,36,0.95)] animate-pulse" />
                              <div className="absolute top-1 w-3 h-3 rounded-full bg-amber-400 shadow-md" />
                              <div className="absolute bottom-1 w-3 h-3 rounded-full bg-amber-400 shadow-md" />
                            </div>
                          )}

                          <div
                            onDragOver={(e) => handleModuleDragOver(e, railIndex, idx)}
                            onDrop={(e) => handleDrop(e, railIndex)}
                            className="flex-shrink-0 h-[160px] flex items-center"
                          >
                            <ModuleItem
                              module={m}
                              onEdit={onEditModule}
                              onDelete={onDeleteModule}
                              onDuplicate={onDuplicateModule}
                              onMoveLeft={() => onReorderInRail(railIndex, m.id, 'left')}
                              onMoveRight={() => onReorderInRail(railIndex, m.id, 'right')}
                              isFirst={idx === 0}
                              isLast={idx === railModules.length - 1}
                              onTerminalClick={onTerminalClick}
                              onDeleteWire={onDeleteWire}
                              activeTerminal={activeTerminal}
                              connectedTerminals={getConnectedTerminalsForModule(m.id)}
                              connectedWires={getConnectedWiresForModule(m.id)}
                              onDragStart={(id) => setDraggedModuleId(id)}
                              onDragEnd={() => {
                                setDraggedModuleId(null);
                                setDropIndicator(null);
                              }}
                              isDragging={draggedModuleId === m.id}
                              isCircuitHighlighted={circuitHighlight ? circuitHighlight.moduleIds.has(m.id) : false}
                              isCircuitDimmed={circuitHighlight ? !circuitHighlight.moduleIds.has(m.id) : false}
                              highlightedTerminals={getModuleHighlightedTerminals(m.id)}
                            />
                          </div>
                        </React.Fragment>
                      );
                    })}

                    {/* Індикатор вставки в кінець рейки */}
                    {dropIndicator?.railIndex === railIndex &&
                      dropIndicator?.insertIndex === railModules.length &&
                      railModules.length > 0 && (
                        <div className="relative flex items-center justify-center -mx-1 z-30 flex-shrink-0 h-[160px] pointer-events-none animate-in fade-in duration-150">
                          <div className="w-1.5 h-36 bg-amber-400 rounded-full shadow-[0_0_14px_rgba(251,191,36,0.95)] animate-pulse" />
                          <div className="absolute top-1 w-3 h-3 rounded-full bg-amber-400 shadow-md" />
                          <div className="absolute bottom-1 w-3 h-3 rounded-full bg-amber-400 shadow-md" />
                        </div>
                    )}

                    {/* Порожнє місце / Дроп-зона */}
                    {railModules.length === 0 ? (
                      <div
                        onDragOver={(e) => handleRailDragOver(e, railIndex)}
                        onDrop={(e) => handleDrop(e, railIndex)}
                        className="h-[160px] flex-1 min-w-[300px] border-2 border-dashed border-slate-300 bg-white/70 rounded-lg flex flex-col items-center justify-center text-slate-500 hover:border-amber-400 hover:text-amber-700 hover:bg-amber-50/30 transition cursor-pointer p-4"
                      >
                        <Plus className="w-6 h-6 mb-1 text-slate-400" />
                        <span className="text-xs font-semibold">Рейка порожня</span>
                        <span className="text-[11px] text-slate-400">
                          Перетягніть модуль сюди для розміщення
                        </span>
                      </div>
                    ) : free > 0 ? (
                      <div
                        onDragOver={(e) => handleRailDragOver(e, railIndex)}
                        onDrop={(e) => handleDrop(e, railIndex)}
                        style={{ width: `${Math.min(free, 6) * 64}px` }}
                        className="no-print h-[160px] border-2 border-dashed border-slate-300 hover:border-amber-400 hover:bg-amber-50/20 rounded-md flex flex-col items-center justify-center text-slate-400 hover:text-amber-800 bg-white/40 transition select-none flex-shrink-0 cursor-default p-2 text-center"
                        title="Вільне місце на рейці"
                      >
                        <span className="text-xs font-mono font-bold text-slate-600">+{free} мод. вільно</span>
                        <span className="text-[10px] text-slate-400 mt-1">Перетягніть модуль</span>
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Швидка лінійка модульних слотів знизу */}
                <div
                  id={`rail-labels-${railIndex}`}
                  className="no-print mt-2 flex items-center justify-between text-[10px] text-slate-400 font-mono px-1"
                >
                  <span>Модуль 1</span>
                  <span className="text-slate-400">← Крок 18 мм на модуль →</span>
                  <span>Модуль {config.modulesPerRow}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* ============================================================== */}
        {/* SVG ШАР ПРОВОДКИ (WIRING OVERLAY + SEMI-TRANSPARENCY MASK)     */}
        {/* ============================================================== */}
        {showWires && (
          <svg className="no-print print:hidden absolute inset-0 w-full h-full pointer-events-none z-20 overflow-visible">
            <defs>
              <filter id="wire-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#000" floodOpacity="0.6" />
              </filter>

              {/* Яскраве світіння для виділеного електричного кола */}
              <filter id="wire-circuit-glow" x="-40%" y="-40%" width="180%" height="180%">
                <feDropShadow dx="0" dy="0" stdDeviation="4.5" floodColor="#f59e0b" floodOpacity="0.85" />
              </filter>

              {/* МАСКА ДЛЯ ПРИХОВУВАННЯ ДРОТІВ ПІД МОДУЛЯМИ: */}
              {/* Білий колір = 100% видимість (за межами модулів). */}
              {/* Чорний колір = 0% видимість над тілом будь-якого модуля (проводи не перекривають зображення модулів!). */}
              <mask id="wire-module-mask">
                <rect x="0" y="0" width="100%" height="100%" fill="white" />
                {moduleBodyRects.map((rect) => (
                  <rect
                    key={rect.id}
                    x={rect.x}
                    y={rect.y}
                    width={rect.width}
                    height={rect.height}
                    rx="6"
                    fill="black"
                  />
                ))}
              </mask>
            </defs>

            {/* Група всіх дротів з маскою напівпрозорості */}
            <g mask="url(#wire-module-mask)">
              {(() => {
                // Рахуємо всі підключені проводи до кожної клеми
                const termWireMap = new Map<string, string[]>();
                wires.forEach((w) => {
                  const kFrom = `${w.from.moduleId}-${w.from.terminalType}-${w.from.poleIndex}`;
                  const kTo = `${w.to.moduleId}-${w.to.terminalType}-${w.to.poleIndex}`;
                  if (!termWireMap.has(kFrom)) termWireMap.set(kFrom, []);
                  termWireMap.get(kFrom)!.push(w.id);
                  if (!termWireMap.has(kTo)) termWireMap.set(kTo, []);
                  termWireMap.get(kTo)!.push(w.id);
                });

                // Розподіл по доріжках (lanes) для прямих проводів на кожній рейці
                const railBottomWiresMap = new Map<number, Array<{ id: string; minX: number; maxX: number }>>();
                const railTopWiresMap = new Map<number, Array<{ id: string; minX: number; maxX: number }>>();

                wires.forEach((w) => {
                  const isSideWire = shouldRouteViaSide(w.from, w.to, routingMode);
                  if (isSideWire) return;
                  const r1 = getTerminalRail(w.from);
                  const r2 = getTerminalRail(w.to);
                  if (r1 !== r2) return;

                  const c1 = getTerminalCoords(w.from);
                  const c2 = getTerminalCoords(w.to);
                  if (!c1 || !c2) return;

                  const minX = Math.min(c1.x, c2.x);
                  const maxX = Math.max(c1.x, c2.x);

                  if (isBottomTerminal(w.from.terminalType) && isBottomTerminal(w.to.terminalType)) {
                    if (!railBottomWiresMap.has(r1)) railBottomWiresMap.set(r1, []);
                    railBottomWiresMap.get(r1)!.push({ id: w.id, minX, maxX });
                  } else if (isTopTerminal(w.from.terminalType) && isTopTerminal(w.to.terminalType)) {
                    if (!railTopWiresMap.has(r1)) railTopWiresMap.set(r1, []);
                    railTopWiresMap.get(r1)!.push({ id: w.id, minX, maxX });
                  }
                });

                const bottomLaneMap = new Map<string, number>();
                railBottomWiresMap.forEach((list) => {
                  const res = computeCorridorLanes(list);
                  res.forEach((lane, id) => bottomLaneMap.set(id, lane));
                });

                const topLaneMap = new Map<string, number>();
                railTopWiresMap.forEach((list) => {
                  const res = computeCorridorLanes(list);
                  res.forEach((lane, id) => topLaneMap.set(id, lane));
                });

                return wires.map((wire, wireIdx) => {
                  const baseFrom = getTerminalCoords(wire.from);
                  const baseTo = getTerminalCoords(wire.to);
                  if (!baseFrom || !baseTo) return null;

                  const kFrom = `${wire.from.moduleId}-${wire.from.terminalType}-${wire.from.poleIndex}`;
                  const kTo = `${wire.to.moduleId}-${wire.to.terminalType}-${wire.to.poleIndex}`;

                  const fromWires = termWireMap.get(kFrom) || [];
                  const toWires = termWireMap.get(kTo) || [];

                  // Якщо на клемі 2 проводи: зміщуємо перший вліво (-3.5px), другий вправо (+3.5px), як у НШВІ(2)
                  const fromIdx = fromWires.indexOf(wire.id);
                  const fromOffset = fromWires.length > 1 ? (fromIdx === 0 ? -3.5 : 3.5) : 0;

                  const toIdx = toWires.indexOf(wire.id);
                  const toOffset = toWires.length > 1 ? (toIdx === 0 ? -3.5 : 3.5) : 0;

                  const fromCoords = { x: baseFrom.x + fromOffset, y: baseFrom.y };
                  const toCoords = { x: baseTo.x + toOffset, y: baseTo.y };

                  const isSide = shouldRouteViaSide(wire.from, wire.to, routingMode);
                  const railIdx = getTerminalRail(wire.from);

                  const lane =
                    isBottomTerminal(wire.from.terminalType) && isBottomTerminal(wire.to.terminalType)
                      ? bottomLaneMap.get(wire.id) ?? 0
                      : isTopTerminal(wire.from.terminalType) && isTopTerminal(wire.to.terminalType)
                      ? topLaneMap.get(wire.id) ?? 0
                      : wireIdx % 3;

                  const { pathD, deletePos } = isSide
                    ? calculateSideRoutingPath(
                        fromCoords,
                        toCoords,
                        wire.from.terminalType,
                        wire.to.terminalType,
                        wireIdx,
                        containerWidth
                      )
                    : calculateOrthogonalDirectPath(
                        fromCoords,
                        toCoords,
                        wire.from.terminalType,
                        wire.to.terminalType,
                        lane,
                        railIdx
                      );


                const isHovered = hoveredWireId === wire.id;
                const isInCircuit = circuitHighlight ? circuitHighlight.wireIds.has(wire.id) : false;
                const isCircuitDimmed = circuitHighlight && !isInCircuit;
                const isCircuitActive = circuitHighlight && isInCircuit;

                const isYellowGreen = wire.color === 'yellow_green';
                const cfg = WIRE_COLOR_CONFIG[wire.color] || WIRE_COLOR_CONFIG.blue;
                const mainWidth = isCircuitActive ? (isHovered ? 7.5 : 5.5) : (isHovered ? 5.5 : 4);

                return (
                  <g
                    key={wire.id}
                    className={`group cursor-pointer transition-opacity duration-200 ${
                      isDraggingAny || dragOverRail !== null ? 'pointer-events-none' : 'pointer-events-auto'
                    }`}
                    opacity={isCircuitDimmed ? 0.15 : 1}
                    style={isCircuitDimmed ? { filter: 'grayscale(75%)' } : undefined}
                    onMouseEnter={() => setHoveredWireId(wire.id)}
                    onMouseLeave={() => setHoveredWireId(null)}
                    onClick={() => onDeleteWire(wire.id)}
                  >
                    {/* Широка прозора лінія для легкого кліку/наведення мишкою */}
                    <path
                      d={pathD}
                      fill="none"
                      stroke="transparent"
                      strokeWidth="18"
                    />

                    {/* Яскравий ореол підсвітки якщо провід у активному колі */}
                    {isCircuitActive && (
                      <path
                        d={pathD}
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth={isHovered ? 12 : 9}
                        strokeLinejoin="round"
                        opacity="0.8"
                        filter="url(#wire-circuit-glow)"
                      />
                    )}

                    {/* Тіньова підкладка */}
                    <path
                      d={pathD}
                      fill="none"
                      stroke="#020617"
                      strokeWidth={mainWidth + 2}
                      strokeLinejoin="round"
                      opacity="0.5"
                      filter="url(#wire-glow)"
                    />

                    {/* Основне тіло проводу */}
                    {isYellowGreen ? (
                      <>
                        {/* Базовий жовтий колір */}
                        <path
                          d={pathD}
                          fill="none"
                          stroke="#eab308"
                          strokeWidth={mainWidth}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        {/* Зелені смуги поверху для класичного маркування PE */}
                        <path
                          d={pathD}
                          fill="none"
                          stroke="#22c55e"
                          strokeWidth={mainWidth}
                          strokeDasharray="8 8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </>
                    ) : wire.color === 'black' ? (
                      <>
                        <path
                          d={pathD}
                          fill="none"
                          stroke="#475569"
                          strokeWidth={mainWidth}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d={pathD}
                          fill="none"
                          stroke="#0f172a"
                          strokeWidth={Math.max(2, mainWidth - 1)}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </>
                    ) : (
                      <path
                        d={pathD}
                        fill="none"
                        stroke={cfg.hex}
                        strokeWidth={mainWidth}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    )}

                    {/* Кінцеві наконечники на клемах */}
                    <circle
                      cx={fromCoords.x}
                      cy={fromCoords.y}
                      r={isCircuitActive ? 5 : 3.5}
                      fill={isYellowGreen ? '#eab308' : cfg.hex}
                      stroke={isCircuitActive ? '#fff' : '#000'}
                      strokeWidth={isCircuitActive ? 1.5 : 1}
                      className={isCircuitActive ? 'animate-pulse' : ''}
                    />
                    <circle
                      cx={toCoords.x}
                      cy={toCoords.y}
                      r={isCircuitActive ? 5 : 3.5}
                      fill={isYellowGreen ? '#22c55e' : cfg.hex}
                      stroke={isCircuitActive ? '#fff' : '#000'}
                      strokeWidth={isCircuitActive ? 1.5 : 1}
                      className={isCircuitActive ? 'animate-pulse' : ''}
                    />

                    {/* Підказка видалення при наведенні (збільшується рівно на 25% на місці без зміщення) */}
                    {isHovered && (
                      <g
                        transform={`translate(${deletePos.x}, ${deletePos.y})`}
                        className="cursor-pointer pointer-events-auto"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteWire(wire.id);
                        }}
                      >
                        <g
                          className="transition-transform duration-150 ease-out hover:scale-125"
                          style={{ transformOrigin: '0px 0px' }}
                        >
                          <circle cx="0" cy="0" r="14" fill="transparent" />
                          <circle cx="0" cy="0" r="11" fill="#e11d48" stroke="#fff" strokeWidth="1.5" />
                          <line x1="-4" y1="-4" x2="4" y2="4" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
                          <line x1="4" y1="-4" x2="-4" y2="4" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
                        </g>
                      </g>
                    )}
                  </g>
                );
              });
            })()}
            </g>

            {/* Динамічна пунктирна лінія від активної клеми до курсору миші (з вертикальним виходом 24px) */}
            {activeStartCoords && mousePos && activeTerminal && (
              <g>
                {(() => {
                  const V_MIN = 24;
                  // Якщо на активній клемі вже є 1 провід — новий другий провід виводимо зі зміщенням +3.5px
                  const activeHasWire = wires.some(
                    (w) =>
                      (w.from.moduleId === activeTerminal.moduleId &&
                        w.from.terminalType === activeTerminal.terminalType &&
                        w.from.poleIndex === activeTerminal.poleIndex) ||
                      (w.to.moduleId === activeTerminal.moduleId &&
                        w.to.terminalType === activeTerminal.terminalType &&
                        w.to.poleIndex === activeTerminal.poleIndex)
                  );
                  const startX = activeStartCoords.x + (activeHasWire ? 3.5 : 0);
                  const startY = activeStartCoords.y;

                  const exitY =
                    isTopTerminal(activeTerminal.terminalType)
                      ? startY - V_MIN
                      : startY + V_MIN;

                  const previewPath = `M ${startX} ${startY} L ${startX} ${exitY} L ${mousePos.x} ${exitY} L ${mousePos.x} ${mousePos.y}`;

                  return (
                    <path
                      d={previewPath}
                      fill="none"
                      stroke={
                        selectedWireColor === 'yellow_green'
                          ? '#eab308'
                          : WIRE_COLOR_CONFIG[selectedWireColor]?.hex || '#10b981'
                      }
                      strokeWidth="3"
                      strokeDasharray="5 5"
                      className="animate-pulse"
                    />
                  );
                })()}

                <circle
                  cx={mousePos.x}
                  cy={mousePos.y}
                  r="5"
                  fill={WIRE_COLOR_CONFIG[selectedWireColor]?.hex || '#10b981'}
                  stroke="#fff"
                  strokeWidth="1.5"
                />
              </g>
            )}
          </svg>
        )}

        {/* Нижнє кріплення щита */}
        <div className="flex items-center justify-between border-t border-slate-200 pt-3 mt-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-300 shadow-inner" />
            <span>Стандарт DIN EN 60715 (TH 35-7.5)</span>
          </div>
          <div>
            Підходить для автоматики: Hager, Schneider, ABB, Eaton, IEK, ETI
          </div>
        </div>

        {/* Інформаційна плашка підсвіченого електричного кола */}
        {circuitHighlight && (
          <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-white/95 border-2 border-amber-400 text-slate-900 px-5 py-2.5 rounded-2xl shadow-2xl z-50 flex items-center gap-3 backdrop-blur-md animate-in fade-in slide-in-from-bottom-3 duration-200 pointer-events-none select-none">
            <div className="w-3.5 h-3.5 rounded-full bg-amber-500 animate-ping flex-shrink-0" />
            <div className="text-xs font-semibold flex items-center gap-2">
              <span className="text-slate-900 font-extrabold text-sm">⚡ Активне електричне коло:</span>
              <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md border border-amber-300 font-bold">
                {circuitHighlight.moduleIds.size} модулів (автомати, ПЗВ, реле)
              </span>
              <span className="text-slate-400">•</span>
              <span className="bg-blue-100 text-blue-900 px-2 py-0.5 rounded-md border border-blue-300 font-bold">
                {circuitHighlight.wireIds.size} проводів
              </span>
              {circuitHighlight.busBarIds.size > 0 && (
                <>
                  <span className="text-slate-400">•</span>
                  <span className="bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-md border border-emerald-300 font-bold">
                    {circuitHighlight.busBarIds.size} шин
                  </span>
                </>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
