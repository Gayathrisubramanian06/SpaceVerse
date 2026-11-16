export const LUNAR_DRY_MASS_KG = 100;
export const LUNAR_ROCKET_LIFT_LIMIT_KG = 175;
export const LUNAR_MIN_FUEL_KG = 10;
export const LUNAR_MAX_FUEL_KG = 100;
export const LUNAR_DEFAULT_FUEL_KG = 30;
export const LUNAR_OPTIMAL_MIN_KG = 45;
export const LUNAR_OPTIMAL_MAX_KG = 65;

export type LunarFuelZone =
  | 'insufficient'
  | 'low_margin'
  | 'optimal'
  | 'high_margin'
  | 'overweight';

export type LunarFuelTone = 'red' | 'yellow' | 'green';

export type TankFillCategory =
  | 'nearly_empty'
  | 'partial'
  | 'optimal_fill'
  | 'high_fill'
  | 'nearly_full';

export interface LunarFuelEvaluation {
  fuelKg: number;
  dryMassKg: number;
  totalMassKg: number;
  rocketLiftLimitKg: number;
  payloadMarginKg: number;
  fuelPct: number;
  tankLevelCategory: TankFillCategory;
  tankLevelLabel: string;
  zone: LunarFuelZone;
  tone: LunarFuelTone;
  statusBadge: 'RED STATUS' | 'YELLOW STATUS' | 'GREEN STATUS';
  headline: string;
  message: string;
  trajectoryLabel: string;
  isOptimal: boolean;
  canLaunch: boolean;
}

export function isValidLunarFuelValue(rawFuelKg: unknown): rawFuelKg is number {
  return (
    typeof rawFuelKg === 'number' &&
    Number.isFinite(rawFuelKg) &&
    rawFuelKg >= LUNAR_MIN_FUEL_KG &&
    rawFuelKg <= LUNAR_MAX_FUEL_KG
  );
}

export function evaluateLunarFuel(rawFuelKg: number): LunarFuelEvaluation {
  const numeric = Number.isFinite(rawFuelKg) ? rawFuelKg : LUNAR_DEFAULT_FUEL_KG;
  const fuelKg = Math.max(LUNAR_MIN_FUEL_KG, Math.min(LUNAR_MAX_FUEL_KG, Math.round(numeric)));
  const dryMassKg = LUNAR_DRY_MASS_KG;
  const rocketLiftLimitKg = LUNAR_ROCKET_LIFT_LIMIT_KG;
  const totalMassKg = dryMassKg + fuelKg;
  const payloadMarginKg = rocketLiftLimitKg - totalMassKg;
  const fuelPct = Math.round(((fuelKg - 0) / LUNAR_MAX_FUEL_KG) * 100);

  let tankLevelCategory: TankFillCategory;
  let tankLevelLabel: string;
  if (fuelKg <= 20) {
    tankLevelCategory = 'nearly_empty';
    tankLevelLabel = 'Nearly Empty';
  } else if (fuelKg <= 40) {
    tankLevelCategory = 'partial';
    tankLevelLabel = 'Partial Fuel';
  } else if (fuelKg <= 65) {
    tankLevelCategory = 'optimal_fill';
    tankLevelLabel = 'Optimal Fill';
  } else if (fuelKg <= 85) {
    tankLevelCategory = 'high_fill';
    tankLevelLabel = 'High Fill';
  } else {
    tankLevelCategory = 'nearly_full';
    tankLevelLabel = 'Nearly Full';
  }

  let zone: LunarFuelZone;
  let tone: LunarFuelTone;
  let statusBadge: 'RED STATUS' | 'YELLOW STATUS' | 'GREEN STATUS';
  let headline: string;
  let message: string;
  let trajectoryLabel: string;
  let isOptimal = false;

  if (fuelKg < 40) {
    zone = 'insufficient';
    tone = 'red';
    statusBadge = 'RED STATUS';
    headline = 'INSUFFICIENT DELTA-V';
    message =
      'Probe will miss the Moon. Your spacecraft does not have enough fuel for the planned journey.';
    trajectoryLabel = 'UNDERSHOOT // DEEP-SPACE DRIFT';
  } else if (fuelKg <= 44) {
    zone = 'low_margin';
    tone = 'yellow';
    statusBadge = 'YELLOW STATUS';
    headline = 'FUEL MARGIN TOO LOW';
    message =
      'The selected fuel quantity is below the recommended mission range. Increase the fuel reserve.';
    trajectoryLabel = 'NARROW CORRIDOR // LOW FUEL RESERVE';
  } else if (fuelKg <= 65) {
    zone = 'optimal';
    tone = 'green';
    statusBadge = 'GREEN STATUS';
    headline = 'OPTIMAL TRAJECTORY CALCULATED';
    message = 'Ready for Lunar Insertion!';
    trajectoryLabel = 'NOMINAL LUNAR FLYBY CORRIDOR';
    isOptimal = true;
  } else if (fuelKg <= 75) {
    zone = 'high_margin';
    tone = 'yellow';
    statusBadge = 'YELLOW STATUS';
    headline = 'PAYLOAD MARGIN REDUCED';
    message =
      'Your spacecraft is carrying more fuel than the recommended range. Reduce fuel to improve your launch margin.';
    trajectoryLabel = 'HEAVY CONFIGURATION // TIGHT LIFT MARGIN';
  } else {
    zone = 'overweight';
    tone = 'red';
    statusBadge = 'RED STATUS';
    headline = 'OVERWEIGHT: ROCKET CANNOT ESCAPE EARTH GRAVITY';
    message = 'Your spacecraft exceeds the allowed lifting capacity. Reduce the fuel quantity.';
    trajectoryLabel = 'PAD ABORT // OVER 175 KG LIFT LIMIT';
  }

  return {
    fuelKg,
    dryMassKg,
    totalMassKg,
    rocketLiftLimitKg,
    payloadMarginKg,
    fuelPct,
    tankLevelCategory,
    tankLevelLabel,
    zone,
    tone,
    statusBadge,
    headline,
    message,
    trajectoryLabel,
    isOptimal,
    canLaunch: isOptimal,
  };
}
