import type {
  ManufacturerId,
  ManufacturerInfo,
  MappedDeviceProduct,
  EnclosureProduct,
  PlacedModule,
  MountType,
  ModuleCategory,
  DeviceProductOverride,
} from '../types/electric';

export const MANUFACTURERS: ManufacturerInfo[] = [
  {
    id: 'hager',
    name: 'Hager',
    country: 'Німеччина / Франція',
    series: 'Volta / Golf / MBN / MJN / CDA',
    description: 'Еталонний вибір більшості електромонтажників в Україні. Продумані клеми, швидкий монтаж.',
    accentColor: '#0284c7', // Sky-600
    logoBg: 'bg-sky-950 text-sky-400 border-sky-700',
  },
  {
    id: 'schneider',
    name: 'Schneider Electric',
    country: 'Франція',
    series: 'Resi9 / Acti9 / Easy9 / Mini Pragma',
    description: 'Один зі світових лідерів. Серія Resi9 оптимізована для квартир і котеджів, Acti9 — промисловий преміум.',
    accentColor: '#16a34a', // Green-600
    logoBg: 'bg-emerald-950 text-emerald-400 border-emerald-700',
  },
  {
    id: 'abb',
    name: 'ABB',
    country: 'Швейцарія / Німеччина',
    series: 'Compact Home / System Pro M / Basic M / Mistral',
    description: 'Преміальна європейська якість. Висока стійкість до струмів КЗ та безкомпромісний захист.',
    accentColor: '#dc2626', // Red-600
    logoBg: 'bg-rose-950 text-rose-400 border-rose-700',
  },
  {
    id: 'eaton',
    name: 'Eaton (Moeller)',
    country: 'США / Чехія / Австрія',
    series: 'xPole PL6 / xPole Home / PL7 / KLV',
    description: 'Перевірена австрійська школа Moeller. Надійні диференційні апарати та зручні корпуси KLV.',
    accentColor: '#f59e0b', // Amber-500
    logoBg: 'bg-amber-950 text-amber-400 border-amber-700',
  },
  {
    id: 'eti',
    name: 'ETI',
    country: 'Словенія',
    series: 'Etimat 6 / Etimat 10 / EFI / KZS / ECM',
    description: 'Якісна європейська автоматика за збалансованою ціною. Чудова альтернатива преміум-сегменту.',
    accentColor: '#8b5cf6', // Violet-500
    logoBg: 'bg-purple-950 text-purple-400 border-purple-700',
  },
  {
    id: 'iek',
    name: 'IEK',
    country: 'Україна / Китай',
    series: 'Karat / Armat / Generica / ЩРВ / ЩРН',
    description: 'Бюджетний та доступний сегмент для комерційних або невибагливих побутових об’єктів.',
    accentColor: '#eab308', // Yellow-500
    logoBg: 'bg-yellow-950 text-yellow-400 border-yellow-700',
  },
];

// ---------------------------------------------------------------------------
// Корпуси щитів (Enclosures)
// ---------------------------------------------------------------------------

export function getAvailableEnclosureSeries(
  manufacturerId: ManufacturerId,
  mountType: MountType
): string[] {
  const isFlush = mountType === 'flush';
  switch (manufacturerId) {
    case 'hager':
      return isFlush ? ['Volta', 'Golf (врізний)'] : ['Golf (навісний)', 'Vega'];
    case 'schneider':
      return isFlush ? ['Resi9', 'Mini Pragma'] : ['Mini Pragma', 'Resi9', 'Easy9 Box'];
    case 'abb':
      return isFlush ? ['Mistral41F'] : ['Mistral41W', 'Mistral65 (IP65)'];
    case 'eaton':
      return isFlush ? ['KLV'] : ['IKA (IP65)', 'BF'];
    case 'eti':
      return isFlush ? ['ECM'] : ['ECT', 'DIDO'];
    case 'iek':
    default:
      return isFlush ? ['ЩРВ-П', 'PRIME'] : ['ЩРН-П', 'PRIME'];
  }
}

export function getAllEnclosureOptions(
  manufacturerId: ManufacturerId,
  mountType: MountType,
  totalModules: number
): EnclosureProduct[] {
  const seriesList = getAvailableEnclosureSeries(manufacturerId, mountType);
  return seriesList.map((series) =>
    getEnclosureProduct(manufacturerId, mountType, totalModules, series)
  );
}

export function getEnclosureProduct(
  manufacturerId: ManufacturerId,
  mountType: MountType,
  totalModules: number,
  preferredSeries?: string,
  override?: DeviceProductOverride
): EnclosureProduct {
  if (override?.modelName && override?.article) {
    return {
      article: override.article,
      modelName: override.modelName,
      series: override.series || preferredSeries || 'Власна',
      priceUah: override.priceUah ?? 0,
    };
  }

  const isFlush = mountType === 'flush';
  const series = preferredSeries || override?.series;

  switch (manufacturerId) {
    case 'hager':
      if (series === 'Golf (врізний)' || (!isFlush && series !== 'Vega')) {
        if (totalModules <= 12) return { article: 'VS112TD', modelName: 'Щит накладний Hager Golf 1 ряд (12 мод)', series: 'Golf', priceUah: 1100 };
        if (totalModules <= 24) return { article: 'VS212TD', modelName: 'Щит накладний Hager Golf 2 ряди (24 мод)', series: 'Golf', priceUah: 1650 };
        if (totalModules <= 36) return { article: 'VS312TD', modelName: 'Щит накладний Hager Golf 3 ряди (36 мод)', series: 'Golf', priceUah: 2150 };
        if (totalModules <= 48) return { article: 'VS412TD', modelName: 'Щит накладний Hager Golf 4 ряди (48 мод)', series: 'Golf', priceUah: 2900 };
        return { article: 'VS418TD', modelName: 'Щит накладний Hager Golf 4 ряди по 18 (72 мод)', series: 'Golf', priceUah: 3800 };
      }
      if (series === 'Vega') {
        if (totalModules <= 24) return { article: 'VB218TD', modelName: 'Щит Hager Vega 2 ряди (36 мод)', series: 'Vega', priceUah: 2300 };
        return { article: 'VB318TD', modelName: 'Щит Hager Vega 3 ряди (54 мод)', series: 'Vega', priceUah: 3100 };
      }
      // Default: Volta
      if (totalModules <= 12) return { article: 'VU12NE', modelName: 'Щит вбудований Hager Volta 1 ряд (12 мод)', series: 'Volta', priceUah: 1850 };
      if (totalModules <= 24) return { article: 'VU24NE', modelName: 'Щит вбудований Hager Volta 2 ряди (24 мод)', series: 'Volta', priceUah: 2450 };
      if (totalModules <= 36) return { article: 'VU36NE', modelName: 'Щит вбудований Hager Volta 3 ряди (36 мод)', series: 'Volta', priceUah: 3200 };
      if (totalModules <= 48) return { article: 'VU48NE', modelName: 'Щит вбудований Hager Volta 4 ряди (48 мод)', series: 'Volta', priceUah: 4100 };
      return { article: 'VU60NE', modelName: 'Щит вбудований Hager Volta 5 рядів (60 мод)', series: 'Volta', priceUah: 5400 };

    case 'schneider':
      if (series === 'Mini Pragma') {
        if (isFlush) {
          if (totalModules <= 18) return { article: 'MIP22112', modelName: 'Щит врізний Schneider Mini Pragma 12 мод', series: 'Mini Pragma', priceUah: 1200 };
          if (totalModules <= 24) return { article: 'MIP22212', modelName: 'Щит врізний Schneider Mini Pragma 24 мод', series: 'Mini Pragma', priceUah: 1850 };
          if (totalModules <= 36) return { article: 'MIP22312', modelName: 'Щит врізний Schneider Mini Pragma 36 мод', series: 'Mini Pragma', priceUah: 2650 };
          return { article: 'MIP22412', modelName: 'Щит врізний Schneider Mini Pragma 48 мод', series: 'Mini Pragma', priceUah: 3500 };
        } else {
          if (totalModules <= 18) return { article: 'MIP12112', modelName: 'Щит накладний Schneider Mini Pragma 12 мод', series: 'Mini Pragma', priceUah: 990 };
          if (totalModules <= 24) return { article: 'MIP12212', modelName: 'Щит накладний Schneider Mini Pragma 24 мод', series: 'Mini Pragma', priceUah: 1550 };
          if (totalModules <= 36) return { article: 'MIP12312', modelName: 'Щит накладний Schneider Mini Pragma 36 мод', series: 'Mini Pragma', priceUah: 2200 };
          return { article: 'MIP12412', modelName: 'Щит накладний Schneider Mini Pragma 48 мод', series: 'Mini Pragma', priceUah: 2950 };
        }
      }
      if (series === 'Easy9 Box') {
        if (totalModules <= 18) return { article: 'EZ9E112P2F', modelName: 'Щит Schneider Easy9 Box 12 мод', series: 'Easy9 Box', priceUah: 750 };
        if (totalModules <= 24) return { article: 'EZ9E212P2F', modelName: 'Щит Schneider Easy9 Box 24 мод', series: 'Easy9 Box', priceUah: 1150 };
        return { article: 'EZ9E312P2F', modelName: 'Щит Schneider Easy9 Box 36 мод', series: 'Easy9 Box', priceUah: 1650 };
      }
      // Default: Resi9
      if (isFlush) {
        if (totalModules <= 18) return { article: 'R9H1136', modelName: 'Щит врізний Schneider Resi9 18 мод', series: 'Resi9', priceUah: 1550 };
        if (totalModules <= 24) return { article: 'R9H2136', modelName: 'Щит врізний Schneider Resi9 24 мод', series: 'Resi9', priceUah: 2200 };
        if (totalModules <= 36) return { article: 'R9H3136', modelName: 'Щит врізний Schneider Resi9 36 мод', series: 'Resi9', priceUah: 2950 };
        return { article: 'R9H3336', modelName: 'Щит врізний Schneider Resi9 48 мод', series: 'Resi9', priceUah: 3750 };
      } else {
        if (totalModules <= 18) return { article: 'R9H1312', modelName: 'Щит накладний Schneider Resi9 12 мод', series: 'Resi9', priceUah: 1350 };
        if (totalModules <= 24) return { article: 'R9H1324', modelName: 'Щит накладний Schneider Resi9 24 мод', series: 'Resi9', priceUah: 1950 };
        if (totalModules <= 36) return { article: 'R9H1336', modelName: 'Щит накладний Schneider Resi9 36 мод', series: 'Resi9', priceUah: 2600 };
        return { article: 'R9H1348', modelName: 'Щит накладний Schneider Resi9 48 мод', series: 'Resi9', priceUah: 3200 };
      }

    case 'abb':
      if (series === 'Mistral65 (IP65)') {
        if (totalModules <= 12) return { article: '1SLM006500A1103', modelName: 'Щит ABB Mistral65 IP65 12M', series: 'Mistral65', priceUah: 1850 };
        if (totalModules <= 24) return { article: '1SLM006500A1105', modelName: 'Щит ABB Mistral65 IP65 24M', series: 'Mistral65', priceUah: 2750 };
        return { article: '1SLM006500A1107', modelName: 'Щит ABB Mistral65 IP65 36M', series: 'Mistral65', priceUah: 3650 };
      }
      if (isFlush) {
        if (totalModules <= 12) return { article: '1SLM004100A1203', modelName: 'Щит вбудований ABB Mistral41F 12M', series: 'Mistral41F', priceUah: 1450 };
        if (totalModules <= 24) return { article: '1SLM004100A1205', modelName: 'Щит вбудований ABB Mistral41F 24M', series: 'Mistral41F', priceUah: 2200 };
        if (totalModules <= 36) return { article: '1SLM004100A1207', modelName: 'Щит вбудований ABB Mistral41F 36M', series: 'Mistral41F', priceUah: 2950 };
        return { article: '1SLM004100A1209', modelName: 'Щит вбудований ABB Mistral41F 48M', series: 'Mistral41F', priceUah: 3900 };
      } else {
        if (totalModules <= 12) return { article: '1SLM004100A1103', modelName: 'Щит настінний ABB Mistral41W 12M', series: 'Mistral41W', priceUah: 1250 };
        if (totalModules <= 24) return { article: '1SLM004100A1105', modelName: 'Щит настінний ABB Mistral41W 24M', series: 'Mistral41W', priceUah: 1950 };
        if (totalModules <= 36) return { article: '1SLM004100A1107', modelName: 'Щит настінний ABB Mistral41W 36M', series: 'Mistral41W', priceUah: 2600 };
        return { article: '1SLM004100A1109', modelName: 'Щит настінний ABB Mistral41W 48M', series: 'Mistral41W', priceUah: 3450 };
      }

    case 'eaton':
      if (series === 'IKA (IP65)' || !isFlush) {
        if (totalModules <= 12) return { article: 'IKA-1/12-ST', modelName: 'Щит накладний Eaton IKA IP65 12M', series: 'IKA', priceUah: 1300 };
        if (totalModules <= 24) return { article: 'IKA-2/24-ST', modelName: 'Щит накладний Eaton IKA IP65 24M', series: 'IKA', priceUah: 1950 };
        return { article: 'IKA-3/36-ST', modelName: 'Щит накладний Eaton IKA IP65 36M', series: 'IKA', priceUah: 2750 };
      }
      if (totalModules <= 14) return { article: 'KLV-12UPS-SF', modelName: 'Щит вбудований Eaton KLV 1 ряд (12+2 мод)', series: 'KLV', priceUah: 1750 };
      if (totalModules <= 28) return { article: 'KLV-24UPS-SF', modelName: 'Щит вбудований Eaton KLV 2 ряди (24+4 мод)', series: 'KLV', priceUah: 2350 };
      if (totalModules <= 42) return { article: 'KLV-36UPS-SF', modelName: 'Щит вбудований Eaton KLV 3 ряди (36+6 мод)', series: 'KLV', priceUah: 3100 };
      return { article: 'KLV-48UPS-SF', modelName: 'Щит вбудований Eaton KLV 4 ряди (48+8 мод)', series: 'KLV', priceUah: 3950 };

    case 'eti':
      if (isFlush) {
        if (totalModules <= 12) return { article: '001101010', modelName: 'Щит внутрішній ETI ECM 12PT', series: 'ECM', priceUah: 850 };
        if (totalModules <= 24) return { article: '001101011', modelName: 'Щит внутрішній ETI ECM 24PT', series: 'ECM', priceUah: 1350 };
        if (totalModules <= 36) return { article: '001101012', modelName: 'Щит внутрішній ETI ECM 36PT', series: 'ECM', priceUah: 1850 };
        return { article: '001101013', modelName: 'Щит внутрішній ETI ECM 48PT', series: 'ECM', priceUah: 2400 };
      } else {
        if (totalModules <= 12) return { article: '001101000', modelName: 'Щит навісний ETI ECT 12PT', series: 'ECT', priceUah: 720 };
        if (totalModules <= 24) return { article: '001101001', modelName: 'Щит навісний ETI ECT 24PT', series: 'ECT', priceUah: 1150 };
        return { article: '001101002', modelName: 'Щит навісний ETI ECT 36PT', series: 'ECT', priceUah: 1600 };
      }

    case 'iek':
    default:
      if (isFlush) {
        if (totalModules <= 12) return { article: 'MKP12-V-12-30-0', modelName: 'Щит пластиковий вбудований IEK ЩРВ-П 12 мод', series: 'ЩРВ-П', priceUah: 480 };
        if (totalModules <= 24) return { article: 'MKP12-V-24-30-0', modelName: 'Щит пластиковий вбудований IEK ЩРВ-П 24 мод', series: 'ЩРВ-П', priceUah: 790 };
        if (totalModules <= 36) return { article: 'MKP12-V-36-30-0', modelName: 'Щит пластиковий вбудований IEK ЩРВ-П 36 мод', series: 'ЩРВ-П', priceUah: 1120 };
        return { article: 'MKP12-V-48-30-0', modelName: 'Щит пластиковий вбудований IEK ЩРВ-П 48 мод', series: 'ЩРВ-П', priceUah: 1550 };
      } else {
        if (totalModules <= 12) return { article: 'MKP12-N-12-30-0', modelName: 'Щит накладний IEK ЩРН-П 12 мод', series: 'ЩРН-П', priceUah: 420 };
        if (totalModules <= 24) return { article: 'MKP12-N-24-30-0', modelName: 'Щит накладний IEK ЩРН-П 24 мод', series: 'ЩРН-П', priceUah: 710 };
        if (totalModules <= 36) return { article: 'MKP12-N-36-30-0', modelName: 'Щит накладний IEK ЩРН-П 36 мод', series: 'ЩРН-П', priceUah: 990 };
        return { article: 'MKP12-N-48-30-0', modelName: 'Щит накладний IEK ЩРН-П 48 мод', series: 'ЩРН-П', priceUah: 1390 };
      }
  }
}

// ---------------------------------------------------------------------------
// Серії для категорій модульних пристроїв
// ---------------------------------------------------------------------------

export function getMainBreakerSeries(manufacturerId: ManufacturerId, rating?: string): string[] {
  switch (manufacturerId) {
    case 'hager': {
      const curve = rating?.match(/^[A-Z]+/i)?.[0]?.toUpperCase() || 'C';
      if (curve === 'B') {
        return ['MBN (6kA)', 'MJN (4.5kA)', 'NBN (10kA)'];
      }
      if (curve === 'D') {
        return ['MDN (6kA)', 'NDN (10kA)'];
      }
      return ['MCN (6kA)', 'MLN (4.5kA)', 'NCN (10kA)'];
    }
    case 'schneider':
      return ['Resi9 (6kA)', 'Acti9 iK60N (6kA)', 'Acti9 iC60N (10kA)', 'Easy9 (4.5kA)'];
    case 'abb':
      return ['Compact Home SH200 (6kA)', 'System Pro M S200 (6kA)', 'Basic M (4.5kA)'];
    case 'eaton':
      return ['xPole PL6 (6kA)', 'xPole Home HNX (4.5kA)', 'xPole PL7 (10kA)'];
    case 'eti':
      return ['Etimat 6 (6kA)', 'Etimat 10 (10kA)', 'Etimat 1N (1P+N)'];
    case 'iek':
    default:
      return ['Karat BA47-29 (4.5kA)', 'Armat BA04-29 (6kA)', 'Generica (4.5kA)'];
  }
}

export function matchSeriesForRating(
  currentSeries: string | undefined,
  targetSeriesList: string[]
): string {
  if (!targetSeriesList || targetSeriesList.length === 0) return '';
  if (!currentSeries) return targetSeriesList[0];

  // Точний збіг
  if (targetSeriesList.includes(currentSeries)) return currentSeries;

  // Пошук за класом вимикальної здатності (наприклад "6kA", "4.5kA", "10kA")
  const kaMatch = currentSeries.match(/(\d+(?:\.\d+)?\s*kA)/i)?.[1]?.replace(/\s+/, '').toLowerCase();
  if (kaMatch) {
    const tierMatch = targetSeriesList.find((s) =>
      s.replace(/\s+/, '').toLowerCase().includes(kaMatch)
    );
    if (tierMatch) return tierMatch;
  }

  // Пошук за типом A / AC для ПЗВ / дифавтоматів
  const typeMatch = currentSeries.match(/(тип\s*[a-z]+)/i)?.[1]?.toLowerCase();
  if (typeMatch) {
    const matched = targetSeriesList.find((s) => s.toLowerCase().includes(typeMatch));
    if (matched) return matched;
  }

  return targetSeriesList[0];
}

export function getAvailableSeriesForCategory(
  manufacturerId: ManufacturerId,
  category: ModuleCategory,
  rating?: string
): string[] {
  switch (category) {
    case 'breaker':
      return getMainBreakerSeries(manufacturerId, rating);

    case 'rcd':
      switch (manufacturerId) {
        case 'hager':
          return ['CDA (Тип A)', 'CDC (Тип AC)', 'CFA (Тип A HI)'];
        case 'schneider':
          return ['Resi9 (Тип A)', 'Resi9 (Тип AC)', 'Acti9 iID (Тип A)', 'Acti9 iID (Тип AC)', 'Easy9 (Тип AC)'];
        case 'abb':
          return ['FH200 (Тип AC)', 'FH200 (Тип A)', 'F200 (Тип A)', 'Basic M (Тип AC)'];
        case 'eaton':
          return ['xPole HNC (Тип A)', 'xPole HNC (Тип AC)', 'xPole dRCM (Тип A)'];
        case 'eti':
          return ['EFI-2 (Тип A)', 'EFI-2 (Тип AC)', 'EFI-4 (Тип A)'];
        case 'iek':
        default:
          return ['ВД1-63 Karat (Тип AC)', 'Armat ВД-03 (Тип A)'];
      }

    case 'rcbo':
      switch (manufacturerId) {
        case 'hager':
          return ['ADA (Тип A)', 'ADC (Тип AC)', 'ACA (1 мод)'];
        case 'schneider':
          return ['Resi9 (Тип A)', 'Acti9 iDPN N Vigi', 'Easy9 (Тип AC)'];
        case 'abb':
          return ['DS201 (Тип A)', 'DS201M (10kA)', 'Basic M (Тип AC)'];
        case 'eaton':
          return ['xPole HNB (Тип A)', 'xPole HNB (Тип AC)', 'xPole PKNM'];
        case 'eti':
          return ['KZS-2M (2 мод)', 'KZS-1M (1 мод)'];
        case 'iek':
        default:
          return ['АД12 Karat', 'АВДТ32 Karat', 'Armat АВДТ-03'];
      }

    case 'voltage_relay':
      return ['ZUBR D2 (TrueRMS)', 'ZUBR D6 (White display)', 'ZUBR 3F (3-фазне)', 'EU102'];

    case 'phase_selector':
      return ['Новатек ПЕФ-320', 'Новатек ПЕФ-319', 'DigiTOP PS-63A'];

    case 'inverter':
      return [
        'Deye SUN-6K-SG04LP1 (1Ф 6кВт)',
        'Deye SUN-12K-SG04LP3 (3Ф 12кВт)',
        'Victron MultiPlus-II 48/5000',
        'Axioma ISGRID 5000',
        'Huawei SUN2000-10KTL',
      ];

    case 'switch':
      switch (manufacturerId) {
        case 'hager':
          return ['SFT (I-0-II)', 'SFB'];
        case 'schneider':
          return ['Acti9 iSSW', 'Acti9 iCM', 'Compact INS'];
        case 'abb':
          return ['System Pro M E214', 'OT (Реверсивні)'];
        case 'eaton':
          return ['xPole Z-S', 'T0 (Кулачкові)'];
        case 'eti':
          return ['SSQ'];
        case 'iek':
        default:
          return ['ВРТ-63'];
      }

    case 'contactor':
      switch (manufacturerId) {
        case 'hager':
          return ['ESC (Безшумні)', 'ESL (Ручне кер.)'];
        case 'schneider':
          return ['Acti9 iCT', 'Easy9'];
        case 'abb':
          return ['EN (Безшумні)', 'ESB'];
        case 'eaton':
          return ['Z-SCH'];
        case 'eti':
          return ['R25 / R40'];
        case 'iek':
        default:
          return ['КМ20'];
      }

    case 'cross_module':
      return ['Modular', 'Linergy', 'Розподільчий блок'];

    case 'meter':
      return ['SM (Digital)', 'VoltControl'];

    case 'socket':
      return ['Schuko DIN'];

    case 'blank':
    default:
      return ['Стандартна заглушка'];
  }
}

// ---------------------------------------------------------------------------
// Підбір конкретних моделей та альтернатив
// ---------------------------------------------------------------------------

function normalizeSeries(rawSeries: string): string {
  return rawSeries.replace(/\s*\(.*?\)/g, '').trim().toLowerCase();
}

export function getAvailableProductsForModule(
  module: PlacedModule,
  manufacturerId: ManufacturerId
): MappedDeviceProduct[] {
  const seriesList = getAvailableSeriesForCategory(manufacturerId, module.category, module.rating);
  const results: MappedDeviceProduct[] = [];
  const seenArticles = new Set<string>();

  for (const ser of seriesList) {
    const prod = mapDeviceToProduct(module, manufacturerId, ser);
    if (!seenArticles.has(prod.article)) {
      seenArticles.add(prod.article);
      results.push(prod);
    }
  }

  return results;
}

export function mapDeviceToProduct(
  module: PlacedModule,
  manufacturerId: ManufacturerId,
  preferredSeries?: string
): MappedDeviceProduct {
  const override = module.manufacturerOverrides?.[manufacturerId];

  // Якщо користувач вручну задав ВЛАСНУ модель та артикул (і не запитано зміну серії preferredSeries)
  if (!preferredSeries && override?.series === 'Власна' && override?.modelName && override?.article) {
    return {
      article: override.article,
      modelName: override.modelName,
      series: 'Власна',
      priceUah: override.priceUah ?? 0,
      description: `Користувацька модель (${override.series || 'Власна'})`,
    };
  }

  const requestedSeries = preferredSeries || override?.series;
  const ratingClean = module.rating.split(' ')[0] || 'C16';
  const amps = ratingClean.replace(/^[A-Z]+/i, '') || '16';
  const curve = (ratingClean.match(/^[A-Z]+/i)?.[0] || 'C').toUpperCase();
  const normSeries = requestedSeries ? normalizeSeries(requestedSeries) : '';

  // Спеціалізоване модульне обладнання: Реле вибору фаз
  if (module.category === 'phase_selector') {
    if (normSeries.includes('319') || module.name.includes('319') || module.width === 5) {
      return {
        article: 'PEF-319',
        modelName: 'Реле вибору фаз Новатек-Електро ПЕФ-319 (30A, цифровий дисплей)',
        series: 'Новатек ПЕФ-319',
        priceUah: 3450,
        description: 'Мікропроцесорний перемикач фаз Новатек-Електро ПЕФ-319 на 5 DIN модулів',
      };
    }
    if (normSeries.includes('digitop') || normSeries.includes('ps-63') || module.name.includes('PS-63') || module.width === 6) {
      return {
        article: 'PS-63A',
        modelName: 'Автоматичний перемикач фаз DigiTOP PS-63A (63A прямострумне)',
        series: 'DigiTOP PS-63A',
        priceUah: 3100,
        description: 'Автоматичний перемикач фаз з трьома цифровими індикаторами DigiTOP PS-63A',
      };
    }
    // За замовчуванням: Новатек ПЕФ-320
    return {
      article: 'PEF-320',
      modelName: 'Реле вибору фаз Новатек-Електро ПЕФ-320 (16A, 2 DIN)',
      series: 'Новатек ПЕФ-320',
      priceUah: 2150,
      description: 'Компактний універсальний автоматичний перемикач фаз Новатек ПЕФ-320',
    };
  }

  // Спеціалізоване обладнання: Гібридні інвертори та ДБЖ
  if (module.category === 'inverter') {
    const is3P = module.poles === 4 || module.width >= 6;
    if (normSeries.includes('victron') || module.name.includes('Victron')) {
      return {
        article: 'PMP482505010',
        modelName: 'Інвертор/ДБЖ Victron MultiPlus-II 48/5000/70-50 230V',
        series: 'Victron MultiPlus-II',
        priceUah: 46800,
        description: 'Преміальний гібридний інвертор-ДБЖ Victron Energy MultiPlus-II (5 кВА / 4 кВт, 48V)',
      };
    }
    if (normSeries.includes('axioma') || normSeries.includes('powmr')) {
      return {
        article: 'ISGRID-5000',
        modelName: 'Гібридний інвертор Axioma Energy ISGRID 5000 (5 кВт, 48V)',
        series: 'Axioma ISGRID',
        priceUah: 23500,
        description: 'Бюджетний автономний/гібридний сонячний інвертор 5 кВт з чистим синусом',
      };
    }
    if (normSeries.includes('huawei')) {
      return {
        article: 'SUN2000-10KTL-M1',
        modelName: 'Гібридний інвертор Huawei SUN2000-10KTL-M1 (10 кВт, 3Ф) + Backup Box',
        series: 'Huawei SUN2000',
        priceUah: 72000,
        description: '3-фазний гібридний інвертор Huawei з підтримкою високовольтних батарей LUNA2000',
      };
    }
    if (is3P) {
      return {
        article: 'SUN-12K-SG04LP3-EU',
        modelName: 'Гібридний інвертор Deye SUN-12K-SG04LP3-EU (12 кВт, 3Ф, 48V АКБ)',
        series: 'Deye 3Ф SG04LP3',
        priceUah: 94500,
        description: 'Топовий трифазний низьковольтний (48V) гібридний інвертор Deye 12 кВт з повноцінним EPS-виходом',
      };
    }
    // За замовчуванням 1Ф: Deye 6kW
    return {
      article: 'SUN-6K-SG04LP1-EU',
      modelName: 'Гібридний інвертор Deye SUN-6K-SG04LP1-EU (6 кВт, 1Ф, 48V АКБ)',
      series: 'Deye 1Ф SG04LP1',
      priceUah: 41500,
      description: 'Найпопулярніший однофазний гібридний інвертор Deye 6 кВт для квартир та будинків',
    };
  }

  switch (manufacturerId) {
    // =======================================================================
    // 1. HAGER
    // =======================================================================
    case 'hager': {
      if (module.category === 'breaker') {
        const is4_5 = normSeries.includes('mjn') || normSeries.includes('mln') || normSeries.includes('4.5');
        const is10 = normSeries.includes('nbn') || normSeries.includes('ncn') || normSeries.includes('ndn') || normSeries.includes('10ka') || normSeries.includes('hmb');

        if (is4_5) {
          const code = curve === 'B' ? 'MJN' : 'MLN';
          const price = override?.priceUah ?? (module.poles === 1 ? 175 : module.poles === 2 ? 410 : module.poles === 3 ? 650 : 950);
          return {
            article: `${code}${module.poles}${amps.padStart(2, '0')}`,
            modelName: `Автоматичний вимикач Hager ${code} ${module.poles}P ${ratingClean} 4.5kA`,
            series: `${code} (4.5kA)`,
            priceUah: price,
            description: `Автомат Hager економ-серії ${code} ${ratingClean}`,
          };
        }

        if (is10) {
          const code = curve === 'B' ? 'NBN' : curve === 'D' ? 'NDN' : 'NCN';
          const price = override?.priceUah ?? (module.poles === 1 ? 390 : module.poles === 2 ? 890 : module.poles === 3 ? 1350 : 1950);
          return {
            article: `${code}${module.poles}${amps.padStart(2, '0')}`,
            modelName: `Автоматичний вимикач Hager ${code} ${module.poles}P ${ratingClean} 10kA`,
            series: `${code} (10kA)`,
            priceUah: price,
            description: `Автомат Hager промислової серії ${code} 10kA ${ratingClean}`,
          };
        }

        // Default: 6kA (MBN для B, MDN для D, MCN для C)
        const code = curve === 'B' ? 'MBN' : curve === 'D' ? 'MDN' : 'MCN';
        const price = override?.priceUah ?? (module.poles === 1 ? 215 : module.poles === 2 ? 490 : module.poles === 3 ? 780 : 1150);
        return {
          article: `${code}${module.poles}${amps.padStart(2, '0')}`,
          modelName: `Автоматичний вимикач Hager ${code} ${module.poles}P ${ratingClean} 6kA`,
          series: `${code} (6kA)`,
          priceUah: price,
          description: `Автомат Hager ${code} ${ratingClean}, характеристика ${curve}`,
        };
      }

      if (module.category === 'rcd') {
        const isCdc = normSeries.includes('cdc');
        const isCfa = normSeries.includes('cfa');

        if (isCdc) {
          const price = module.poles === 2 ? 1350 : 1890;
          return {
            article: module.poles === 2 ? 'CDC240D' : 'CDC440D',
            modelName: `ПЗВ Hager CDC ${module.poles}P 40A 30mA тип AC`,
            series: 'CDC (Тип AC)',
            priceUah: price,
            description: 'ПЗВ Hager тип AC стандартний',
          };
        }
        if (isCfa) {
          const price = module.poles === 2 ? 2450 : 3400;
          return {
            article: module.poles === 2 ? 'CFA240D' : 'CFA440D',
            modelName: `ПЗВ Hager CFA ${module.poles}P 40A 30mA тип A HI (високостійке)`,
            series: 'CFA (Тип A HI)',
            priceUah: price,
            description: 'ПЗВ Hager тип A HI проти помилкових спрацьовувань',
          };
        }
        // Default: CDA (Тип A)
        const price = module.poles === 2 ? 1650 : 2350;
        return {
          article: module.poles === 2 ? 'CDA240D' : 'CDA440D',
          modelName: `ПЗВ Hager CDA ${module.poles}P 40A 30mA тип A`,
          series: 'CDA (Тип A)',
          priceUah: price,
          description: 'ПЗВ Hager тип A (чутливе до пульсуючого постійного струму)',
        };
      }

      if (module.category === 'rcbo') {
        if (normSeries.includes('adc')) {
          return {
            article: 'ADC916D',
            modelName: `Дифавтомат Hager ADC 1P+N ${ratingClean} 30mA тип AC`,
            series: 'ADC (Тип AC)',
            priceUah: 1390,
            description: 'Дифавтомат Hager тип AC 4.5kA',
          };
        }
        if (normSeries.includes('aca')) {
          return {
            article: 'ACA916D',
            modelName: `Дифавтомат Hager ACA 1P+N ${ratingClean} 30mA 1M (компакт)`,
            series: 'ACA (1 мод)',
            priceUah: 2150,
            description: 'Компактний 1-модульний дифавтомат Hager',
          };
        }
        return {
          article: 'ADA916D',
          modelName: `Дифавтомат Hager ADA 1P+N ${ratingClean} 30mA тип A 6kA`,
          series: 'ADA (Тип A)',
          priceUah: 1780,
          description: 'Диференційний вимикач Hager 6kA тип A',
        };
      }

      if (module.category === 'voltage_relay') {
        if (normSeries.includes('d6')) {
          return {
            article: 'ZUBR-D6-63',
            modelName: 'Реле напруги ZUBR D6-63 red (білий корпус)',
            series: 'ZUBR D6 (White display)',
            priceUah: 1790,
            description: 'Реле напруги з білою індикацією',
          };
        }
        if (normSeries.includes('eu102') || normSeries.includes('hager')) {
          return {
            article: 'EU102',
            modelName: 'Реле контролю напруги Hager EU102',
            series: 'EU102',
            priceUah: 2800,
            description: 'Оригінальне модульне реле Hager',
          };
        }
        if (module.poles === 3 || normSeries.includes('3f')) {
          return {
            article: 'ZUBR-3F',
            modelName: 'Реле напруги ZUBR 3F (3-фазне)',
            series: 'ZUBR 3F (3-фазне)',
            priceUah: 2200,
            description: 'Захист від перекосу та злипання фаз',
          };
        }
        return {
          article: 'ZUBR-D2-63',
          modelName: 'Реле напруги ZUBR D2-63 red (TrueRMS)',
          series: 'ZUBR D2 (TrueRMS)',
          priceUah: 1680,
          description: 'Надійне реле напруги з термозахистом та TrueRMS',
        };
      }

      if (module.category === 'switch') {
        if (normSeries.includes('sfb')) {
          return {
            article: module.width === 1 ? 'SFB125' : 'SFB225',
            modelName: `Перемикач Hager SFB ${module.width}P 25A I-0-II`,
            series: 'SFB',
            priceUah: module.width === 1 ? 580 : 980,
            description: 'Перемикач Hager серії SFB',
          };
        }
        const articles: Record<number, string> = { 1: 'SFT125', 2: 'SFT240', 3: 'SFT340', 4: 'SFT440' };
        const prices: Record<number, number> = { 1: 620, 2: 1150, 3: 1650, 4: 1950 };
        const w = module.width in articles ? module.width : 1;
        return {
          article: articles[w],
          modelName: `Перемикач Hager SFT ${w}P ${w === 1 ? '25A' : '40A'} I-0-II`,
          series: 'SFT (I-0-II)',
          priceUah: prices[w],
          description: 'Перемикач введення мережа/генератор Hager SFT',
        };
      }

      if (module.category === 'contactor') {
        if (normSeries.includes('esl')) {
          return {
            article: 'ESL225',
            modelName: 'Контактор Hager ESL 25A 2NO з ручним керуванням',
            series: 'ESL (Ручне кер.)',
            priceUah: 1380,
            description: 'Контактор Hager з важелем Auto/0/1',
          };
        }
        return {
          article: 'ESC225',
          modelName: 'Контактор безшумний Hager ESC 25A 2NO 230V',
          series: 'ESC (Безшумні)',
          priceUah: 1120,
          description: 'Безшумний модульний контактор Hager',
        };
      }

      if (module.category === 'cross_module') {
        return {
          article: 'KJ02C',
          modelName: 'Крос-модуль Hager 2P 100A',
          series: 'Modular',
          priceUah: 620,
          description: 'Розподільчий блок 2-полюсний на DIN-рейку',
        };
      }

      if (module.category === 'meter') {
        return {
          article: 'SM103',
          modelName: 'Цифровий вольтметр Hager 1-фазний',
          series: 'SM (Digital)',
          priceUah: 1350,
          description: 'Модульний індикатор напруги',
        };
      }

      if (module.category === 'socket') {
        return {
          article: 'SNS016',
          modelName: 'Розетка модульна Hager 16A 230V Schuko',
          series: 'Schuko DIN',
          priceUah: 460,
          description: 'Розетка на DIN-рейку 2.5 мод',
        };
      }

      return {
        article: 'VZ016',
        modelName: 'Заглушка Hager 1 модуль біла',
        series: 'Стандартна заглушка',
        priceUah: 45,
        description: 'Пластикова заглушка пластрона',
      };
    }

    // =======================================================================
    // 2. SCHNEIDER ELECTRIC
    // =======================================================================
    case 'schneider': {
      if (module.category === 'breaker') {
        const isActi9k = normSeries.includes('ik60n');
        const isActi9c = normSeries.includes('ic60n');
        const isEasy9 = normSeries.includes('easy9');

        if (isActi9k) {
          const price = override?.priceUah ?? (module.poles === 1 ? 290 : module.poles === 2 ? 620 : module.poles === 3 ? 980 : 1350);
          const artPrefix = curve === 'B' ? 'A9K23' : 'A9K24';
          return {
            article: `${artPrefix}${module.poles}${amps.padStart(2, '0')}`,
            modelName: `Автоматичний вимикач Schneider Acti9 iK60N ${module.poles}P ${ratingClean} 6kA`,
            series: 'Acti9 iK60N (6kA)',
            priceUah: price,
            description: `Комерційний автомат Schneider Acti9 ${ratingClean}`,
          };
        }
        if (isActi9c) {
          const price = override?.priceUah ?? (module.poles === 1 ? 450 : module.poles === 2 ? 950 : module.poles === 3 ? 1490 : 1980);
          const artPrefix = curve === 'B' ? 'A9F73' : curve === 'D' ? 'A9F75' : 'A9F74';
          return {
            article: `${artPrefix}${module.poles}${amps.padStart(2, '0')}`,
            modelName: `Автоматичний вимикач Schneider Acti9 iC60N ${module.poles}P ${ratingClean} 10kA`,
            series: 'Acti9 iC60N (10kA)',
            priceUah: price,
            description: `Флагманський автомат Schneider Acti9 10kA ${ratingClean}`,
          };
        }
        if (isEasy9) {
          const price = override?.priceUah ?? (module.poles === 1 ? 130 : module.poles === 2 ? 290 : module.poles === 3 ? 470 : 680);
          const artPrefix = curve === 'B' ? 'EZ9F33' : 'EZ9F34';
          return {
            article: `${artPrefix}${module.poles}${amps.padStart(2, '0')}`,
            modelName: `Автоматичний вимикач Schneider Easy9 ${module.poles}P ${ratingClean} 4.5kA`,
            series: 'Easy9 (4.5kA)',
            priceUah: price,
            description: `Бюджетний автомат Schneider Easy9 ${ratingClean}`,
          };
        }

        // Default: Resi9
        const price = override?.priceUah ?? (module.poles === 1 ? 195 : module.poles === 2 ? 440 : module.poles === 3 ? 720 : 1050);
        const artPrefix = curve === 'B' ? 'R9F14' : 'R9F12';
        return {
          article: `${artPrefix}${module.poles}${amps.padStart(2, '0')}`,
          modelName: `Автоматичний вимикач Schneider Resi9 ${module.poles}P ${ratingClean} 6kA`,
          series: 'Resi9 (6kA)',
          priceUah: price,
          description: `Побутовий автомат Schneider Resi9 ${ratingClean}`,
        };
      }

      if (module.category === 'rcd') {
        const isActi9 = normSeries.includes('acti9') || normSeries.includes('iid');
        const isEasy9 = normSeries.includes('easy9');
        const isAc = normSeries.includes('ac');

        if (isActi9) {
          const price = isAc ? (module.poles === 2 ? 1790 : 2450) : (module.poles === 2 ? 2350 : 3200);
          return {
            article: isAc ? `A9Z11${module.poles}40` : `A9Z21${module.poles}40`,
            modelName: `ПЗВ Schneider Acti9 iID ${module.poles}P 40A 30mA ${isAc ? 'тип AC' : 'тип A'}`,
            series: isAc ? 'Acti9 iID (Тип AC)' : 'Acti9 iID (Тип A)',
            priceUah: price,
            description: `Преміум ПЗВ Schneider Acti9 ${isAc ? 'тип AC' : 'тип A'}`,
          };
        }
        if (isEasy9) {
          return {
            article: `EZ9R34${module.poles}40`,
            modelName: `ПЗВ Schneider Easy9 ${module.poles}P 40A 30mA тип AC`,
            series: 'Easy9 (Тип AC)',
            priceUah: module.poles === 2 ? 950 : 1450,
            description: 'ПЗВ Schneider Easy9 тип AC',
          };
        }
        // Resi9
        const price = isAc ? (module.poles === 2 ? 1200 : 1750) : (module.poles === 2 ? 1550 : 2180);
        return {
          article: isAc ? (module.poles === 2 ? 'R9R01240' : 'R9R01440') : (module.poles === 2 ? 'R9R02240' : 'R9R02440'),
          modelName: `ПЗВ Schneider Resi9 ${module.poles}P 40A 30mA ${isAc ? 'тип AC' : 'тип A'}`,
          series: isAc ? 'Resi9 (Тип AC)' : 'Resi9 (Тип A)',
          priceUah: price,
          description: `ПЗВ Schneider Resi9 ${isAc ? 'тип AC' : 'тип A'}`,
        };
      }

      if (module.category === 'rcbo') {
        if (normSeries.includes('acti9') || normSeries.includes('idpn')) {
          return {
            article: 'A9D31616',
            modelName: `Дифавтомат Schneider Acti9 iDPN N Vigi 1P+N ${ratingClean} 30mA 6kA`,
            series: 'Acti9 iDPN N Vigi',
            priceUah: 2450,
            description: 'Преміум дифавтомат Schneider Acti9',
          };
        }
        if (normSeries.includes('easy9')) {
          return {
            article: 'EZ9D34616',
            modelName: `Дифавтомат Schneider Easy9 1P+N ${ratingClean} 30mA AC`,
            series: 'Easy9 (Тип AC)',
            priceUah: 1050,
            description: 'Бюджетний дифавтомат Easy9',
          };
        }
        return {
          article: 'R9D01216',
          modelName: `Дифавтомат Schneider Resi9 1P+N ${ratingClean} 30mA тип A`,
          series: 'Resi9 (Тип A)',
          priceUah: 1620,
          description: 'Диференційний автомат Schneider Resi9',
        };
      }

      if (module.category === 'switch') {
        if (normSeries.includes('ins') || module.width === 3) {
          return {
            article: 'INS40-3P',
            modelName: 'Рубильник реверсивний Schneider INS40 3P 40A',
            series: 'Compact INS',
            priceUah: 1550,
            description: 'Реверсивний рубильник Schneider INS',
          };
        }
        if (normSeries.includes('icm') || module.width === 4) {
          return {
            article: '16104',
            modelName: 'Перемикач Schneider Acti9 iCM 4P 40A I-0-II',
            series: 'Acti9 iCM',
            priceUah: 1890,
            description: '4-модульний перемикач мережа/генератор Acti9',
          };
        }
        return {
          article: module.width === 1 ? 'A9S65120' : 'A9S65220',
          modelName: `Перемикач Schneider Acti9 iSSW ${module.width}P 20A I-0-II`,
          series: 'Acti9 iSSW',
          priceUah: module.width === 1 ? 580 : 1050,
          description: 'Модульний перемикач Schneider Acti9 iSSW',
        };
      }

      if (module.category === 'contactor') {
        if (normSeries.includes('easy9')) {
          return {
            article: 'EZ9C0225',
            modelName: 'Контактор Schneider Easy9 25A 2NO',
            series: 'Easy9',
            priceUah: 890,
            description: 'Контактор Easy9 25A',
          };
        }
        return {
          article: 'A9C22712',
          modelName: 'Контактор Schneider Acti9 iCT 25A 2NO 230V',
          series: 'Acti9 iCT',
          priceUah: 1250,
          description: 'Безшумний контактор Schneider Acti9',
        };
      }

      if (module.category === 'cross_module') {
        return {
          article: 'LGY210007',
          modelName: 'Крос-модуль Schneider Linergy 2P 100A',
          series: 'Linergy',
          priceUah: 590,
          description: 'Розподільчий блок Schneider Electric',
        };
      }

      if (module.category === 'voltage_relay') {
        return {
          article: 'ZUBR-D2-63',
          modelName: 'Реле напруги ZUBR D2-63 red (сумісне зі Schneider)',
          series: 'ZUBR D2 (TrueRMS)',
          priceUah: 1680,
          description: 'Реле напруги 63A TrueRMS',
        };
      }

      if (module.category === 'socket') {
        return {
          article: 'A9A15310',
          modelName: 'Розетка Schneider Acti9 iPC 16A Schuko',
          series: 'Schuko DIN',
          priceUah: 490,
          description: 'Розетка на DIN-рейку Schneider',
        };
      }

      return {
        article: 'M9A26996',
        modelName: 'Заглушка Schneider Electric 1 мод',
        series: 'Стандартна заглушка',
        priceUah: 40,
        description: 'Заглушка на пластрон Schneider',
      };
    }

    // =======================================================================
    // 3. ABB
    // =======================================================================
    case 'abb': {
      if (module.category === 'breaker') {
        const isS200 = normSeries.includes('s200') || normSeries.includes('pro m');
        const isBasic = normSeries.includes('basic');

        if (isS200) {
          const price = override?.priceUah ?? (module.poles === 1 ? 340 : module.poles === 2 ? 760 : module.poles === 3 ? 1190 : 1680);
          const curveCode = curve === 'B' ? '5' : curve === 'D' ? '6' : '4';
          return {
            article: `2CDS25${module.poles}001R0${amps.padStart(2, '0')}${curveCode}`,
            modelName: `Автоматичний вимикач ABB S20${module.poles}-${curve}${amps} 6kA System Pro M`,
            series: 'System Pro M S200 (6kA)',
            priceUah: price,
            description: `Преміум автомат ABB System Pro M S200 ${ratingClean}`,
          };
        }
        if (isBasic) {
          const price = override?.priceUah ?? (module.poles === 1 ? 140 : module.poles === 2 ? 310 : module.poles === 3 ? 490 : 720);
          return {
            article: `BMS41${module.poles}-${curve}${amps}`,
            modelName: `Автоматичний вимикач ABB Basic M ${module.poles}P ${ratingClean} 4.5kA`,
            series: 'Basic M (4.5kA)',
            priceUah: price,
            description: `Бюджетний автомат ABB Basic M ${ratingClean}`,
          };
        }

        // Default: Compact Home SH200
        const price = override?.priceUah ?? (module.poles === 1 ? 210 : module.poles === 2 ? 480 : module.poles === 3 ? 760 : 1120);
        const curveCode = curve === 'B' ? '5' : '4';
        return {
          article: `2CDS21${module.poles}001R0${amps.padStart(2, '0')}${curveCode}`,
          modelName: `Автоматичний вимикач ABB SH20${module.poles}-${curve}${amps} 6kA Compact Home`,
          series: 'Compact Home SH200 (6kA)',
          priceUah: price,
          description: `Автомат ABB SH200 ${ratingClean}`,
        };
      }

      if (module.category === 'rcd') {
        if (normSeries.includes('f200') || normSeries.includes('pro m')) {
          return {
            article: module.poles === 2 ? '2CSF202101R1400' : '2CSF204101R1400',
            modelName: `ПЗВ ABB F20${module.poles} A-40/0.03 тип A System Pro M`,
            series: 'F200 (Тип A)',
            priceUah: module.poles === 2 ? 2450 : 3400,
            description: 'Преміум ПЗВ ABB F200 тип A',
          };
        }
        if (normSeries.includes('тип a')) {
          return {
            article: `2CSF20${module.poles}101R1401`,
            modelName: `ПЗВ ABB FH20${module.poles} A-40/0.03 (40A 30mA тип A)`,
            series: 'FH200 (Тип A)',
            priceUah: module.poles === 2 ? 1950 : 2850,
            description: 'ПЗВ ABB FH200 тип A',
          };
        }
        return {
          article: `2CSF20${module.poles}101R1400`,
          modelName: `ПЗВ ABB FH20${module.poles} AC-40/0.03 (40A 30mA тип AC)`,
          series: 'FH200 (Тип AC)',
          priceUah: module.poles === 2 ? 1590 : 2200,
          description: 'ПЗВ ABB FH200 тип AC',
        };
      }

      if (module.category === 'rcbo') {
        if (normSeries.includes('ds201m') || normSeries.includes('10ka')) {
          return {
            article: '2CSR275080R1164',
            modelName: `Дифавтомат ABB DS201M C16 A 30mA 10kA`,
            series: 'DS201M (10kA)',
            priceUah: 2800,
            description: 'Дифавтомат ABB високої стійкості 10kA',
          };
        }
        return {
          article: '2CSR255080R1164',
          modelName: `Дифавтомат ABB DS201 C16 A 30mA Compact Home`,
          series: 'DS201 (Тип A)',
          priceUah: 1850,
          description: 'Компактний надійний дифавтомат ABB',
        };
      }

      if (module.category === 'switch') {
        if (normSeries.includes('ot') || module.width >= 3) {
          const is3P = module.width === 3;
          return {
            article: is3P ? 'OT40F3C' : 'OT40F4C',
            modelName: `Реверсивний рубильник ABB OT40F${is3P ? '3' : '4'}C ${is3P ? '3' : '4'}P 40A`,
            series: 'OT (Реверсивні)',
            priceUah: is3P ? 1820 : 2350,
            description: `Рубильник введення ABB OT40 ${is3P ? '3' : '4'}P`,
          };
        }
        return {
          article: 'E214-16-101',
          modelName: `Перемикач ABB E214 ${module.width}P 16A I-0-II`,
          series: 'System Pro M E214',
          priceUah: module.width === 1 ? 640 : 1180,
          description: 'Модульний перемикач ABB серії E214',
        };
      }

      if (module.category === 'contactor') {
        return {
          article: 'EN25-20N-06',
          modelName: 'Контактор безшумний ABB EN25 25A 2NO 230V',
          series: 'EN (Безшумні)',
          priceUah: 1290,
          description: 'Безшумний модульний контактор ABB',
        };
      }

      if (module.category === 'voltage_relay') {
        return {
          article: 'ZUBR-D2-63',
          modelName: 'Реле напруги ZUBR D2-63 red (сумісне з ABB)',
          series: 'ZUBR D2 (TrueRMS)',
          priceUah: 1680,
          description: 'Реле напруги ZUBR D2',
        };
      }

      return {
        article: 'SZ-FZS',
        modelName: 'Заглушка ABB System Pro M на DIN-рейку',
        series: 'Стандартна заглушка',
        priceUah: 50,
        description: 'Заглушка ABB',
      };
    }

    // =======================================================================
    // 4. EATON (MOELLER)
    // =======================================================================
    case 'eaton': {
      if (module.category === 'breaker') {
        const isHnx = normSeries.includes('hnx') || normSeries.includes('home');
        const isPl7 = normSeries.includes('pl7');

        if (isHnx) {
          const price = module.poles === 1 ? 145 : module.poles === 2 ? 340 : module.poles === 3 ? 540 : 790;
          return {
            article: `HNX-${curve}${amps}/${module.poles}`,
            modelName: `Автоматичний вимикач Eaton xPole Home HNX-${curve}${amps}/${module.poles} 4.5kA`,
            series: 'xPole Home HNX (4.5kA)',
            priceUah: price,
            description: `Побутовий автомат Eaton xPole Home ${ratingClean}`,
          };
        }
        if (isPl7) {
          const price = module.poles === 1 ? 290 : module.poles === 2 ? 660 : module.poles === 3 ? 1050 : 1490;
          return {
            article: `PL7-${curve}${amps}/${module.poles}`,
            modelName: `Автоматичний вимикач Eaton PL7-${curve}${amps}/${module.poles} 10kA`,
            series: 'xPole PL7 (10kA)',
            priceUah: price,
            description: `Промисловий автомат Eaton PL7 10kA ${ratingClean}`,
          };
        }

        // Default: PL6
        const price = module.poles === 1 ? 180 : module.poles === 2 ? 420 : module.poles === 3 ? 670 : 980;
        return {
          article: `PL6-${curve}${amps}/${module.poles}`,
          modelName: `Автоматичний вимикач Eaton PL6-${curve}${amps}/${module.poles} 6kA`,
          series: 'xPole PL6 (6kA)',
          priceUah: price,
          description: `Автомат Eaton PL6 ${ratingClean}`,
        };
      }

      if (module.category === 'rcd') {
        if (normSeries.includes('drcm')) {
          return {
            article: `dRCM-40/${module.poles}/003-A`,
            modelName: `ПЗВ Eaton dRCM 40A ${module.poles}P 30mA тип A`,
            series: 'xPole dRCM (Тип A)',
            priceUah: module.poles === 2 ? 2100 : 3100,
            description: 'Промислове ПЗВ Eaton dRCM тип A',
          };
        }
        const isAc = normSeries.includes('ac');
        return {
          article: `HNC-40/${module.poles}/003${isAc ? '' : '-A'}`,
          modelName: `ПЗВ Eaton HNC 40A ${module.poles}P 30mA ${isAc ? 'тип AC' : 'тип A'}`,
          series: isAc ? 'xPole HNC (Тип AC)' : 'xPole HNC (Тип A)',
          priceUah: isAc ? (module.poles === 2 ? 1180 : 1750) : (module.poles === 2 ? 1490 : 2150),
          description: `ПЗВ Eaton HNC ${isAc ? 'тип AC' : 'тип A'}`,
        };
      }

      if (module.category === 'rcbo') {
        if (normSeries.includes('pknm')) {
          return {
            article: `PKNM-${amps}/1N/${curve}/003-A`,
            modelName: `Дифавтомат Eaton PKNM 1P+N ${ratingClean} 30mA тип A`,
            series: 'xPole PKNM',
            priceUah: 2150,
            description: 'Професійний дифавтомат Eaton PKNM',
          };
        }
        const isAc = normSeries.includes('ac');
        return {
          article: `HNB-${curve}${amps}/1N/003${isAc ? '' : '-A'}`,
          modelName: `Дифавтомат Eaton HNB 1P+N ${ratingClean} 30mA ${isAc ? 'AC' : 'A'}`,
          series: isAc ? 'xPole HNB (Тип AC)' : 'xPole HNB (Тип A)',
          priceUah: isAc ? 1250 : 1580,
          description: 'Дифавтомат Eaton HNB',
        };
      }

      if (module.category === 'switch') {
        if (normSeries.includes('t0') || module.width >= 3) {
          const is3P = module.width === 3;
          return {
            article: is3P ? 'T0-3-8212' : 'T0-4-8213',
            modelName: `Перемикач Eaton Moeller T0 ${is3P ? '3P 20A' : '4P 32A'} I-0-II`,
            series: 'T0 (Кулачкові)',
            priceUah: is3P ? 1350 : 1780,
            description: 'Кулачковий перемикач Eaton',
          };
        }
        return {
          article: 'Z-S/WM',
          modelName: 'Перемикач Eaton xPole 1P 16A I-0-II (1 мод)',
          series: 'xPole Z-S',
          priceUah: 540,
          description: '1-модульний перемикач Eaton',
        };
      }

      if (module.category === 'contactor') {
        return {
          article: 'Z-SCH230/25-20',
          modelName: 'Контактор Eaton Z-SCH 25A 2NO 230V',
          series: 'Z-SCH',
          priceUah: 1190,
          description: 'Модульний контактор Eaton',
        };
      }

      return {
        article: 'ZUBR-D2-63',
        modelName: 'Реле напруги ZUBR D2-63',
        series: 'ZUBR D2 (TrueRMS)',
        priceUah: 1680,
        description: 'Реле напруги',
      };
    }

    // =======================================================================
    // 5. ETI
    // =======================================================================
    case 'eti': {
      if (module.category === 'breaker') {
        const isEtimat10 = normSeries.includes('10');
        const isEtimat1N = normSeries.includes('1n');

        if (isEtimat10) {
          const price = module.poles === 1 ? 230 : module.poles === 2 ? 520 : module.poles === 3 ? 820 : 1180;
          return {
            article: `00213151${amps.padStart(2, '0')}`,
            modelName: `Автоматичний вимикач ETI Etimat 10 ${module.poles}P ${ratingClean} 10kA`,
            series: 'Etimat 10 (10kA)',
            priceUah: price,
            description: `Автомат ETI Словенія 10kA ${ratingClean}`,
          };
        }
        if (isEtimat1N) {
          return {
            article: `00219110${amps.padStart(2, '0')}`,
            modelName: `Автоматичний вимикач ETI Etimat 1N 1P+N ${ratingClean} (1 мод)`,
            series: 'Etimat 1N (1P+N)',
            priceUah: 240,
            description: `Компактний автомат ETI 1P+N в 1 модулі`,
          };
        }

        // Default: Etimat 6
        const price = module.poles === 1 ? 140 : module.poles === 2 ? 320 : module.poles === 3 ? 510 : 750;
        return {
          article: `00214151${amps.padStart(2, '0')}`,
          modelName: `Автоматичний вимикач ETI Etimat 6 ${module.poles}P ${ratingClean} 6kA`,
          series: 'Etimat 6 (6kA)',
          priceUah: price,
          description: `Автомат ETI Словенія 6kA ${ratingClean}`,
        };
      }

      if (module.category === 'rcd') {
        const isAc = normSeries.includes('ac');
        const price = isAc ? (module.poles === 2 ? 990 : 1420) : (module.poles === 2 ? 1250 : 1750);
        return {
          article: `0020614${module.poles === 2 ? '13' : '23'}`,
          modelName: `ПЗВ ETI EFI-${module.poles} 40A 30mA ${isAc ? 'тип AC' : 'тип A'}`,
          series: isAc ? `EFI-${module.poles} (Тип AC)` : `EFI-${module.poles} (Тип A)`,
          priceUah: price,
          description: `ПЗВ ETI Словенія ${isAc ? 'тип AC' : 'тип A'}`,
        };
      }

      if (module.category === 'rcbo') {
        if (normSeries.includes('1m') || normSeries.includes('1 мод')) {
          return {
            article: '002172403',
            modelName: `Дифавтомат ETI KZS-1M 1P+N ${ratingClean} 30mA (1 мод)`,
            series: 'KZS-1M (1 мод)',
            priceUah: 1550,
            description: 'Компактний 1-модульний дифавтомат ETI',
          };
        }
        return {
          article: '002173114',
          modelName: `Дифавтомат ETI KZS-2M 1P+N ${ratingClean} 30mA (2 мод)`,
          series: 'KZS-2M (2 мод)',
          priceUah: 1290,
          description: 'Дифавтомат ETI KZS-2M 2 модулі',
        };
      }

      if (module.category === 'switch') {
        const articles: Record<number, string> = { 1: 'SSQ-125', 2: 'SSQ-225', 3: 'SSQ-340', 4: 'SSQ-440' };
        const prices: Record<number, number> = { 1: 420, 2: 780, 3: 1200, 4: 1450 };
        const w = module.width in articles ? module.width : 1;
        return {
          article: articles[w],
          modelName: `Перемикач ETI SSQ ${w}P ${w === 1 ? '25A' : '40A'} I-0-II`,
          series: 'SSQ',
          priceUah: prices[w],
          description: 'Перемикач мережа/генератор ETI SSQ',
        };
      }

      return {
        article: 'ZUBR-D2-63',
        modelName: 'Реле напруги ZUBR D2-63',
        series: 'ZUBR D2 (TrueRMS)',
        priceUah: 1680,
        description: 'Реле напруги',
      };
    }

    // =======================================================================
    // 6. IEK
    // =======================================================================
    case 'iek':
    default: {
      if (module.category === 'breaker') {
        const isArmat = normSeries.includes('armat');
        const isGenerica = normSeries.includes('generica');

        if (isArmat) {
          const price = module.poles === 1 ? 175 : module.poles === 2 ? 390 : module.poles === 3 ? 620 : 890;
          return {
            article: `AR-BA04-1-${amps.padStart(2, '0')}`,
            modelName: `Автоматичний вимикач IEK Armat BA04-29 ${module.poles}P ${ratingClean} 6kA/10kA`,
            series: 'Armat BA04-29 (6kA)',
            priceUah: price,
            description: `Преміум автомат IEK серії Armat ${ratingClean}`,
          };
        }
        if (isGenerica) {
          const price = module.poles === 1 ? 75 : module.poles === 2 ? 165 : module.poles === 3 ? 260 : 380;
          return {
            article: `GEN-BA47-1-${amps.padStart(2, '0')}`,
            modelName: `Автоматичний вимикач IEK Generica ${module.poles}P ${ratingClean} 4.5kA`,
            series: 'Generica (4.5kA)',
            priceUah: price,
            description: `Економ автомат Generica ${ratingClean}`,
          };
        }

        // Default: Karat BA47-29
        const price = override?.priceUah ?? (module.poles === 1 ? 95 : module.poles === 2 ? 210 : module.poles === 3 ? 330 : 490);
        return {
          article: `MVA20-${module.poles}-${amps.padStart(2, '0')}-${curve}`,
          modelName: `Автоматичний вимикач IEK Karat BA47-29 ${module.poles}P ${ratingClean} 4.5kA`,
          series: 'Karat BA47-29 (4.5kA)',
          priceUah: price,
          description: `Бюджетний автомат IEK Karat ${ratingClean}`,
        };
      }

      if (module.category === 'rcd') {
        if (normSeries.includes('armat')) {
          return {
            article: `AR-VD03-${module.poles}-40`,
            modelName: `ПЗВ IEK Armat ВД-03 ${module.poles}P 40A 30mA тип A`,
            series: 'Armat ВД-03 (Тип A)',
            priceUah: module.poles === 2 ? 1150 : 1680,
            description: 'ПЗВ IEK Armat тип A',
          };
        }
        return {
          article: `MDV10-${module.poles}-040-030`,
          modelName: `ПЗВ IEK ВД1-63 ${module.poles}P 40A 30mA тип AC`,
          series: 'ВД1-63 Karat (Тип AC)',
          priceUah: module.poles === 2 ? 720 : 1090,
          description: 'ПЗВ IEK ВД1-63',
        };
      }

      if (module.category === 'rcbo') {
        if (normSeries.includes('armat')) {
          return {
            article: 'AR-AVDT03-16-C',
            modelName: `Дифавтомат IEK Armat АВДТ-03 2P ${ratingClean} 30mA тип A`,
            series: 'Armat АВДТ-03',
            priceUah: 1250,
            description: 'Дифавтомат IEK Armat тип A',
          };
        }
        if (normSeries.includes('авдт32')) {
          return {
            article: 'MAD22-2-016-C-030',
            modelName: `Дифавтомат IEK АВДТ32 2P ${ratingClean} 30mA`,
            series: 'АВДТ32 Karat',
            priceUah: 760,
            description: 'Електронний дифавтомат IEK АВДТ32',
          };
        }
        return {
          article: 'MAD12-2-016-C-030',
          modelName: `Дифавтомат IEK АД12 2P ${ratingClean} 30mA`,
          series: 'АД12 Karat',
          priceUah: 680,
          description: 'Диференційний автомат IEK АД12',
        };
      }

      if (module.category === 'switch') {
        const articles: Record<number, string> = { 1: 'MNV10-1-025', 2: 'MNV10-2-040', 3: 'MNV10-3-040', 4: 'MNV10-4-040' };
        const prices: Record<number, number> = { 1: 240, 2: 420, 3: 590, 4: 790 };
        const w = module.width in articles ? module.width : 1;
        return {
          article: articles[w],
          modelName: `Вимикач IEK ВРТ-63 ${w}P ${w === 1 ? '25A' : '40A'} 1-0-2`,
          series: 'ВРТ-63',
          priceUah: prices[w],
          description: 'Модульний перемикач IEK ВРТ-63',
        };
      }

      return {
        article: 'ZUBR-D2-63',
        modelName: 'Реле напруги ZUBR D2-63',
        series: 'ZUBR D2 (TrueRMS)',
        priceUah: 1680,
        description: 'Реле напруги ZUBR',
      };
    }
  }
}
