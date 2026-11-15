export type Level9Stage = 0 | 1 | 2 | 3 | 4 | 5;

export const LEVEL9_MISSION_DURATION_SEC = 240; // 4:00 emergency countdown
export const LEVEL9_REWARD_SC = 1000;
export const LEVEL9_BADGE_ID = 'SPACE_RESCUE_HERO';
export const LEVEL9_BADGE_LABEL = 'SPACE RESCUE HERO';

export interface StoredLevel9Progress {
  stage: Level9Stage;
  missionStartedAtMs: number | null;
  missionDeadlineMs: number | null;
  oxygenPct: number;
  hullPct: number;
  astronautLocated: boolean;
  coordinatesLabel: string;
  commsEstablished: boolean;
  debrisNavigated: boolean;
  speedMatched: boolean;
  armCaptured: boolean;
  airlockSecured: boolean;
  failedReason: 'oxygen' | 'hull' | 'timer' | null;
}

export const DEFAULT_LEVEL9_PROGRESS: StoredLevel9Progress = {
  stage: 0,
  missionStartedAtMs: null,
  missionDeadlineMs: null,
  oxygenPct: 100,
  hullPct: 100,
  astronautLocated: false,
  coordinatesLabel: '',
  commsEstablished: false,
  debrisNavigated: false,
  speedMatched: false,
  armCaptured: false,
  airlockSecured: false,
  failedReason: null,
};

export const LEVEL9_VOICE_BRIEFING_SCRIPT =
  "Emergency alert! During a spacewalk outside the International Space Station, an astronaut's safety tether has disconnected. Oxygen is dropping fast. Locate the astronaut on radar, establish radio contact, navigate the debris field, match speed, and grab them with the robotic arm to reel them safely aboard before time runs out!";

export const LEVEL9_OBJECTIVES = [
  'Locate the missing astronaut.',
  "Determine the astronaut's exact coordinates.",
  'Establish communication.',
  'Navigate safely through space debris.',
  "Match the spacecraft's speed with the astronaut.",
  'Capture the astronaut using the robotic arm.',
  'Return the astronaut safely to the spacecraft.',
];

export const LEVEL9_STAGE_META: Array<{ id: Level9Stage; short: string; label: string }> = [
  { id: 0, short: 'Briefing', label: 'Intro Briefing' },
  { id: 1, short: '1 Radar', label: 'Locate Astronaut' },
  { id: 2, short: '2 Comms', label: 'Establish Comms' },
  { id: 3, short: '3 Debris', label: 'Dodge Debris' },
  { id: 4, short: '4 Speed', label: 'Match Speed' },
  { id: 5, short: '5 Arm', label: 'Robotic Arm' },
];
