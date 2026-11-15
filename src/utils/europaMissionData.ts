export type ProbeCategoryId =
  | 'body'
  | 'legs'
  | 'sensor'
  | 'battery'
  | 'heater'
  | 'antenna';

export interface ProbeComponentOption {
  id: string;
  category: ProbeCategoryId;
  name: string;
  shortName: string;
  weightKg: number;
  costSc: number;
  metricLabel: string;
  metricValue: number; // 0..100
  summary: string;
}

export interface SelectedProbeBuild {
  body: string;
  legs: string;
  sensor: string;
  battery: string;
  heater: string;
  antenna: string;
}

export interface ProbePerformanceMetrics {
  totalWeightKg: number;
  totalCostSc: number;
  remainingBudgetSc: number;
  batteryCapacityPct: number;
  heatingCapabilityPct: number;
  sensorAccuracyPct: number;
  commsStrengthPct: number;
  stabilityPct: number;
  thermalShieldPct: number;
  isOverWeight: boolean;
  isOverBudget: boolean;
  isBatteryWeak: boolean;
  isHeatingWeak: boolean;
  isSensorInaccurate: boolean;
  isAntennaWeak: boolean;
  isStabilityWeak: boolean;
  canLaunch: boolean;
  blockingReasons: string[];
}

export const EUROPA_MAX_BUDGET_SC = 850;
export const EUROPA_MAX_WEIGHT_KG = 120;
export const EUROPA_MISSION_DURATION_SEC = 12 * 60; // 12 minutes

export const PROBE_CATEGORY_META: Array<{
  id: ProbeCategoryId;
  label: string;
  metricTitle: string;
}> = [
  { id: 'body', label: 'Probe Body', metricTitle: 'Cryo Shielding' },
  { id: 'legs', label: 'Landing Legs', metricTitle: 'Ice Stability' },
  { id: 'sensor', label: 'Temperature Sensor', metricTitle: 'Accuracy' },
  { id: 'battery', label: 'Battery', metricTitle: 'Capacity' },
  { id: 'heater', label: 'Heater', metricTitle: 'Heat Output' },
  { id: 'antenna', label: 'Comm Antenna', metricTitle: 'Signal Link' },
];

/**
 * Options are intentionally ordered neutrally — NEVER highlight or mark the optimal part.
 * Balanced cryo builds fit within 120 kg and 850 SC while weak/heavy choices reveal live issues.
 */
export const PROBE_COMPONENTS: Record<ProbeCategoryId, ProbeComponentOption[]> = {
  body: [
    {
      id: 'body_alu',
      category: 'body',
      name: 'Standard Aluminum Shell',
      shortName: 'Alu Shell',
      weightKg: 36,
      costSc: 95,
      metricLabel: 'Cryo Shielding',
      metricValue: 45,
      summary: 'Thin metallic hull; loses heat quickly in deep freeze.',
    },
    {
      id: 'body_ti',
      category: 'body',
      name: 'Aerogel Composite Hull',
      shortName: 'Aerogel Hull',
      weightKg: 44,
      costSc: 155,
      metricLabel: 'Cryo Shielding',
      metricValue: 88,
      summary: 'Multi-layer silica aerogel frame built for -170°C ice.',
    },
    {
      id: 'body_steel',
      category: 'body',
      name: 'Reinforced Steel Casing',
      shortName: 'Steel Casing',
      weightKg: 66,
      costSc: 130,
      metricLabel: 'Cryo Shielding',
      metricValue: 78,
      summary: 'Rugged armored housing with heavy launch mass.',
    },
  ],
  legs: [
    {
      id: 'legs_skid',
      category: 'legs',
      name: 'Rigid Cryo Skids',
      shortName: 'Cryo Skids',
      weightKg: 24,
      costSc: 100,
      metricLabel: 'Ice Stability',
      metricValue: 64,
      summary: 'Fixed metallic runners; moderate grip on tilted ice.',
    },
    {
      id: 'legs_tri',
      category: 'legs',
      name: 'Ice-Grip Tripod Struts',
      shortName: 'Grip Tripod',
      weightKg: 14,
      costSc: 120,
      metricLabel: 'Ice Stability',
      metricValue: 92,
      summary: 'Three-point articulated spikes with crush dampers.',
    },
    {
      id: 'legs_quad',
      category: 'legs',
      name: 'Heavy Shock Quad-Pods',
      shortName: 'Shock Quad',
      weightKg: 30,
      costSc: 150,
      metricLabel: 'Ice Stability',
      metricValue: 96,
      summary: 'Four heavy hydraulic dampers with high mass penalty.',
    },
  ],
  sensor: [
    {
      id: 'sensor_thermo',
      category: 'sensor',
      name: 'Basic Thermocouple',
      shortName: 'Thermocouple',
      weightKg: 5,
      costSc: 65,
      metricLabel: 'Accuracy',
      metricValue: 46,
      summary: 'Drifts unpredictably below -120°C cryogenic cold.',
    },
    {
      id: 'sensor_rtd',
      category: 'sensor',
      name: 'Cryo-RTD Precision Probe',
      shortName: 'Cryo-RTD',
      weightKg: 8,
      costSc: 140,
      metricLabel: 'Accuracy',
      metricValue: 96,
      summary: 'Platinum resistance thermometer steady down to -230°C.',
    },
    {
      id: 'sensor_ir',
      category: 'sensor',
      name: 'Dual-Band IR Bolometer',
      shortName: 'IR Bolometer',
      weightKg: 12,
      costSc: 170,
      metricLabel: 'Accuracy',
      metricValue: 88,
      summary: 'Optical infrared array; higher cost and mass.',
    },
  ],
  battery: [
    {
      id: 'bat_zinc',
      category: 'battery',
      name: 'Compact Zn-Air Cell',
      shortName: 'Zn-Air Cell',
      weightKg: 9,
      costSc: 60,
      metricLabel: 'Capacity',
      metricValue: 42,
      summary: 'Drains rapidly under heater and deep-space radio load.',
    },
    {
      id: 'bat_li',
      category: 'battery',
      name: 'Cold-Rated Li-SOCl₂ Pack',
      shortName: 'Li-SOCl₂',
      weightKg: 15,
      costSc: 130,
      metricLabel: 'Capacity',
      metricValue: 88,
      summary: 'Low-temperature chemistry engineered for Jovian cold.',
    },
    {
      id: 'bat_heavy',
      category: 'battery',
      name: 'Dual Reserve Cell Bank',
      shortName: 'Dual Bank',
      weightKg: 25,
      costSc: 190,
      metricLabel: 'Capacity',
      metricValue: 99,
      summary: 'Massive power reserve at heavy mass and credit cost.',
    },
  ],
  heater: [
    {
      id: 'heat_strip',
      category: 'heater',
      name: 'Foil Strip Warmers',
      shortName: 'Foil Strip',
      weightKg: 6,
      costSc: 55,
      metricLabel: 'Heat Output',
      metricValue: 38,
      summary: 'Minimal thermal output; struggles in Europa shadow.',
    },
    {
      id: 'heat_rhupulse',
      category: 'heater',
      name: 'Regulated Cryo-Pulse Heater',
      shortName: 'Cryo-Pulse',
      weightKg: 11,
      costSc: 115,
      metricLabel: 'Heat Output',
      metricValue: 90,
      summary: 'Thermostat-controlled thermal loop for electronics bay.',
    },
    {
      id: 'heat_coil',
      category: 'heater',
      name: 'Heavy Thermal Core',
      shortName: 'Thermal Core',
      weightKg: 21,
      costSc: 160,
      metricLabel: 'Heat Output',
      metricValue: 98,
      summary: 'Maximum thermal output with high mass and power draw.',
    },
  ],
  antenna: [
    {
      id: 'ant_whip',
      category: 'antenna',
      name: 'Low-Gain Whip Mast',
      shortName: 'Whip Mast',
      weightKg: 5,
      costSc: 60,
      metricLabel: 'Signal Link',
      metricValue: 40,
      summary: 'Weak omnidirectional link across 628M km to Earth.',
    },
    {
      id: 'ant_hga',
      category: 'antenna',
      name: 'X-Band High-Gain Dish',
      shortName: 'High-Gain Dish',
      weightKg: 14,
      costSc: 145,
      metricLabel: 'Signal Link',
      metricValue: 92,
      summary: 'Focused parabolic dish for reliable Earth telemetry.',
    },
    {
      id: 'ant_phased',
      category: 'antenna',
      name: 'Phased Array Transceiver',
      shortName: 'Phased Array',
      weightKg: 22,
      costSc: 195,
      metricLabel: 'Signal Link',
      metricValue: 98,
      summary: 'Ultra-high gain array with heavy mass and credit cost.',
    },
  ],
};

export const DEFAULT_PROBE_BUILD: SelectedProbeBuild = {
  body: 'body_alu',
  legs: 'legs_skid',
  sensor: 'sensor_thermo',
  battery: 'bat_zinc',
  heater: 'heat_strip',
  antenna: 'ant_whip',
};

export function findProbeOption(category: ProbeCategoryId, id: string): ProbeComponentOption {
  const list = PROBE_COMPONENTS[category];
  return list.find((item) => item.id === id) || list[0];
}

export function evaluateProbeBuild(build: SelectedProbeBuild): ProbePerformanceMetrics {
  const body = findProbeOption('body', build.body);
  const legs = findProbeOption('legs', build.legs);
  const sensor = findProbeOption('sensor', build.sensor);
  const battery = findProbeOption('battery', build.battery);
  const heater = findProbeOption('heater', build.heater);
  const antenna = findProbeOption('antenna', build.antenna);

  const totalWeightKg =
    body.weightKg +
    legs.weightKg +
    sensor.weightKg +
    battery.weightKg +
    heater.weightKg +
    antenna.weightKg;

  const totalCostSc =
    body.costSc +
    legs.costSc +
    sensor.costSc +
    battery.costSc +
    heater.costSc +
    antenna.costSc;

  const remainingBudgetSc = EUROPA_MAX_BUDGET_SC - totalCostSc;
  const thermalShieldPct = body.metricValue;
  const stabilityPct = legs.metricValue;
  const sensorAccuracyPct = sensor.metricValue;
  const batteryCapacityPct = battery.metricValue;
  // Heating capability combines body cryo insulation + active heater
  const heatingCapabilityPct = Math.round(heater.metricValue * 0.72 + thermalShieldPct * 0.28);
  const commsStrengthPct = antenna.metricValue;

  const isOverWeight = totalWeightKg > EUROPA_MAX_WEIGHT_KG;
  const isOverBudget = totalCostSc > EUROPA_MAX_BUDGET_SC;
  const isBatteryWeak = batteryCapacityPct < 60;
  const isHeatingWeak = heatingCapabilityPct < 65;
  const isSensorInaccurate = sensorAccuracyPct < 70;
  const isAntennaWeak = commsStrengthPct < 70;
  const isStabilityWeak = stabilityPct < 60;

  const blockingReasons: string[] = [];
  if (isOverWeight) {
    blockingReasons.push(`Overweight (${totalWeightKg} kg > ${EUROPA_MAX_WEIGHT_KG} kg max)`);
  }
  if (isOverBudget) {
    blockingReasons.push(`Over budget (${totalCostSc} SC > ${EUROPA_MAX_BUDGET_SC} SC max)`);
  }
  if (isBatteryWeak) {
    blockingReasons.push('Battery drains too fast for Europa surface ops');
  }
  if (isHeatingWeak) {
    blockingReasons.push('Cryogenic heating insufficient for -170°C survival');
  }

  return {
    totalWeightKg,
    totalCostSc,
    remainingBudgetSc,
    batteryCapacityPct,
    heatingCapabilityPct,
    sensorAccuracyPct,
    commsStrengthPct,
    stabilityPct,
    thermalShieldPct,
    isOverWeight,
    isOverBudget,
    isBatteryWeak,
    isHeatingWeak,
    isSensorInaccurate,
    isAntennaWeak,
    isStabilityWeak,
    canLaunch: blockingReasons.length === 0,
    blockingReasons,
  };
}

export interface CalibrationExperiment {
  id: number;
  label: string;
  environmentTag: string;
  referenceTempC: number;
  rawSensorTempC: number;
  correctOffsetC: number;
}

export const CALIBRATION_EXPERIMENTS: CalibrationExperiment[] = [
  {
    id: 1,
    label: 'Experiment 1',
    environmentTag: 'Equatorial Ice Chamber',
    referenceTempC: -140,
    rawSensorTempC: -152,
    correctOffsetC: 12,
  },
  {
    id: 2,
    label: 'Experiment 2',
    environmentTag: 'Mid-Latitude Ridge Cryostat',
    referenceTempC: -175,
    rawSensorTempC: -166,
    correctOffsetC: -9,
  },
  {
    id: 3,
    label: 'Experiment 3',
    environmentTag: 'Polar Shadow Deep Freeze',
    referenceTempC: -210,
    rawSensorTempC: -225,
    correctOffsetC: 15,
  },
];

export interface EuropaLocationSpec {
  id: 'landing_site' | 'ice_ridge' | 'shadow_region' | 'sunlit_region' | 'deep_ice';
  name: string;
  regionType: string;
  trueTempC: number;
  mapX: number; // percentage 0..100
  mapY: number; // percentage 0..100
  nasaContext: string;
}

/**
 * Grounded in NASA Europa Clipper / Galileo thermal bounds (~50K/-223°C polar shadows to ~140K/-133°C sunlit equator).
 */
export const EUROPA_LOCATIONS: EuropaLocationSpec[] = [
  {
    id: 'landing_site',
    name: 'Landing Site',
    regionType: 'Equatorial Plain',
    trueTempC: -142,
    mapX: 20,
    mapY: 58,
    nasaContext: 'Baseline touchdown crust (131 K)',
  },
  {
    id: 'ice_ridge',
    name: 'Ice Ridge',
    regionType: 'Tectonic Double Ridge',
    trueTempC: -158,
    mapX: 41,
    mapY: 36,
    nasaContext: 'Fractured water-ice uplift (115 K)',
  },
  {
    id: 'shadow_region',
    name: 'Shadow Region',
    regionType: 'Terminator Scarp',
    trueTempC: -204,
    mapX: 78,
    mapY: 28,
    nasaContext: 'Near-polar cryogenic cold trap (69 K)',
  },
  {
    id: 'sunlit_region',
    name: 'Sunlit Region',
    regionType: 'Dark Chaos Terrain',
    trueTempC: -134,
    mapX: 52,
    mapY: 66,
    nasaContext: 'Warmest midday dark terrain (139 K)',
  },
  {
    id: 'deep_ice',
    name: 'Deep Ice Area',
    regionType: 'Cryo Borehole Trench',
    trueTempC: -186,
    mapX: 74,
    mapY: 74,
    nasaContext: 'Subsurface thermal gradient (87 K)',
  },
];

export interface SavedEuropaReading {
  locationId: EuropaLocationSpec['id'];
  locationName: string;
  measuredTempC: number;
  accurate: boolean;
  driftC: number;
  savedAtIso: string;
}

export interface StoredLevel6Progress {
  stage: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  probeBuild: SelectedProbeBuild;
  calibrationSolvedIds: number[];
  rocketParts: string[];
  rocketStage: 1 | 2 | 3 | 4;
  launchCompleted: boolean;
  landingSolved: {
    speed: boolean;
    tilt: boolean;
    thermal: boolean;
  };
  landed: boolean;
  collectedReadings: SavedEuropaReading[];
  transmittedPackets: number;
  missionStartedAtMs: number | null;
  missionDeadlineMs: number | null;
  timerExpired: boolean;
}

export const DEFAULT_LEVEL6_PROGRESS: StoredLevel6Progress = {
  stage: 0,
  probeBuild: { ...DEFAULT_PROBE_BUILD },
  calibrationSolvedIds: [],
  rocketParts: [],
  rocketStage: 1,
  launchCompleted: false,
  landingSolved: {
    speed: false,
    tilt: false,
    thermal: false,
  },
  landed: false,
  collectedReadings: [],
  transmittedPackets: 0,
  missionStartedAtMs: null,
  missionDeadlineMs: null,
  timerExpired: false,
};

export function celsiusToKelvin(tempC: number): number {
  return Math.round((tempC + 273.15) * 10) / 10;
}

export function getTempColor(tempC: number): string {
  if (tempC <= -190) return '#60a5fa'; // Deep cryo blue
  if (tempC <= -165) return '#38bdf8'; // Glacial cyan
  if (tempC <= -145) return '#34d399'; // Cool teal
  return '#fbbf24'; // Sunlit amber
}

export function formatCountdownClock(seconds: number): string {
  const clamped = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(clamped / 60);
  const secs = clamped % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}
