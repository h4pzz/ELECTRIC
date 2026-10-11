export type MountType = 'surface' | 'flush'; // зовнішній / внутрішній

export interface DeviceProductOverride {
  series?: string;
  modelName?: string;
  article?: string;
  priceUah?: number;
}

export interface EnclosureConfig {
  mountType: MountType;
  rows: number;
  modulesPerRow: number;
  ipRating: 'IP40' | 'IP41' | 'IP65';
  doorType: 'transparent' | 'opaque' | 'white';
  title: string;
  enclosureOverrides?: Partial<Record<ManufacturerId, DeviceProductOverride>>;
  railExtraModules?: Record<number, number>; // Додаткові виламані/розширені модулі по рейках (наприклад +1, +2)
}

export type ModuleCategory =
  | 'breaker'       // Автоматичний вимикач
  | 'rcd'           // ПЗВ / УЗО
  | 'rcbo'          // Дифавтомат
  | 'voltage_relay' // Реле напруги
  | 'phase_selector'// Реле вибору фаз (автоматичний перемикач фаз)
  | 'contactor'     // Контактор
  | 'switch'        // Перемикач 1-0-2 (генератор / мережа)
  | 'cross_module'  // Крос-модуль / розподільчий блок
  | 'meter'         // Вольтметр / амперметр / лічильник
  | 'socket'        // Модульна розетка
  | 'blank';        // Заглушка


export interface CatalogDevice {
  id: string;
  name: string;
  category: ModuleCategory;
  width: number; // Кількість модулів DIN (18мм = 1 мод)
  poles: 1 | 2 | 3 | 4;
  defaultRating: string;
  availableRatings: string[];
  description: string;
  color: string;
  defaultLabel: string;
  crossModuleTerminalsPerRow?: 4 | 7 | 8 | 11;
}

export interface PlacedModule {
  id: string;
  catalogId: string;
  name: string;
  label: string; // Користувацький підпис (наприклад: "Кухня Розетки")
  category: ModuleCategory;
  width: number;
  poles: 1 | 2 | 3 | 4;
  rating: string; // наприклад "C16", "25A 30mA A"
  phase?: 'L1' | 'L2' | 'L3' | '3F';
  railIndex: number;
  position: number;
  manufacturerOverrides?: Partial<Record<ManufacturerId, DeviceProductOverride>>;
  crossModuleTerminalsPerRow?: 4 | 7 | 8 | 11;
}

export type ManufacturerId = 'hager' | 'schneider' | 'abb' | 'eaton' | 'iek' | 'eti';

export interface ManufacturerInfo {
  id: ManufacturerId;
  name: string;
  country: string;
  series: string;
  description: string;
  accentColor: string;
  logoBg: string;
}

export interface MappedDeviceProduct {
  article: string;
  modelName: string;
  series: string;
  priceUah: number;
  description: string;
}

export interface EnclosureProduct {
  article: string;
  modelName: string;
  series: string;
  priceUah: number;
}

export type WireColor = 'gray' | 'black' | 'red' | 'blue' | 'yellow_green';

export type TerminalType = 'top' | 'bottom' | 'bus' | 'cm1' | 'cm2' | 'cm3' | 'cm4';

export interface TerminalId {
  moduleId: string;
  terminalType: TerminalType;
  poleIndex: number;
}

export interface WireConnection {
  id: string;
  from: TerminalId;
  to: TerminalId;
  color: WireColor;
}

export type BusBarType = 'n' | 'pe';

export interface BusBar {
  id: string;
  type: BusBarType;
  name: string;
  terminalsCount: number;
}

export interface SavedSwitchboard {
  id: string;
  userId?: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  config: EnclosureConfig;
  modules: PlacedModule[];
  manufacturerId: ManufacturerId;
  busBars: BusBar[];
  wires: WireConnection[];
  totalModules: number;
  totalCapacity: number;
}


