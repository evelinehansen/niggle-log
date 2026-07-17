// taxonomy.js
// The controlled vocabulary: body regions, subsites, sides, the other enums,
// and the glossary text. Data only. If a word appears in a picker or in the
// glossary, it lives here.
//
// Every subsite carries three renderings:
//   label    what the picker shows, plain word first, anatomical term in parentheses
//   short    the plain word used in a resolved site label ("Left knee, front")
//   clinical the anatomical term used in exports and print ("Left knee, anterior")

export const SIDES = { left: "Left", right: "Right", central: "Central" };

export const REGIONS = [
  {
    key: "neck", label: "Neck", sides: ["left", "right", "central"],
    subsites: [
      { key: "posterior", label: "Back of the neck (posterior)", short: "back", clinical: "posterior" },
      { key: "lateral", label: "Side of the neck (lateral)", short: "side", clinical: "lateral" },
      { key: "base", label: "Base of the neck (where it meets the shoulder)", short: "base", clinical: "base of the neck" },
    ],
  },
  {
    key: "shoulder", label: "Shoulder", sides: ["left", "right"],
    subsites: [
      { key: "anterior", label: "Front (anterior)", short: "front", clinical: "anterior" },
      { key: "lateral", label: "Outside (lateral)", short: "outside", clinical: "lateral" },
      { key: "posterior", label: "Back (posterior)", short: "back", clinical: "posterior" },
      { key: "trap", label: "Top (the trapezius ridge)", short: "top", clinical: "trapezius" },
    ],
  },
  {
    key: "chest", label: "Chest", sides: ["left", "right", "central"],
    subsites: [
      { key: "sternum", label: "Breastbone (sternum)", short: "breastbone", clinical: "sternum" },
      { key: "pec", label: "The chest muscle (pectoral)", short: "chest muscle", clinical: "pectoral" },
      { key: "rib", label: "Round the front of the ribs", short: "ribs", clinical: "anterior rib" },
    ],
  },
  {
    key: "elbow", label: "Elbow", sides: ["left", "right"],
    subsites: [
      { key: "lateral", label: "Outside (lateral, the thumb side)", short: "outside", clinical: "lateral" },
      { key: "medial", label: "Inside (medial, the little finger side)", short: "inside", clinical: "medial" },
      { key: "posterior", label: "Point of the elbow (posterior)", short: "point", clinical: "posterior" },
      { key: "anterior", label: "The crease (anterior)", short: "crease", clinical: "anterior" },
    ],
  },
  {
    key: "wrist_hand", label: "Wrist and hand", sides: ["left", "right"],
    subsites: [
      { key: "dorsal", label: "Back of the hand (dorsal)", short: "back of the hand", clinical: "dorsal" },
      { key: "palmar", label: "Palm side (palmar)", short: "palm side", clinical: "palmar" },
      { key: "radial", label: "Thumb side (radial)", short: "thumb side", clinical: "radial" },
      { key: "ulnar", label: "Little finger side (ulnar)", short: "little finger side", clinical: "ulnar" },
      { key: "fingers", label: "Fingers or thumb", short: "fingers", clinical: "fingers" },
    ],
  },
  {
    key: "upper_back", label: "Upper back", sides: ["left", "right", "central"],
    subsites: [
      { key: "interscapular", label: "Between the shoulder blades (interscapular)", short: "between the shoulder blades", clinical: "interscapular" },
      { key: "paraspinal", label: "The ridge beside the spine (paraspinal)", short: "beside the spine", clinical: "paraspinal" },
    ],
  },
  {
    key: "lower_back", label: "Lower back", sides: ["left", "right", "central"],
    subsites: [
      { key: "central", label: "Right on the spine (central)", short: "central", clinical: "midline" },
      { key: "paraspinal", label: "The ridge beside the spine (paraspinal)", short: "beside the spine", clinical: "paraspinal" },
      { key: "si", label: "SI joint (the dimple above the buttock)", short: "SI joint", clinical: "sacroiliac joint" },
      { key: "flank", label: "Round the side (the flank)", short: "flank", clinical: "flank" },
    ],
  },
  {
    key: "hip_groin", label: "Hip and groin", sides: ["left", "right"],
    subsites: [
      { key: "anterior", label: "Front (anterior, the hip flexor crease)", short: "front", clinical: "anterior" },
      { key: "lateral", label: "Outside (lateral, the bony point)", short: "outside", clinical: "lateral" },
      { key: "posterior", label: "Back (posterior, the buttock)", short: "buttock", clinical: "posterior" },
      { key: "groin", label: "Inside (the groin)", short: "groin", clinical: "groin" },
    ],
  },
  {
    key: "thigh", label: "Thigh", sides: ["left", "right"],
    subsites: [
      { key: "anterior", label: "Front (anterior, the quad)", short: "front", clinical: "anterior" },
      { key: "posterior", label: "Back (posterior, the hamstring)", short: "back", clinical: "posterior" },
      { key: "medial", label: "Inside (medial, the adductor)", short: "inside", clinical: "medial" },
      { key: "lateral", label: "Outside (lateral, the IT band line)", short: "outside", clinical: "lateral" },
    ],
  },
  {
    key: "knee", label: "Knee", sides: ["left", "right"],
    subsites: [
      { key: "anterior", label: "Front (anterior, around the kneecap)", short: "front", clinical: "anterior" },
      { key: "medial", label: "Inside (medial)", short: "inside", clinical: "medial" },
      { key: "lateral", label: "Outside (lateral)", short: "outside", clinical: "lateral" },
      { key: "posterior", label: "Back (posterior, the hollow)", short: "back", clinical: "posterior" },
    ],
  },
  {
    key: "lower_leg", label: "Lower leg", sides: ["left", "right"],
    subsites: [
      { key: "anterior", label: "Front (anterior, the shin bone)", short: "shin", clinical: "anterior" },
      { key: "medial", label: "Inside of the shin (medial)", short: "inside of the shin", clinical: "medial" },
      { key: "posterior", label: "Back (posterior, the calf)", short: "calf", clinical: "posterior" },
      { key: "lateral", label: "Outside (lateral)", short: "outside", clinical: "lateral" },
    ],
  },
  {
    key: "achilles", label: "Achilles", sides: ["left", "right"],
    subsites: [
      { key: "mid", label: "Mid tendon (a few centimetres above the heel)", short: "mid tendon", clinical: "mid portion" },
      { key: "insertion", label: "Right at the heel bone (the insertion)", short: "at the heel bone", clinical: "insertional" },
    ],
  },
  {
    key: "ankle", label: "Ankle", sides: ["left", "right"],
    subsites: [
      { key: "anterior", label: "Front (anterior)", short: "front", clinical: "anterior" },
      { key: "medial", label: "Inside (medial)", short: "inside", clinical: "medial" },
      { key: "lateral", label: "Outside (lateral)", short: "outside", clinical: "lateral" },
      { key: "posterior", label: "Back (posterior)", short: "back", clinical: "posterior" },
    ],
  },
  {
    key: "foot", label: "Foot", sides: ["left", "right"],
    subsites: [
      { key: "heel", label: "Underneath the heel", short: "heel", clinical: "plantar heel" },
      { key: "arch", label: "The arch", short: "arch", clinical: "arch" },
      { key: "forefoot", label: "The ball of the foot", short: "ball of the foot", clinical: "forefoot" },
      { key: "toes", label: "Toes", short: "toes", clinical: "toes" },
      { key: "dorsal", label: "Top of the foot (dorsal)", short: "top of the foot", clinical: "dorsal" },
    ],
  },
];

// Severity is behaviourally anchored, deliberately three levels and not ten.
export const SEVERITIES = [
  { value: 1, label: "Noticed", anchor: "You felt it and changed nothing." },
  { value: 2, label: "Adapted", anchor: "You changed something. Shorter session, different technique, favoured the other side, took a painkiller." },
  { value: 3, label: "Stopped", anchor: "It ended or prevented the activity." },
];

export const CONTEXTS = [
  { key: "at_rest", label: "At rest" },
  { key: "during_activity", label: "During activity" },
  { key: "after_activity", label: "After activity" },
  { key: "next_morning", label: "Next morning" },
];

export const SENSATIONS = [
  { key: "ache", label: "Ache" },
  { key: "sharp", label: "Sharp" },
  { key: "tight", label: "Tight" },
  { key: "burning", label: "Burning" },
  { key: "clicking", label: "Clicking" },
  { key: "unstable", label: "Unstable" },
  { key: "numb", label: "Numb" },
];

export const ACTIVITIES = [
  { key: "run", label: "Run" },
  { key: "ride", label: "Ride" },
  { key: "lift", label: "Lift" },
  { key: "swim", label: "Swim" },
  { key: "ball_sport", label: "Ball sport" },
  { key: "other", label: "Other" },
];

export const DURATIONS = [
  { key: "under_30", label: "Under 30 min" },
  { key: "30_60", label: "30 to 60" },
  { key: "60_90", label: "60 to 90" },
  { key: "over_90", label: "Over 90" },
];

export const INTENSITIES = [
  { key: "easy", label: "Easy" },
  { key: "moderate", label: "Moderate" },
  { key: "hard", label: "Hard" },
];

// The glossary. Two sections, rendered as definition lists.
// This is exact UI copy; edit with care.
export const GLOSSARY = {
  anatomy: [
    ["Anterior", "The front of something."],
    ["Posterior", "The back of something."],
    ["Medial", "The inside. The side nearer the middle of your body. Your medial knee faces your other knee."],
    ["Lateral", "The outside. The side further from the middle of your body. Your lateral knee faces the wall."],
    ["Dorsal", "The top of the foot, or the back of the hand."],
    ["Plantar", "The sole of the foot."],
    ["Palmar", "The palm of the hand."],
    ["Radial", "The thumb side of the forearm and wrist."],
    ["Ulnar", "The little finger side of the forearm and wrist."],
    ["Paraspinal", "The two muscular ridges running either side of the spine."],
    ["SI joint", "Sacroiliac joint. Where the pelvis meets the base of the spine, about where the dimples are above the buttocks."],
    ["Insertion", "The point where a tendon attaches to bone. Insertional achilles pain sits right at the heel bone. Mid tendon pain sits a few centimetres higher."],
    ["Trapezius (trap)", "The muscle running from the neck out to the shoulder."],
    ["Interscapular", "Between the shoulder blades."],
    ["Contralateral", "The opposite side of the body. Your contralateral hip is the one on the other side."],
    ["Kinetic chain", "The linked joints that share load. Ankle, knee, hip and lower back work as one chain, which is why a problem in one can show up in another."],
  ],
  tool: [
    ["Niggle", "Something you can feel that has not stopped you. This tool logs niggles. It is not for logging injuries."],
    ["Severity 1 of 3, noticed", "You felt it and changed nothing."],
    ["Severity 2 of 3, adapted", "You changed something. Shorter session, different technique, favoured the other side, took a painkiller."],
    ["Severity 3 of 3, stopped", "It ended or prevented the activity."],
    ["Clear day", "A day you checked and had nothing to report. Clear days are data. They are how this tool tells the difference between no pain and no logging."],
    ["Observed day", "A day with either a niggle or a clear day marker on it."],
    ["Site", "A region, a part of that region, and a side. Left knee front is one site. Right knee front is a different site."],
    ["Escalating", "The worst level logged at a site in the last 7 days is higher than the worst level in the 7 days before that."],
    ["Next morning", "Present when you woke up, before you did anything. Pain that is there before loading behaves differently from pain that arrives at minute 40."],
  ],
};
