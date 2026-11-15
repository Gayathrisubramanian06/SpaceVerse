export interface HandbookPartEntry {
  name: string;
  meaning: string;
}

export interface HandbookTroubleshootingItem {
  stuck: string;
  fix: string;
}

export interface HandbookQuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface HandbookLevelSection {
  level: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  code: string;
  title: string;
  tocDescription: string;
  tier: 'EASY' | 'MEDIUM' | 'HARD';
  icon: string;
  sectorTag: string;
  leftPage: number;
  rightPage: number;
  diagramCaption: string;

  whatYouDo: string;
  bigIdeaTitle: string;
  bigIdeaText: string;
  parts: HandbookPartEntry[];
  howToWin: string[];
  cheatNote: string;
  troubleshooting: HandbookTroubleshootingItem[];
  quiz: HandbookQuizQuestion;
}

export const HANDBOOK_LEVELS: HandbookLevelSection[] = [
  {
    level: 1,
    code: 'LEVEL 01',
    title: 'Satellite Assembly',
    tocDescription: 'Snap a satellite together and learn what each part does.',
    tier: 'EASY',
    icon: '🛰️',
    sectorTag: 'SAH · Cleanroom Bay',
    leftPage: 3,
    rightPage: 4,
    diagramCaption: 'Fig 1.1 — Main satellite parts attached around the central frame.',
    whatYouDo:
      'Build a working Earth-watching satellite by attaching all 9 parts onto the frame inside the Cleanroom Bay.',
    bigIdeaTitle: 'A satellite works like a human body',
    bigIdeaText:
      'The frame is the skeleton, the computer is the brain, solar panels and batteries make and store energy, the camera is the eyes, and the dish is the voice sending telemetry (health data) home.',
    parts: [
      { name: 'Bus Frame', meaning: 'Holds all parts together through launch.' },
      { name: 'Solar & Battery', meaning: 'Sun makes power; battery works in the dark.' },
      { name: 'Dish & Computer', meaning: 'Runs the craft and radios data to Earth.' },
      { name: 'ADCS & Foil', meaning: 'Wheels aim the camera; foil blocks heat and cold.' },
    ],
    howToWin: [
      'Click or drag each of the 9 parts onto its glowing ring.',
      'Drag the 3D satellite around to find any open slots on the back.',
      'Finish all 9/9 parts to unlock Level 02.',
    ],
    cheatNote: 'Tip: Clicking a part card makes its matching ring glow brighter.',
    troubleshooting: [
      {
        stuck: 'Part won’t snap in',
        fix: 'Each ring fits one exact part—match the highlighted slot.',
      },
      {
        stuck: 'Missing 1 or 2 parts',
        fix: 'Spin the 3D satellite around to check the rear side.',
      },
    ],
    quiz: {
      id: 'l1-q1',
      question: 'Which part keeps a satellite’s camera aimed steadily at Earth?',
      options: ['Thermal Foil', 'ADCS Attitude Control', 'Battery Pack'],
      correctIndex: 1,
      explanation: 'ADCS uses sensors and spinning wheels to point the satellite accurately.',
    },
  },
  {
    level: 2,
    code: 'LEVEL 02',
    title: 'Rocket Assembly',
    tocDescription: 'See how rockets stack stages to carry satellites to orbit.',
    tier: 'EASY',
    icon: '🚀',
    sectorTag: 'LCC · Pad 39X',
    leftPage: 5,
    rightPage: 6,
    diagramCaption: 'Fig 2.1 — Stage 1 drops away empty so light Stage 2 reaches orbit.',
    whatYouDo:
      'Build a 10-part two-stage rocket, pass Pad 39X checks, close the nose cone over your satellite, and launch.',
    bigIdeaTitle: 'Drop the empty backpack halfway up',
    bigIdeaText:
      'Once Stage 1 burns all its fuel, its giant empty tanks are dead weight. Dropping Stage 1 mid-flight lets the smaller Stage 2 accelerate easily to orbital speed (~7.8 km/s).',
    parts: [
      { name: 'Stage 1 Booster', meaning: 'Big tanks & engines that lift off Earth.' },
      { name: 'Interstage Collar', meaning: 'Connects and releases Stage 1 from Stage 2.' },
      { name: 'Stage 2 Upper Stage', meaning: 'Light stage that finishes the push to orbit.' },
      { name: 'Payload Fairing', meaning: 'Nose cone shielding the satellite from wind.' },
    ],
    howToWin: [
      'Snap all 10 rocket parts into the vertical stack.',
      'Complete Pad 39X staging and close the Payload Fairing.',
      'Hit Launch and ride through stage separation to orbit!',
    ],
    cheatNote: 'Key rule: Rockets reach orbit by flying super fast sideways (~28,000 km/h), not just straight up.',
    troubleshooting: [
      {
        stuck: 'Launch stays locked',
        fix: 'Check the 3 earlier steps (Assembly, Pad 39X, Fairing) at the top.',
      },
      {
        stuck: 'Can’t add nose cone early',
        fix: 'The Payload Fairing closes during Stage 3 after the satellite mounts.',
      },
    ],
    quiz: {
      id: 'l2-q1',
      question: 'Why do rockets drop their first stage during flight?',
      options: [
        'To shed heavy empty tanks so Stage 2 accelerates faster',
        'Because fuel freezes in the bottom tank',
        'To slow the rocket down',
      ],
      correctIndex: 0,
      explanation: 'Dropping dead mass lets the upper stage reach orbit with far less fuel.',
    },
  },
  {
    level: 3,
    code: 'LEVEL 03',
    title: 'Orbit Insertion',
    tocDescription: 'Balance solar power and battery size to survive Earth’s shadow.',
    tier: 'EASY',
    icon: '🌍',
    sectorTag: 'GSC · Orbit & Power',
    leftPage: 7,
    rightPage: 8,
    diagramCaption: 'Fig 3.1 — Sunlit half recharges batteries; shadow half drains them.',
    whatYouDo:
      'Pick solar panel power and a battery pack big enough so your orbiting satellite never runs out of power in Earth’s night shadow.',
    bigIdeaTitle: 'Orbiting is falling forward and missing Earth',
    bigIdeaText:
      'In Low Earth Orbit (LEO), satellites fly so fast sideways (~7.8 km/s) that Earth curves away under them. They cross Earth’s dark shadow every ~90 minutes, unlike distant GEO satellites (35,786 km) that hover over one spot.',
    parts: [
      { name: 'LEO (~400 km)', meaning: 'Fast 90-minute laps with frequent dark eclipses.' },
      { name: 'GEO (35,786 km)', meaning: '24-hour orbit parked over one Earth spot.' },
      { name: 'Solar Array (W)', meaning: 'Needs >110 W to recharge after shadow.' },
      { name: 'Battery (Wh)', meaning: 'Needs ≥500 Wh to cover the ~358 Wh shadow.' },
    ],
    howToWin: [
      'Open Spacecraft Configuration in Ground Station.',
      'Set Solar Wing power comfortably above 110 W (try 190–240 W).',
      'Pick Medium (500 Wh) or Large (800 Wh) battery and run the orbit.',
    ],
    cheatNote: 'Watch out: Setting solar to exactly 110 W leaves zero extra watts to refill the battery!',
    troubleshooting: [
      {
        stuck: 'Power dies inside shadow',
        fix: 'Upgrade from Small Battery to Medium (500 Wh) or Large (800 Wh).',
      },
      {
        stuck: 'Battery drops lower each lap',
        fix: 'Slide Solar Wing Wattage higher so sunlight refills it fast.',
      },
    ],
    quiz: {
      id: 'l3-q1',
      question: 'If Earth’s shadow uses 358 Wh of energy, which battery keeps the craft alive?',
      options: ['200 Wh', '300 Wh', '500 Wh (Medium)'],
      correctIndex: 2,
      explanation: 'Stored energy must be higher than 358 Wh so the battery never hits 0%.',
    },
  },
  {
    level: 4,
    code: 'LEVEL 04',
    title: 'Protection Systems',
    tocDescription: 'Survive rocket shaking and -80°C space cold under 500 kg.',
    tier: 'MEDIUM',
    icon: '🛡️',
    sectorTag: 'MPR · Test Lab',
    leftPage: 9,
    rightPage: 10,
    diagramCaption: 'Fig 4.1 — Satellite must survive Shaker + Cryo Freezer under 500 kg.',
    whatYouDo:
      'Protect a 400 kg satellite against violent launch shaking and -80°C cold without going over the 500 kg rocket weight cap.',
    bigIdeaTitle: 'Survive an earthquake and a deep freeze on a weight budget',
    bigIdeaText:
      'Foam mounts absorb engine rattle, foil blankets trap heat like a winter coat, and a heater supplies warmth. Because you only have 100 kg of weight left, light smart parts beat heavy armor.',
    parts: [
      { name: 'Vibration Mounts (15 kg)', meaning: 'Best shake protection (+35) for tiny weight.' },
      { name: 'Reinforcement (20 kg)', meaning: 'Adds +25 shake to easily pass the 70 goal.' },
      { name: 'Heavy Armor (40 kg)', meaning: 'Too heavy (+15 shake) — avoid this trap!' },
      { name: 'Insulation + Heater', meaning: 'Foil (10 kg) + Heater keep inside ≥ -20°C.' },
    ],
    howToWin: [
      'Pick Vibration Mounts + Reinforcement (hits ≥ 70 shake score).',
      'Add Thermal Insulation + Large Heater while staying ≤ 500 kg.',
      'Pass both the Shaker Test and the 60s Freezer Test.',
    ],
    cheatNote: 'Best combo: Mounts + Reinforcement + Insulation + Large Heater = 460 kg total!',
    troubleshooting: [
      {
        stuck: 'Shaker Test fails with Mounts',
        fix: 'Base (30) + Mounts (35) = 65; add Reinforcement (+25) to reach 90.',
      },
      {
        stuck: 'Too cold in Freezer Test',
        fix: 'Make sure BOTH Thermal Insulation and a Heater are installed.',
      },
    ],
    quiz: {
      id: 'l4-q1',
      question: 'Why does Thermal Insulation alone fail in -80°C space without a heater?',
      options: [
        'Insulation slows heat loss down, but cannot create warmth itself',
        'Foil attracts cold air',
        'Heaters make rockets lighter',
      ],
      correctIndex: 0,
      explanation: 'A coat traps heat, and a heater provides the heat to trap.',
    },
  },
  {
    level: 5,
    code: 'LEVEL 05',
    title: 'Lunar Flyby',
    tocDescription: 'Find the sweet-spot fuel load to loop around the Moon.',
    tier: 'MEDIUM',
    icon: '🌙',
    sectorTag: 'PNL · Navigation Lab',
    leftPage: 11,
    rightPage: 12,
    diagramCaption: 'Fig 5.1 — Only 45–65 kg of fuel reaches the Moon and loops cleanly back.',
    whatYouDo:
      'Choose the right fuel mass inside the Propulsion Lab so your probe reaches the Moon (384,400 km away), swings behind it, and returns.',
    bigIdeaTitle: 'More fuel also makes the rocket heavier',
    bigIdeaText:
      'Too little fuel runs out halfway to the Moon. Too much fuel makes the rocket so heavy its engines can’t lift off cleanly. Engineers hunt for the sweet spot where push beats weight.',
    parts: [
      { name: 'Fuel Mass (kg)', meaning: 'Must sit between 45 kg and 65 kg.' },
      { name: 'Main Thruster', meaning: 'Pushes the craft onto a Moon-bound path.' },
      { name: 'Mid-Course Burn', meaning: 'Tiny steering nudges mid-trip to stay on line.' },
      { name: 'Free-Return Arc', meaning: 'Moon’s gravity bends the path safely home.' },
    ],
    howToWin: [
      'Slide Propellant Mass into the 45–65 kg green zone (55 kg is dead center).',
      'Watch the preview curve wrap smoothly around the Moon.',
      'Click Launch Lunar Flyby to clear Medium Tier!',
    ],
    cheatNote: 'Physics rule: Acceleration = Thrust ÷ Total Mass.',
    troubleshooting: [
      {
        stuck: 'Craft falls short of the Moon',
        fix: 'Fuel was under 45 kg—raise the slider toward 55 kg.',
      },
      {
        stuck: 'Failed even with max fuel',
        fix: 'Over 65 kg is too heavy—dial fuel back down to 50–60 kg.',
      },
    ],
    quiz: {
      id: 'l5-q1',
      question: 'Why does loading 100% maximum fuel fail the Lunar Flyby?',
      options: [
        'Extra fuel makes the rocket too heavy for its engines to accelerate',
        'Fuel evaporates on the pad',
        'The Moon pushes heavy rockets away',
      ],
      correctIndex: 0,
      explanation: 'Adding too much propellant adds more weight than the engine can accelerate.',
    },
  },
  {
    level: 6,
    code: 'LEVEL 06',
    title: 'Europa Probe',
    tocDescription: 'Survive Jupiter’s deep cold and weak sunlight on icy Europa.',
    tier: 'HARD',
    icon: '🧊',
    sectorTag: 'GSC · Deep Space',
    leftPage: 13,
    rightPage: 14,
    diagramCaption: 'Fig 6.1 — At Jupiter (5.2× farther), sunlight is 27× weaker and radio lags ~40 min.',
    whatYouDo:
      'Build a light, cold-proof probe (≤ 120 kg, ≤ 850 SC), calibrate its thermometer, land on Europa, and explore 4 ice sites before 12:00 ends.',
    bigIdeaTitle: 'Far from the Sun, light gets dim and radios lag',
    bigIdeaText:
      'Step 5× farther from a campfire and warmth drops ~25×! At Europa, sunlight is 27× weaker—so probes rely on nuclear heat power (RTGs) or cold batteries, plus focused Dish Antennas.',
    parts: [
      { name: 'Aerogel Hull & Ice-Grip Legs', meaning: 'Lightest cold shell (44 kg) & grip (14 kg).' },
      { name: 'Cryo-RTD Thermometer', meaning: 'Stays accurate at -170°C.' },
      { name: 'Cold Battery / RTG Power', meaning: 'Runs without strong sunlight.' },
      { name: 'High-Gain Dish', meaning: 'Sends data across 600+ million km to Earth.' },
    ],
    howToWin: [
      'Pick 6 parts staying ≤ 120 kg and ≤ 850 SC with zero red warnings.',
      'Calibrate the thermometer, launch, and touch down on Europa.',
      'Drive to all 4 surface sites to log readings, then transmit!',
    ],
    cheatNote: 'Tip: Avoid Steel Hull—it breaks the 120 kg weight cap right away.',
    troubleshooting: [
      {
        stuck: 'Overweight or red warning',
        fix: 'Use Aerogel Hull, Ice-Grip Legs, Cryo-RTD Probe & High-Gain Dish.',
      },
      {
        stuck: 'Transmit won’t finish',
        fix: 'Make sure you visited and recorded all 4 ice sites on the map.',
      },
    ],
    quiz: {
      id: 'l6-q1',
      question: 'Why can’t Earth drive a Europa rover live with a joystick?',
      options: [
        'Radio signals take ~35–45 minutes each way at light speed',
        'Europa has no gravity',
        'Joysticks stop working in orbit',
      ],
      correctIndex: 0,
      explanation: 'Even at light speed, commands take ~40 minutes to cross from Earth to Jupiter.',
    },
  },
  {
    level: 7,
    code: 'LEVEL 07',
    title: 'Lunar Water Hunt',
    tocDescription: 'Find buried ice inside dark Moon craters for water and fuel.',
    tier: 'HARD',
    icon: '🌕',
    sectorTag: 'MPR · South Pole ISRU',
    leftPage: 15,
    rightPage: 16,
    diagramCaption: 'Fig 7.1 — Grazing sunlight leaves deep South Pole craters frozen below -160°C.',
    whatYouDo:
      'Build a light polar orbiter (≤ 195 kg, ≤ 1,150 SC), pass the fuel test, scan dark South Pole craters for ice, and transmit ≥ 75% proof within 10:00.',
    bigIdeaTitle: 'Find Moon ice instead of hauling water from Earth',
    bigIdeaText:
      'Deep South Pole craters never see sunlight, keeping water ice frozen in Moon dust (regolith). Turning local ice into drinking water, oxygen, and rocket fuel is called ISRU.',
    parts: [
      { name: 'Cryo-Carbon Frame (26 kg)', meaning: 'Ultralight body saving mass for fuel.' },
      { name: 'Neutron / Cryo-IR Sensor', meaning: 'Detects buried ice in pitch darkness.' },
      { name: 'Balanced Fuel Tank', meaning: 'Must hit GREEN on the Fuel Balance Test.' },
      { name: 'ISRU Concept', meaning: 'Drill Moon ice → water + O₂ air + H₂ fuel.' },
    ],
    howToWin: [
      'Build ≤ 195 kg & ≤ 1,150 SC with Cryo-IR or Neutron Ice-Radar.',
      'Slide Fuel until GREEN, click Run Fuel Balance Test, then launch.',
      'Scan cold dark craters until Evidence ≥ 75%, then transmit 100%!',
    ],
    cheatNote: 'Warning: Normal visible cameras see ZERO ice inside dark shadowed craters!',
    troubleshooting: [
      {
        stuck: 'Scans show almost 0% ice',
        fix: 'Swap Visible Camera for Cryo-IR or Neutron Radar and scan dark craters.',
      },
      {
        stuck: 'Weight > 195 kg or Yellow/Red fuel',
        fix: 'Pick the 26 kg Cryo-Carbon Frame and adjust fuel until GREEN.',
      },
    ],
    quiz: {
      id: 'l7-q1',
      question: 'Why do engineers use Neutron Sensors instead of normal cameras in Moon craters?',
      options: [
        'Neutrons detect hidden hydrogen/water even in total darkness',
        'Normal cameras melt at -160°C',
        'Neutron beams drill the ice',
      ],
      correctIndex: 0,
      explanation: 'Hidden hydrogen inside water molecules slows bouncing cosmic neutrons.',
    },
  },
  {
    level: 8,
    code: 'LEVEL 08',
    title: 'Rescue the Lost Astronaut',
    tocDescription: 'Dodge space junk, match speed, and grapple a stranded astronaut.',
    tier: 'HARD',
    icon: '🧑‍🚀',
    sectorTag: 'MCC · Emergency Ops',
    leftPage: 17,
    rightPage: 18,
    diagramCaption: 'Fig 8.1 — Match relative speed near 0 m/s so the robotic arm grabs safely.',
    whatYouDo:
      'In 04:00 before suit oxygen runs out, find the astronaut on radar, lock radio, dodge debris, match speed, and capture them with the robotic arm.',
    bigIdeaTitle: 'Two cars at the same speed have zero speed between them',
    bigIdeaText:
      'Both you and the astronaut fly around Earth at 27,600 km/h! When you match your relative velocity (speed difference) near 0.0 m/s, the astronaut floats still right beside your robotic arm.',
    parts: [
      { name: 'Radar & Radio Lock', meaning: 'Finds coordinates and tunes to the suit beacon.' },
      { name: 'Cockpit Steering', meaning: 'Dodges debris up/down so Hull stays above 0%.' },
      { name: 'Vernier Thrusters', meaning: 'Fine-tunes speed into the green match band.' },
      { name: 'Robotic Capture Arm', meaning: 'Grabs the astronaut and auto-retracts home.' },
    ],
    howToWin: [
      'Lock Radar coordinates (Phase 1) and Radio frequency (Phase 2).',
      'Steer smoothly past debris (Phase 3) and match speed (Phase 4).',
      'Align and capture with the Robotic Arm—it retracts automatically!',
    ],
    cheatNote: 'Tip: In space there’s no air friction—use short gentle taps in Speed Match.',
    troubleshooting: [
      {
        stuck: 'Taking hits in Debris phase',
        fix: 'Watch the right side of the cockpit window and shift lanes early.',
      },
      {
        stuck: 'Speed Match keeps overshooting',
        fix: 'Stop holding thrust down—use short quick taps near the green bar.',
      },
    ],
    quiz: {
      id: 'l8-q1',
      question: 'If your craft and the astronaut both move at 27,600 km/h side-by-side, what is your relative speed?',
      options: ['55,200 km/h', '0 km/h (0 m/s)', '27,600 km/h'],
      correctIndex: 1,
      explanation: 'Relative velocity is the difference (27,600 − 27,600 = 0), allowing safe capture.',
    },
  },
];
