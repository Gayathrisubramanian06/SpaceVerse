import type { StoryVisualKind } from '../components/BadgesSVG';

export interface StoryChoice {
  label: string;
  effectText: string;
}

export interface StoryChapter {
  chapterTitle: string;
  visual: StoryVisualKind;
  badgeText: string;
  body: string;
  tip: string;
}

export interface StoryTransition {
  id: 'intro' | `level_${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8}`;
  speaker: string;
  uiTrigger: string;
  transmissionText: string;
  chapters: StoryChapter[];
  choices: [StoryChoice, StoryChoice];
}

export const storyTransitions: StoryTransition[] = [
  {
    id: 'intro',
    speaker: 'Director Vance — Mission Operations',
    uiTrigger: 'Launchpad Cleared',
    transmissionText:
      'Welcome to the Mission Design Lab, Commander! Every kilogram and watt is your call.',
    chapters: [
      {
        chapterTitle: 'Welcome to GALAXY-X',
        visual: 'satellite',
        badgeText: 'MISSION LAB',
        body: 'You are now a space engineer at the NASA-style GALAXY-X Research Center.',
        tip: 'Walk through real labs and test every spacecraft before launch.',
      },
      {
        chapterTitle: 'Build & Test Smart',
        visual: 'rocket',
        badgeText: 'ENGINEERING RULE',
        body: 'Every part adds weight and uses power. Smart balance gets your rocket to space!',
        tip: 'Watch your mass, battery, and thermal limits carefully.',
      },
    ],
    choices: [
      {
        label: 'Check the flight rules. Launchpad is open!',
        effectText: 'Lab Bonus: +500 Starting Grant Credits & Command HUD cleared.',
      },
      {
        label: 'Run a full systems check before building.',
        effectText: 'Engineer Tip: Always balance payload weight against rocket thrust.',
      },
    ],
  },
  {
    id: 'level_1',
    speaker: 'Chief Engineer Maya — Assembly Bay',
    uiTrigger: 'Inspect Satellite Core',
    transmissionText: 'Build your 9-part observation satellite cleanly in the SAH cleanroom.',
    chapters: [
      {
        chapterTitle: 'Chapter 1: A New Mission',
        visual: 'satellite',
        badgeText: 'SAH CLEANROOM',
        body: 'Earth needs a new satellite to watch weather and oceans from space.',
        tip: 'A satellite cannot fly without all 9 core systems working together.',
      },
      {
        chapterTitle: 'Chapter 2: Put Every Part in Place',
        visual: 'satellite',
        badgeText: '9 SUBSYSTEMS',
        body: 'Solar wings make power, batteries save it, and antennas talk to Earth.',
        tip: 'Drag each numbered part (1 to 9) onto its matching slot on the 3D frame.',
      },
      {
        chapterTitle: 'Chapter 3: Ready for Inspection',
        visual: 'satellite',
        badgeText: 'CLEARANCE',
        body: 'Once all 9 parts snap into place, your satellite earns its flight certificate!',
        tip: 'Click Start Level 1 to enter the cleanroom workbench.',
      },
    ],
    choices: [
      {
        label: 'Prioritize precision bus alignment.',
        effectText: 'Clearance: Satellite assembly unlocks the Launch Control rocket bay.',
      },
      {
        label: 'Verify sensor power ratings.',
        effectText: 'Tip: Hover any module to inspect mass and power draw.',
      },
    ],
  },
  {
    id: 'level_2',
    speaker: 'Director Vance — Launch Control',
    uiTrigger: 'Arm Launch Pad 39X',
    transmissionText: 'Stack the 10-part rocket, stage on Pad 39X, seal the fairing, and launch!',
    chapters: [
      {
        chapterTitle: 'Chapter 1: Time to Lift Off',
        visual: 'rocket',
        badgeText: 'LAUNCH CONTROL',
        body: 'Your satellite is built—now it needs a powerful two-stage rocket to reach space.',
        tip: 'Stage 1 lifts the rocket off Earth; Stage 2 pushes into orbit.',
      },
      {
        chapterTitle: 'Chapter 2: Pad 39X & Payload',
        visual: 'rocket',
        badgeText: 'PAD STAGING',
        body: 'Stack all 10 rocket modules, roll to Pad 39X, and lock your satellite inside the nose cone.',
        tip: 'The fairing shields your satellite from air friction during liftoff.',
      },
      {
        chapterTitle: 'Chapter 3: Ignition Countdown',
        visual: 'rocket',
        badgeText: '3-2-1 LIFTOFF',
        body: 'Trigger the acoustic deluge and launch your rocket past the atmosphere!',
        tip: 'Follow stages 1 to 4 in order inside the Rocket Launch Lab.',
      },
    ],
    choices: [
      {
        label: 'Begin 10-stage rocket stacking.',
        effectText: 'Propulsion Check: Fairing seals automatically after payload lock.',
      },
      {
        label: 'Test hold-down clamp telemetry.',
        effectText: 'Launchpad Ready: Acoustic deluge & countdown armed.',
      },
    ],
  },
  {
    id: 'level_3',
    speaker: 'Dr. Aris — Ground Station Power',
    uiTrigger: 'Calibrate Eclipse Reserves',
    transmissionText: 'Half of every orbit crosses Earth’s dark shadow. Keep the battery above 0%!',
    chapters: [
      {
        chapterTitle: 'Chapter 1: Sunlight & Shadow',
        visual: 'orbit',
        badgeText: 'DAY & NIGHT ORBIT',
        body: 'As your satellite circles Earth, it enters Earth’s dark shadow where solar power drops to 0 W.',
        tip: 'In sunlight, extra solar power recharges your battery.',
      },
      {
        chapterTitle: 'Chapter 2: Size Panels & Battery',
        visual: 'orbit',
        badgeText: 'POWER BUDGET',
        body: 'Pick the right solar panel size (W) and battery capacity (Wh) so power never runs out.',
        tip: 'Satellite electronics always use 110 W—even in the dark!',
      },
      {
        chapterTitle: 'Chapter 3: Survive the Eclipse',
        visual: 'orbit',
        badgeText: 'ORBIT INSERTION',
        body: 'Drag your satellite onto the glowing cyan orbit path and survive one full shadow pass.',
        tip: 'Click Start Level 3 to open the space power simulator.',
      },
    ],
    choices: [
      {
        label: 'Balance solar wattage & battery Wh.',
        effectText: 'Engineering Tip: Sunlight charges excess (Solar − 110 W Load).',
      },
      {
        label: 'Monitor eclipse shadow entry.',
        effectText: 'Objective: Enter Earth shadow and survive until sunrise.',
      },
    ],
  },
  {
    id: 'level_4',
    speaker: 'Chief Engineer Maya — Environmental Test Lab',
    uiTrigger: 'Arm Shake & Cryo Tests',
    transmissionText: 'Protect your 400 kg satellite for launch shaking and freezing space—stay under 500 kg!',
    chapters: [
      {
        chapterTitle: 'Chapter 1: Two Harsh Tests',
        visual: 'shake_freeze',
        badgeText: 'MPR TEST LAB',
        body: 'Rockets shake violently at liftoff, and deep space drops to freezing temperatures.',
        tip: 'Your communications satellite must pass BOTH the Shaker Table and Freezer Room tests.',
      },
      {
        chapterTitle: 'Chapter 2: The 100 kg Limit',
        visual: 'shake_freeze',
        badgeText: '400 → 500 KG MAX',
        body: 'Your satellite weighs 400 kg and can carry at most 100 kg of armor, mounts, blankets, and heaters.',
        tip: 'Adding every part weighs 505 kg—choose smart combinations under 500 kg!',
      },
      {
        chapterTitle: 'Chapter 3: Shake, Freeze & Qualify',
        visual: 'shake_freeze',
        badgeText: '5-STAGE MISSION',
        body: 'Drag protection onto the satellite, run the Shaker & Freezer tests, and qualify for space!',
        tip: 'Both thermal insulation AND a heater help survive -80°C cryo conditions.',
      },
    ],
    choices: [
      {
        label: 'Prioritize vibration mounts + thermal blanket.',
        effectText: 'Balance Hint: Mounts (+35) & frame (+25) give high safety for low weight!',
      },
      {
        label: 'Monitor heater watts & cryo temp.',
        effectText: 'Thermal Hint: Insulation slows cooling so heaters keep electronics above -20°C.',
      },
    ],
  },
  {
    id: 'level_5',
    speaker: 'Director Vance — Propulsion & Navigation Lab',
    uiTrigger: 'Enter Propulsion & Navigation Lab',
    transmissionText:
      'The Moon is 238,000 miles away. Balance your probe’s fuel mass so it reaches the Moon without exceeding the 175 kg rocket lift limit!',
    chapters: [
      {
        chapterTitle: 'Chapter 1: Every Kilogram Matters',
        visual: 'lunar',
        badgeText: 'PROPULSION & NAVIGATION LAB',
        body: 'Too little fuel causes your lunar probe to miss the Moon into deep space. Too much fuel makes the rocket too heavy to lift off the pad.',
        tip: 'Dry spacecraft mass is 100 kg, and your rocket lift limit is 175 kg.',
      },
      {
        chapterTitle: 'Chapter 2: Fuel Adds Mass',
        visual: 'lunar',
        badgeText: 'FUEL MATH',
        body: 'Total Spacecraft Mass = Dry Mass (100 kg) + Fuel Mass. Payload Margin = Lift Limit (175 kg) − Total Spacecraft Mass.',
        tip: 'Find the optimal balance between 45 kg and 65 kg inside the Propulsion & Navigation Lab.',
      },
      {
        chapterTitle: 'Chapter 3: Lunar Flyby Simulation',
        visual: 'rocket',
        badgeText: 'FLYBY MISSION',
        body: 'Confirm your optimal fuel configuration and launch the probe through a full countdown, liftoff, stage separation, and lunar flyby pass!',
        tip: 'Enter the Propulsion & Navigation Lab (PNL) to unlock the Propulsion Upgrade & Propulsion Engineer badge.',
      },
    ],
    choices: [
      {
        label: 'Balance fuel for optimal Delta-V & lift margin.',
        effectText: 'Engineering Tip: Optimal lunar transfer range is 45–65 kg.',
      },
      {
        label: 'Inspect probe blueprint & trajectory.',
        effectText: 'Flight Readiness: Complete the flyby to earn ★ 1,000 Star Credits.',
      },
    ],
  },
  {
    id: 'level_6',
    speaker: 'Director Vance — Europa Cryo Command',
    uiTrigger: 'Enter Europa Probe Lab',
    transmissionText: 'Build a probe. Land on Europa. Discover its hidden temperatures. Send your findings to Earth!',
    chapters: [
      {
        chapterTitle: 'Chapter 1: Mission to Europa',
        visual: 'europa',
        badgeText: '12-MIN COUNTDOWN',
        body: 'Build a cryogenic thermometer probe under 120 kg and 850 Star Credits.',
        tip: 'Experiment with parts to inspect weight, power, thermal, and signal impacts.',
      },
      {
        chapterTitle: 'Chapter 2: Calibrate & Launch',
        visual: 'rocket',
        badgeText: 'CALIBRATE & LAUNCH',
        body: 'Calibrate your sensor across 3 cold experiments, then assemble and launch your rocket.',
        tip: 'Complete landing challenges to touch down safely on Europa.',
      },
      {
        chapterTitle: 'Chapter 3: Explore & Transmit',
        visual: 'europa',
        badgeText: '5 EUROPA SITES',
        body: 'Measure temperatures at 5 Europa regions and transmit all 5 packets home to Earth.',
        tip: 'Reward: ★ 1,500 SC, 150 XP & Thermal Telemetry Specialist Badge!',
      },
    ],
    choices: [
      {
        label: 'Test probe balance & cryo shielding.',
        effectText: 'Discovery Mode: Test parts freely before launch.',
      },
      {
        label: 'Focus on signal link & 5-site scan.',
        effectText: 'Mission Goal: Transmit all 5 readings before 12:00 expires.',
      },
    ],
  },
  {
    id: 'level_7',
    speaker: 'Director Vance — Lunar Polar Command',
    uiTrigger: 'Enter Lunar Water Lab',
    transmissionText:
      'Scientists suspect water ice is hidden inside the Moon’s dark craters. Design your spacecraft, reach the Moon, and discover the evidence!',
    chapters: [
      {
        chapterTitle: 'Chapter 1: Dark Craters of the South Pole',
        visual: 'lunar',
        badgeText: '10-MIN EXPEDITION',
        body: 'Permanently shadowed polar craters may trap ancient water ice far below freezing.',
        tip: 'Design your spacecraft, test fuel vs. rocket lift, and steer cleanly to lunar orbit.',
      },
      {
        chapterTitle: 'Chapter 2: Scan & Transmit Discovery',
        visual: 'rocket',
        badgeText: 'DISCOVERY MODE',
        body: 'Scan south pole craters to gather hydrogen and radar ice evidence, then send findings to Earth!',
        tip: 'Reward: ★ 1,500 SC, 200 XP & Lunar Water Explorer Badge!',
      },
    ],
    choices: [
      {
        label: 'Equip subsurface ice sensors & balance fuel.',
        effectText: 'Discovery Hint: Check mass vs. lift capability in the Fuel Lab before launch.',
      },
      {
        label: 'Focus on precision navigation & crater scans.',
        effectText: 'Science Goal: Collect high-confidence crater scans and transmit to Earth.',
      },
    ],
  },
  {
    id: 'level_8',
    speaker: 'Director Vance — Emergency EVA Command',
    uiTrigger: 'Launch Astronaut Rescue',
    transmissionText:
      'An astronaut has disconnected from the ISS during a spacewalk! Locate the signal, fly through debris, match speed, and capture them safely.',
    chapters: [
      {
        chapterTitle: 'Chapter 1: Astronaut Adrift',
        visual: 'constellation',
        badgeText: '4-MIN EMERGENCY',
        body: 'Oxygen is limited! Scan radar for the life-sign beacon and stabilize emergency radio contact.',
        tip: 'Complete all 5 stages before oxygen, hull, or the emergency timer runs out.',
      },
      {
        chapterTitle: 'Chapter 2: Rendezvous & Capture',
        visual: 'satellite',
        badgeText: 'FINAL RESCUE',
        body: 'Steer around orbital debris, match your spacecraft relative velocity to zero, and deploy the robotic arm.',
        tip: 'Reward: ★ 1,000 SC & SPACE RESCUE HERO Badge!',
      },
    ],
    choices: [
      {
        label: 'Lock radar & calibrate comms immediately.',
        effectText: 'Flight Tip: Keep your spacecraft aligned smoothly to preserve hull & O₂.',
      },
      {
        label: 'Prepare robotic grapple approach.',
        effectText: 'Rendezvous Tip: Zero out relative speed before opening the grapple.',
      },
    ],
  },
];

