export type LunarCategoryId =
  | 'body'
  | 'instruments'
  | 'comms'
  | 'power'
  | 'propulsion'
  | 'navigation'
  | 'fuel';

export interface LunarComponentOption {
  id: string;
  category: LunarCategoryId;
  name: string;
  shortName: string;
  weightKg: number;
  costSc: number;
  powerCapW?: number;
  powerDrawW?: number;
  commsScore?: number;
  instrumentScore?: number;
  canDetectSubsurfaceIce?: boolean;
  propulsionEfficiency?: number; // multiplier on effective delta-v
  navPrecisionScore?: number;
  maxFuelTankKg?: number;
  metricLabel: string;
  metricDisplay: string;
  summary: string;
}

export interface SelectedLunarBuild {
  body: string;
  instruments: string;
  comms: string;
  power: string;
  propulsion: string;
  navigation: string;
  fuel: string;
  fuelMassKg: number;
}

export interface LunarSpacecraftMetrics {
  dryMassKg: number;
  fuelMassKg: number;
  totalMassKg: number;
  maxTankFuelKg: number;
  liftLimitKg: number;
  liftMarginKg: number;
  totalCostSc: number;
  remainingBudgetSc: number;
  powerCapacityW: number;
  powerDrawW: number;
  commsStrengthPct: number;
  instrumentCapabilityPct: number;
  canDetectSubsurfaceIce: boolean;
  navPrecisionPct: number;
  travelCapabilityPct: number;
  isOverBudget: boolean;
  isOverTankCapacity: boolean;
  isOverWeight: boolean;
  isPowerWeak: boolean;
  isCommsWeak: boolean;
  isInstrumentWeak: boolean;
  isFuelTooLow: boolean;
  fuelExperimentStatus: 'red' | 'yellow' | 'green';
  fuelExperimentReason: string;
  readyForFuelTest: boolean;
  warnings: string[];
}

export const LUNAR_WATER_DURATION_SEC = 10 * 60; // 10 minutes
export const LUNAR_MAX_BUDGET_SC = 1150;
export const LUNAR_ROCKET_LIFT_LIMIT_KG = 195;

export const LUNAR_CATEGORY_META: Array<{
  id: LunarCategoryId;
  label: string;
  shortLabel: string;
}> = [
  { id: 'body', label: 'Spacecraft Body', shortLabel: 'Body' },
  { id: 'instruments', label: 'Scientific Instruments', shortLabel: 'Instruments' },
  { id: 'comms', label: 'Communication System', shortLabel: 'Comms' },
  { id: 'power', label: 'Power System', shortLabel: 'Power' },
  { id: 'propulsion', label: 'Propulsion System', shortLabel: 'Propulsion' },
  { id: 'navigation', label: 'Navigation System', shortLabel: 'Navigation' },
  { id: 'fuel', label: 'Fuel Supply Tank', shortLabel: 'Fuel Tank' },
];

/**
 * Options are ordered neutrally — NEVER highlight or recommend optimal parts upfront.
 */
export const LUNAR_COMPONENTS: Record<LunarCategoryId, LunarComponentOption[]> = {
  body: [
    {
      id: 'l_body_alu',
      category: 'body',
      name: 'Standard Aluminum Bus',
      shortName: 'Alu Bus',
      weightKg: 36,
      costSc: 110,
      powerDrawW: 12,
      metricLabel: 'Dry Structure',
      metricDisplay: '36 kg',
      summary: 'Conventional rigid frame with moderate payload weight.',
    },
    {
      id: 'l_body_comp',
      category: 'body',
      name: 'Cryo-Carbon Orbiter Frame',
      shortName: 'Carbon Frame',
      weightKg: 26,
      costSc: 150,
      powerDrawW: 10,
      metricLabel: 'Dry Structure',
      metricDisplay: '26 kg',
      summary: 'Lightweight composite shell tuned for polar lunar orbiters.',
    },
    {
      id: 'l_body_ti',
      category: 'body',
      name: 'Armored Titanium Hull',
      shortName: 'Titanium Hull',
      weightKg: 54,
      costSc: 185,
      powerDrawW: 12,
      metricLabel: 'Dry Structure',
      metricDisplay: '54 kg',
      summary: 'Heavy metallic chassis reducing available fuel lift margin.',
    },
  ],
  instruments: [
    {
      id: 'l_inst_cam',
      category: 'instruments',
      name: 'Visible Optical Imager',
      shortName: 'Optical Cam',
      weightKg: 9,
      costSc: 95,
      powerDrawW: 16,
      instrumentScore: 42,
      canDetectSubsurfaceIce: false,
      metricLabel: 'Ice Detection',
      metricDisplay: '42%',
      summary: 'Captures crater photos only; dark shadows hide subsurface ice.',
    },
    {
      id: 'l_inst_ir',
      category: 'instruments',
      name: 'Cryo-IR Thermal Mapper',
      shortName: 'IR Mapper',
      weightKg: 15,
      costSc: 145,
      powerDrawW: 24,
      instrumentScore: 76,
      canDetectSubsurfaceIce: true,
      metricLabel: 'Ice Detection',
      metricDisplay: '76%',
      summary: 'Detects frozen thermal cold traps inside shadowed rims.',
    },
    {
      id: 'l_inst_neutron',
      category: 'instruments',
      name: 'Neutron & Ice-Radar Suite',
      shortName: 'Neutron + Radar',
      weightKg: 18,
      costSc: 185,
      powerDrawW: 28,
      instrumentScore: 96,
      canDetectSubsurfaceIce: true,
      metricLabel: 'Ice Detection',
      metricDisplay: '96%',
      summary: 'Measures buried hydrogen + radar ice reflectance cleanly.',
    },
  ],
  comms: [
    {
      id: 'l_comms_whip',
      category: 'comms',
      name: 'Low-Gain S-Band Mast',
      shortName: 'S-Band Mast',
      weightKg: 7,
      costSc: 75,
      powerDrawW: 14,
      commsScore: 48,
      metricLabel: 'Earth Link',
      metricDisplay: '48%',
      summary: 'Weak signal over 384,000 km; high packet drop risk.',
    },
    {
      id: 'l_comms_helix',
      category: 'comms',
      name: 'Polar Medium-Gain Array',
      shortName: 'Medium Gain',
      weightKg: 12,
      costSc: 125,
      powerDrawW: 22,
      commsScore: 74,
      metricLabel: 'Earth Link',
      metricDisplay: '74%',
      summary: 'Moderate downlink; needs dish realignment near crater rims.',
    },
    {
      id: 'l_comms_hga',
      category: 'comms',
      name: 'X-Band High-Gain Dish',
      shortName: 'X-Band Dish',
      weightKg: 16,
      costSc: 165,
      powerDrawW: 28,
      commsScore: 95,
      metricLabel: 'Earth Link',
      metricDisplay: '95%',
      summary: 'Focused parabolic dish for reliable science downloads.',
    },
  ],
  power: [
    {
      id: 'l_pow_strip',
      category: 'power',
      name: 'Fixed Body Solar Strips',
      shortName: 'Solar Strips',
      weightKg: 11,
      costSc: 85,
      powerCapW: 72,
      metricLabel: 'Power Output',
      metricDisplay: '72 W',
      summary: 'Underpowered during south-pole crater eclipse passes.',
    },
    {
      id: 'l_pow_dual',
      category: 'power',
      name: 'Tracking Wings + Cryo Cells',
      shortName: 'Tracking + Cells',
      weightKg: 18,
      costSc: 145,
      powerCapW: 145,
      metricLabel: 'Power Output',
      metricDisplay: '145 W',
      summary: 'Articulated solar arrays paired with polar shadow battery reserve.',
    },
    {
      id: 'l_pow_heavy',
      category: 'power',
      name: 'Heavy Auxiliary Power Bank',
      shortName: 'Heavy Bank',
      weightKg: 34,
      costSc: 210,
      powerCapW: 205,
      metricLabel: 'Power Output',
      metricDisplay: '205 W',
      summary: 'Large reserve with notable mass and Star Credit penalty.',
    },
  ],
  propulsion: [
    {
      id: 'l_prop_cold',
      category: 'propulsion',
      name: 'Cold-Gas Attitude Thruster',
      shortName: 'Cold Gas',
      weightKg: 12,
      costSc: 90,
      powerDrawW: 10,
      propulsionEfficiency: 0.72,
      metricLabel: 'Isp Efficiency',
      metricDisplay: '72%',
      summary: 'Low specific impulse; struggles to brake into lunar orbit.',
    },
    {
      id: 'l_prop_biprop',
      category: 'propulsion',
      name: 'Bipropellant LOI Thruster',
      shortName: 'Bipropellant',
      weightKg: 18,
      costSc: 150,
      powerDrawW: 16,
      propulsionEfficiency: 1.08,
      metricLabel: 'Isp Efficiency',
      metricDisplay: '108%',
      summary: 'High-efficiency main engine built for lunar orbit insertion.',
    },
    {
      id: 'l_prop_heavy',
      category: 'propulsion',
      name: 'Twin Heavy Booster Bells',
      shortName: 'Twin Bells',
      weightKg: 34,
      costSc: 205,
      powerDrawW: 20,
      propulsionEfficiency: 1.12,
      metricLabel: 'Isp Efficiency',
      metricDisplay: '112%',
      summary: 'High thrust paired with heavy dry engine mass.',
    },
  ],
  navigation: [
    {
      id: 'l_nav_gyro',
      category: 'navigation',
      name: 'Basic Inertial Compass',
      shortName: 'Basic Gyro',
      weightKg: 7,
      costSc: 75,
      powerDrawW: 10,
      navPrecisionScore: 54,
      metricLabel: 'Guidance',
      metricDisplay: '54%',
      summary: 'Significant trajectory drift over 384,000 km lunar flight.',
    },
    {
      id: 'l_nav_star',
      category: 'navigation',
      name: 'Star-Tracker + Laser Altimeter',
      shortName: 'Star Tracker',
      weightKg: 11,
      costSc: 135,
      powerDrawW: 16,
      navPrecisionScore: 93,
      metricLabel: 'Guidance',
      metricDisplay: '93%',
      summary: 'Locks polar crater coordinates with pinpoint optical tracking.',
    },
    {
      id: 'l_nav_dual',
      category: 'navigation',
      name: 'Redundant Optical-IMU Suite',
      shortName: 'Dual Nav',
      weightKg: 20,
      costSc: 180,
      powerDrawW: 26,
      navPrecisionScore: 97,
      metricLabel: 'Guidance',
      metricDisplay: '97%',
      summary: 'Heavy dual-redundant guidance rack with higher wattage draw.',
    },
  ],
  fuel: [
    {
      id: 'l_fuel_std',
      category: 'fuel',
      name: 'Compact Titanium Tank',
      shortName: 'Compact Tank',
      weightKg: 8,
      costSc: 70,
      maxFuelTankKg: 76,
      metricLabel: 'Max Fuel Cap',
      metricDisplay: '76 kg',
      summary: 'Light cylindrical bladder rated up to 76 kg of propellant.',
    },
    {
      id: 'l_fuel_cryo',
      category: 'fuel',
      name: 'Composite Transfer Tank',
      shortName: 'Transfer Tank',
      weightKg: 11,
      costSc: 120,
      maxFuelTankKg: 88,
      metricLabel: 'Max Fuel Cap',
      metricDisplay: '88 kg',
      summary: 'Lightweight high-capacity vessel supporting full lunar braking.',
    },
    {
      id: 'l_fuel_dual',
      category: 'fuel',
      name: 'Dual Reserve Tank Cluster',
      shortName: 'Dual Reserve',
      weightKg: 26,
      costSc: 175,
      maxFuelTankKg: 95,
      metricLabel: 'Max Fuel Cap',
      metricDisplay: '95 kg',
      summary: 'Thick tank walls add dry weight before fuel is even loaded.',
    },
  ],
};

export const DEFAULT_LUNAR_BUILD: SelectedLunarBuild = {
  body: 'l_body_alu',
  instruments: 'l_inst_cam',
  comms: 'l_comms_whip',
  power: 'l_pow_strip',
  propulsion: 'l_prop_cold',
  navigation: 'l_nav_gyro',
  fuel: 'l_fuel_std',
  fuelMassKg: 40,
};

export function findLunarOption(category: LunarCategoryId, id: string): LunarComponentOption {
  const list = LUNAR_COMPONENTS[category];
  return list.find((o) => o.id === id) || list[0];
}

export function evaluateLunarSpacecraft(
  build: SelectedLunarBuild,
  equippedGear: string[] = []
): LunarSpacecraftMetrics {
  const body = findLunarOption('body', build.body);
  const instruments = findLunarOption('instruments', build.instruments);
  const comms = findLunarOption('comms', build.comms);
  const power = findLunarOption('power', build.power);
  const propulsion = findLunarOption('propulsion', build.propulsion);
  const navigation = findLunarOption('navigation', build.navigation);
  const fuelTank = findLunarOption('fuel', build.fuel);

  const dryMassKg =
    body.weightKg +
    instruments.weightKg +
    comms.weightKg +
    power.weightKg +
    propulsion.weightKg +
    navigation.weightKg +
    fuelTank.weightKg;

  const maxTankFuelKg = fuelTank.maxFuelTankKg ?? 76;
  const fuelMassKg = Math.max(20, Math.min(95, Math.round(build.fuelMassKg || 40)));
  const totalMassKg = dryMassKg + fuelMassKg;
  const hasHeavyKit = equippedGear.includes('lvl8_heavy_rocket_kit');
  const hasLoiProp = equippedGear.includes('lvl8_loi_propulsion');
  const hasCommsRelay = equippedGear.includes('lvl8_crew_comms');
  const hasIceGear =
    equippedGear.includes('lvl8_neutron_spec') ||
    equippedGear.includes('lvl8_ice_radar') ||
    equippedGear.includes('lvl8_ir_mapper');

  const effectiveLiftLimitKg = LUNAR_ROCKET_LIFT_LIMIT_KG + (hasHeavyKit ? 20 : 0);
  const liftMarginKg = effectiveLiftLimitKg - totalMassKg;

  const totalCostSc =
    body.costSc +
    instruments.costSc +
    comms.costSc +
    power.costSc +
    propulsion.costSc +
    navigation.costSc +
    fuelTank.costSc;
  const remainingBudgetSc = LUNAR_MAX_BUDGET_SC - totalCostSc;

  const powerCapacityW = power.powerCapW ?? 0;
  const powerDrawW =
    (body.powerDrawW ?? 10) +
    (instruments.powerDrawW ?? 0) +
    (comms.powerDrawW ?? 0) +
    (propulsion.powerDrawW ?? 0) +
    (navigation.powerDrawW ?? 0);

  const commsStrengthPct = Math.min(100, (comms.commsScore ?? 0) + (hasCommsRelay ? 14 : 0));
  const instrumentCapabilityPct = Math.min(
    100,
    (instruments.instrumentScore ?? 0) + (hasIceGear ? 16 : 0)
  );
  const canDetectSubsurfaceIce = Boolean(instruments.canDetectSubsurfaceIce) || hasIceGear;
  const navPrecisionPct = navigation.navPrecisionScore ?? 0;
  const propEff = (propulsion.propulsionEfficiency ?? 1) + (hasLoiProp ? 0.14 : 0);

  // Tsiolkovsky-inspired scaled travel capability (100% = easy trans-lunar + LOI capture)
  const massRatioFactor = fuelMassKg / Math.max(85, dryMassKg);
  const travelCapabilityPct = Math.min(
    115,
    Math.round(massRatioFactor * propEff * 182)
  );

  const isOverBudget = totalCostSc > LUNAR_MAX_BUDGET_SC;
  const isOverTankCapacity = fuelMassKg > maxTankFuelKg;
  const isOverWeight = totalMassKg > effectiveLiftLimitKg;
  const isPowerWeak = powerCapacityW < powerDrawW + 15;
  const isCommsWeak = commsStrengthPct < 70;
  const isInstrumentWeak = !canDetectSubsurfaceIce || instrumentCapabilityPct < 70;
  const isFuelTooLow = travelCapabilityPct < 76;

  let fuelExperimentStatus: 'red' | 'yellow' | 'green' = 'green';
  let fuelExperimentReason = 'Lift & Δv balanced for Moon capture ✓';

  if (isOverWeight) {
    fuelExperimentStatus = 'red';
    fuelExperimentReason = `Over lift limit (${totalMassKg} > ${effectiveLiftLimitKg} kg)`;
  } else if (isOverTankCapacity) {
    fuelExperimentStatus = 'red';
    fuelExperimentReason = `Over tank cap (${fuelMassKg} > ${maxTankFuelKg} kg)`;
  } else if (isFuelTooLow) {
    fuelExperimentStatus = 'red';
    fuelExperimentReason = `Low fuel Δv (${travelCapabilityPct}%)`;
  } else if (travelCapabilityPct < 86 || liftMarginKg < 5) {
    fuelExperimentStatus = 'yellow';
    fuelExperimentReason =
      liftMarginKg < 5
        ? `Tight lift margin (+${liftMarginKg} kg)`
        : 'Tight Δv reserve';
  }

  const warnings: string[] = [];
  if (isOverBudget) warnings.push(`Over budget (${totalCostSc} > ${LUNAR_MAX_BUDGET_SC} SC)`);
  if (isOverWeight) warnings.push(`Over lift (${totalMassKg} > ${effectiveLiftLimitKg} kg)`);
  if (isPowerWeak) warnings.push(`Low power (${powerCapacityW}W / ${powerDrawW}W)`);
  if (isCommsWeak) warnings.push('Weak Earth link');
  if (isInstrumentWeak) warnings.push('Needs ice sensor');

  return {
    dryMassKg,
    fuelMassKg,
    totalMassKg,
    maxTankFuelKg,
    liftLimitKg: effectiveLiftLimitKg,
    liftMarginKg,
    totalCostSc,
    remainingBudgetSc,
    powerCapacityW,
    powerDrawW,
    commsStrengthPct,
    instrumentCapabilityPct,
    canDetectSubsurfaceIce,
    navPrecisionPct,
    travelCapabilityPct,
    isOverBudget,
    isOverTankCapacity,
    isOverWeight,
    isPowerWeak,
    isCommsWeak,
    isInstrumentWeak,
    isFuelTooLow,
    fuelExperimentStatus,
    fuelExperimentReason,
    readyForFuelTest: !isOverBudget && !isPowerWeak && !isCommsWeak && !isInstrumentWeak,
    warnings,
  };
}

export interface LunarCraterSpec {
  id:
    | 'sunlit_rim'
    | 'de_gerlache'
    | 'faustini'
    | 'shoemaker'
    | 'cabeus_outcrop'
    | 'shackleton_floor';
  name: string;
  xPct: number;
  yPct: number;
  surfaceTempC: number;
  baseHydrogenPpm: number;
  baseRadarIcePct: number;
  evidenceWeight: number;
  hasStrongIceEvidence: boolean;
  geologyTag: string;
}

/**
 * Neutral crater dataset grounded in LRO / LCROSS Lunar South Pole findings.
 * Never visually mark which crater hides the richest water ice upfront!
 */
export const LUNAR_SOUTH_POLE_CRATERS: LunarCraterSpec[] = [
  {
    id: 'sunlit_rim',
    name: 'Malapert Ridge',
    xPct: 22,
    yPct: 28,
    surfaceTempC: -34,
    baseHydrogenPpm: 14,
    baseRadarIcePct: 16,
    evidenceWeight: 14,
    hasStrongIceEvidence: false,
    geologyTag: 'Sunlit Highland Peak',
  },
  {
    id: 'de_gerlache',
    name: 'De Gerlache Rim',
    xPct: 34,
    yPct: 68,
    surfaceTempC: -136,
    baseHydrogenPpm: 38,
    baseRadarIcePct: 31,
    evidenceWeight: 18,
    hasStrongIceEvidence: false,
    geologyTag: 'Terraced Basalt Basin',
  },
  {
    id: 'faustini',
    name: 'Faustini Slope',
    xPct: 76,
    yPct: 30,
    surfaceTempC: -158,
    baseHydrogenPpm: 68,
    baseRadarIcePct: 48,
    evidenceWeight: 22,
    hasStrongIceEvidence: false,
    geologyTag: 'Partial Shadow Trench',
  },
  {
    id: 'shoemaker',
    name: 'Shoemaker Floor',
    xPct: 68,
    yPct: 72,
    surfaceTempC: -182,
    baseHydrogenPpm: 112,
    baseRadarIcePct: 64,
    evidenceWeight: 26,
    hasStrongIceEvidence: false,
    geologyTag: 'Polar Regolith Pocket',
  },
  {
    id: 'cabeus_outcrop',
    name: 'Cabeus Cold Trap',
    xPct: 50,
    yPct: 50,
    surfaceTempC: -226,
    baseHydrogenPpm: 345,
    baseRadarIcePct: 94,
    evidenceWeight: 54,
    hasStrongIceEvidence: true,
    geologyTag: 'Permanent Polar Shadow',
  },
  {
    id: 'shackleton_floor',
    name: 'Shackleton Rim',
    xPct: 48,
    yPct: 20,
    surfaceTempC: -168,
    baseHydrogenPpm: 84,
    baseRadarIcePct: 52,
    evidenceWeight: 20,
    hasStrongIceEvidence: false,
    geologyTag: 'Steep Polar Wall',
  },
];

export interface CraterScanRecord {
  craterId: LunarCraterSpec['id'];
  craterName: string;
  scanCount: number;
  confidencePct: number;
  hydrogenPpm: number;
  radarIcePct: number;
  tempC: number;
  recordedAsEvidence: boolean;
}

export interface StoredLevel8Progress {
  stage: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  build: SelectedLunarBuild;
  equippedStoreGear?: string[];
  fuelTestPassed: boolean;
  rocketParts: string[];
  rocketStage: 1 | 2 | 3 | 4;
  launchCompleted: boolean;
  navHeadingDeg: number;
  navOrbitLocked: boolean;
  craterScans: CraterScanRecord[];
  evidenceMeterPct: number;
  transmittedPct: number;
  transmissionInterrupted: boolean;
  missionStartedAtMs: number | null;
  missionDeadlineMs: number | null;
  timerExpired: boolean;
}

export const DEFAULT_LEVEL8_PROGRESS: StoredLevel8Progress = {
  stage: 0,
  build: { ...DEFAULT_LUNAR_BUILD },
  equippedStoreGear: [],
  fuelTestPassed: false,
  rocketParts: [],
  rocketStage: 1,
  launchCompleted: false,
  navHeadingDeg: 14, // Starts intentionally drifted off 0° corridor
  navOrbitLocked: false,
  craterScans: [],
  evidenceMeterPct: 0,
  transmittedPct: 0,
  transmissionInterrupted: false,
  missionStartedAtMs: null,
  missionDeadlineMs: null,
  timerExpired: false,
};
