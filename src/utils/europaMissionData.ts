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
  specLabel: string;
  specValue: string;
  metricLabel: string;
  metricValue: number; // Internal physics rating (never spoiled directly in build cards)
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

export interface ChamberTrialReport {
  trialNumber: number;
  buildKey: string;
  totalWeightKg: number;
  totalCostSc: number;
  observedCoreTempC: number;
  observedPowerMinutes: number;
  observedSensorDriftC: number;
  observedSignalDbm: number;
  thermalPassed: boolean;
  powerPassed: boolean;
  massPassed: boolean;
  budgetPassed: boolean;
  sensorAdvisory: boolean;
  antennaAdvisory: boolean;
  certified: boolean;
  headline: string;
  findings: string[];
  advisories: string[];
  affectedCategories: ProbeCategoryId[];
}

export const EUROPA_MAX_BUDGET_SC = 850;
export const EUROPA_MAX_WEIGHT_KG = 120;
export const EUROPA_MISSION_DURATION_SEC = 12 * 60; // 12 minutes

export const PROBE_CATEGORY_META: Array<{
  id: ProbeCategoryId;
  slotCode: string;
  label: string;
  roleDesc: string;
  metricTitle: string;
}> = [
  {
    id: 'body',
    slotCode: '01',
    label: 'Probe Body',
    roleDesc: 'Structural shell & thermal envelope',
    metricTitle: 'Hull Insulation',
  },
  {
    id: 'legs',
    slotCode: '02',
    label: 'Landing Legs',
    roleDesc: 'Touchdown stance & mass budget',
    metricTitle: 'Surface Stance',
  },
  {
    id: 'sensor',
    slotCode: '03',
    label: 'Temperature Sensor',
    roleDesc: 'Cryogenic ice thermometry probe',
    metricTitle: 'Thermal Readout',
  },
  {
    id: 'battery',
    slotCode: '04',
    label: 'Battery',
    roleDesc: 'Primary bus energy under load',
    metricTitle: 'Power Reserve',
  },
  {
    id: 'heater',
    slotCode: '05',
    label: 'Heater',
    roleDesc: 'Internal electronics bay warming',
    metricTitle: 'Thermal Output',
  },
  {
    id: 'antenna',
    slotCode: '06',
    label: 'Comm Antenna',
    roleDesc: 'Deep-space Earth data relay',
    metricTitle: 'RF Link',
  },
];

/**
 * Neutral engineering specs — players test builds in the Cryo Chamber to discover which
 * component combinations survive weight, budget, thermal soak, and deep-space load.
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
      specLabel: 'Envelope',
      specValue: 'Single-Wall 6061 Alloy',
      metricLabel: 'Cryo Shielding',
      metricValue: 45,
      summary: 'Lightweight machined aluminum frame with single-wall metallic conductivity and compact fairing volume.',
    },
    {
      id: 'body_ti',
      category: 'body',
      name: 'Aerogel Composite Hull',
      shortName: 'Aerogel Hull',
      weightKg: 44,
      costSc: 155,
      specLabel: 'Envelope',
      specValue: 'Multi-Layer Silica Aerogel',
      metricLabel: 'Cryo Shielding',
      metricValue: 88,
      summary: 'Carbon-composite structural shell lined with porous silica aerogel blankets and low-conductivity standoffs.',
    },
    {
      id: 'body_steel',
      category: 'body',
      name: 'Reinforced Steel Casing',
      shortName: 'Steel Casing',
      weightKg: 66,
      costSc: 130,
      specLabel: 'Envelope',
      specValue: 'Thick Stainless Vessel',
      metricLabel: 'Cryo Shielding',
      metricValue: 78,
      summary: 'Thick-walled stainless pressure housing built for heavy mechanical impact tolerance.',
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
      specLabel: 'Gear Type',
      specValue: 'Fixed Dual Runners',
      metricLabel: 'Ice Stability',
      metricValue: 64,
      summary: 'Simple fixed twin alloy skids mounted directly to the lower chassis ring.',
    },
    {
      id: 'legs_tri',
      category: 'legs',
      name: 'Ice-Grip Tripod Struts',
      shortName: 'Grip Tripod',
      weightKg: 14,
      costSc: 120,
      specLabel: 'Gear Type',
      specValue: '3-Point Titanium Cleats',
      metricLabel: 'Ice Stability',
      metricValue: 92,
      summary: 'Three articulated hollow titanium struts fitted with crush-core pads and ice-cleat feet.',
    },
    {
      id: 'legs_quad',
      category: 'legs',
      name: 'Heavy Shock Quad-Pods',
      shortName: 'Shock Quad',
      weightKg: 30,
      costSc: 150,
      specLabel: 'Gear Type',
      specValue: '4-Leg Hydraulic Struts',
      metricLabel: 'Ice Stability',
      metricValue: 96,
      summary: 'Four-corner telescopic hydraulic dampers offering wide stance footprint across rough ridges.',
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
      specLabel: 'Transducer',
      specValue: 'Type-K Bimetallic Junction',
      metricLabel: 'Accuracy',
      metricValue: 46,
      summary: 'Compact two-wire bimetallic junction rated for general spacecraft bus temperature logging.',
    },
    {
      id: 'sensor_rtd',
      category: 'sensor',
      name: 'Cryo-RTD Precision Probe',
      shortName: 'Cryo-RTD',
      weightKg: 8,
      costSc: 140,
      specLabel: 'Transducer',
      specValue: 'Platinum Resistance Probe',
      metricLabel: 'Accuracy',
      metricValue: 96,
      summary: 'Sapphire-sheathed platinum resistance element calibrated across deep cryogenic ranges.',
    },
    {
      id: 'sensor_ir',
      category: 'sensor',
      name: 'Dual-Band IR Bolometer',
      shortName: 'IR Bolometer',
      weightKg: 12,
      costSc: 170,
      specLabel: 'Transducer',
      specValue: 'Optical Infrared Array',
      metricLabel: 'Accuracy',
      metricValue: 88,
      summary: 'Non-contact dual-spectrum optical radiometer with germanium lens and micro-chopper.',
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
      specLabel: 'Chemistry',
      specValue: 'Primary Zinc-Air Cell',
      metricLabel: 'Capacity',
      metricValue: 42,
      summary: 'Compact primary chemistry cell prioritizing low launch mass and minimal procurement cost.',
    },
    {
      id: 'bat_li',
      category: 'battery',
      name: 'Cold-Rated Li-SOCl₂ Pack',
      shortName: 'Li-SOCl₂',
      weightKg: 15,
      costSc: 130,
      specLabel: 'Chemistry',
      specValue: 'Low-Temp Lithium Thionyl',
      metricLabel: 'Capacity',
      metricValue: 88,
      summary: 'Pressurized lithium thionyl chloride pack formulated with low-freezing-point electrolyte.',
    },
    {
      id: 'bat_heavy',
      category: 'battery',
      name: 'Dual Reserve Cell Bank',
      shortName: 'Dual Bank',
      weightKg: 25,
      costSc: 190,
      specLabel: 'Chemistry',
      specValue: 'Dual-Bus Redundant Bank',
      metricLabel: 'Capacity',
      metricValue: 99,
      summary: 'Twin parallel high-density reserve banks inside an armored thermal containment tray.',
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
      specLabel: 'Element',
      specValue: 'Adhesive Kapton Traces',
      metricLabel: 'Heat Output',
      metricValue: 38,
      summary: 'Flexible etched-foil Kapton trace strips bonded directly along interior chassis walls.',
    },
    {
      id: 'heat_rhupulse',
      category: 'heater',
      name: 'Regulated Cryo-Pulse Heater',
      shortName: 'Cryo-Pulse',
      weightKg: 11,
      costSc: 115,
      specLabel: 'Element',
      specValue: 'Closed-Loop Heat Pipe',
      metricLabel: 'Heat Output',
      metricValue: 90,
      summary: 'Thermostat-regulated heater module coupled to a closed-loop electronics bay heat pipe.',
    },
    {
      id: 'heat_coil',
      category: 'heater',
      name: 'Heavy Thermal Core',
      shortName: 'Thermal Core',
      weightKg: 21,
      costSc: 160,
      specLabel: 'Element',
      specValue: 'High-Wattage Core Block',
      metricLabel: 'Heat Output',
      metricValue: 98,
      summary: 'High-wattage resistive core block encased in a heavy copper thermal spreader.',
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
      specLabel: 'RF Array',
      specValue: 'Omnidirectional Monopole',
      metricLabel: 'Signal Link',
      metricValue: 40,
      summary: 'Fixed vertical monopole mast broadcasting uniformly without mechanical pointing gimbals.',
    },
    {
      id: 'ant_hga',
      category: 'antenna',
      name: 'X-Band High-Gain Dish',
      shortName: 'High-Gain Dish',
      weightKg: 14,
      costSc: 145,
      specLabel: 'RF Array',
      specValue: 'Parabolic X-Band Reflector',
      metricLabel: 'Signal Link',
      metricValue: 92,
      summary: 'Lightweight carbon-mesh parabolic dish focusing telemetry energy into a tight Earth beam.',
    },
    {
      id: 'ant_phased',
      category: 'antenna',
      name: 'Phased Array Transceiver',
      shortName: 'Phased Array',
      weightKg: 22,
      costSc: 195,
      specLabel: 'RF Array',
      specValue: 'Steered Multi-Element Panel',
      metricLabel: 'Signal Link',
      metricValue: 98,
      summary: 'Multi-element flat phased array with electronic beam steering and dual solid-state amplifiers.',
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

export function serializeProbeBuild(build: SelectedProbeBuild): string {
  return [build.body, build.legs, build.sensor, build.battery, build.heater, build.antenna].join('|');
}

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
    blockingReasons.push(`Payload exceeds fairing lift capacity (${totalWeightKg} kg assembled).`);
  }
  if (isOverBudget) {
    blockingReasons.push(`Procurement cost exceeds mission grant (${totalCostSc} SC spent).`);
  }
  if (isBatteryWeak) {
    blockingReasons.push('Power bus brownout detected under sustained heater + radio draw.');
  }
  if (isHeatingWeak) {
    blockingReasons.push('Internal electronics bay froze during -170°C cryo chamber soak.');
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

export function runProbeChamberSimulation(
  build: SelectedProbeBuild,
  trialNumber: number
): ChamberTrialReport {
  const m = evaluateProbeBuild(build);
  const observedCoreTempC = Math.round(-128 + m.heatingCapabilityPct * 1.25);
  const observedPowerMinutes = Math.round((m.batteryCapacityPct / 100) * 16.5 * 10) / 10;
  const observedSensorDriftC = m.isSensorInaccurate ? 8.5 : 0.2;
  const observedSignalDbm = Math.round(-146 + m.commsStrengthPct * 0.54);

  const findings: string[] = [];
  const advisories: string[] = [];
  const affectedCategories: ProbeCategoryId[] = [];

  if (m.isOverWeight) {
    findings.push(`Fairing structural load too high at ${m.totalWeightKg} kg — trim heavy modules to qualify for launch.`);
    affectedCategories.push('body', 'legs');
  }
  if (m.isOverBudget) {
    findings.push(`Total hardware invoice (${m.totalCostSc} SC) exceeded your mission grant allocation.`);
  }
  if (m.isBatteryWeak) {
    findings.push(
      `Power bus collapsed after ${observedPowerMinutes} min under combined cryogenic heater & telemetry load.`
    );
    affectedCategories.push('battery');
  }
  if (m.isHeatingWeak) {
    findings.push(
      `Cryo chamber soak cooled the electronics bay to ${observedCoreTempC}°C — heat loss outpaced thermal output.`
    );
    affectedCategories.push('body', 'heater');
  }

  if (m.isSensorInaccurate) {
    advisories.push(
      `Cryo thermometry showed ±${observedSensorDriftC}°C erratic drift at -180°C (will need field stabilization).`
    );
    affectedCategories.push('sensor');
  }
  if (m.isAntennaWeak) {
    advisories.push(
      `628M km RF sweep measured ${observedSignalDbm} dBm (expect intermittent Earth link dropouts).`
    );
    affectedCategories.push('antenna');
  }

  const certified = m.canLaunch;
  const headline = certified
    ? advisories.length > 0
      ? 'Launch Certified with Field Advisories'
      : 'Chamber Test Passed — Ready for Rocket Launch'
    : 'Chamber Test Failed — Hardware Revision Needed';

  return {
    trialNumber,
    buildKey: serializeProbeBuild(build),
    totalWeightKg: m.totalWeightKg,
    totalCostSc: m.totalCostSc,
    observedCoreTempC,
    observedPowerMinutes,
    observedSensorDriftC,
    observedSignalDbm,
    thermalPassed: !m.isHeatingWeak,
    powerPassed: !m.isBatteryWeak,
    massPassed: !m.isOverWeight,
    budgetPassed: !m.isOverBudget,
    sensorAdvisory: m.isSensorInaccurate,
    antennaAdvisory: m.isAntennaWeak,
    certified,
    headline,
    findings,
    advisories,
    affectedCategories: Array.from(new Set(affectedCategories)),
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
