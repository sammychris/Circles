// Built once from docs/design/tokens.json. Components import from here, never raw values.

export const night = {
  bgDeep: '#17100D',
  bg: '#1F1814',
  surface: '#27201B',
  raised: '#322A25',
  line: '#453C36',
  divider: '#322A25',
  seatEmpty: '#5F564F',
  disabled: '#90857A',
  textMeta: '#AEA498',
  textSoft: '#CDC3B7',
  text: '#F5EFE5',
  selectedBorder: '#F5EFE5',
  ember: '#F4A14E',
  onEmber: '#20140E',
  emberText: '#F9BC6C',
  emberSoft: '#4A2B1C',
  emberTint: '#362017',
  live: '#54C99A',
  liveSoft: '#1A322A',
  danger: '#F0786A',
  dangerSoft: '#371C1B',
  helpIcon: '#F2B39A',
  scrim: 'rgba(15, 10, 8, 0.64)',
} as const;

export const day = {
  bg: '#F9F6F1',
  surface: '#FFFFFF',
  raised: '#EFE9E1',
  line: '#DAD2C8',
  divider: '#E8E1D9',
  seatEmpty: '#C2B8AD',
  disabled: '#988E86',
  textMeta: '#70655C',
  textSoft: '#5B5048',
  text: '#261D17',
  selectedBorder: '#261D17',
  ember: '#F4A14E',
  onEmber: '#20140E',
  emberText: '#9C4B1C',
  emberSoft: '#FBE7D0',
  emberTint: '#FBE7D0',
  live: '#14714C',
  liveSoft: '#DAF1E8',
  danger: '#B4362D',
  dangerSoft: '#FAE7E5',
  helpIcon: '#9C4B1C',
  scrim: 'rgba(38, 29, 23, 0.45)',
} as const;

export type Colors = { [K in keyof typeof night]: string };

export const avatarTints = [
  { bg: '#3B2722', fg: '#F2B39A' },
  { bg: '#1A322A', fg: '#8FD6B4' },
  { bg: '#212B3B', fg: '#A9C4EA' },
  { bg: '#392F23', fg: '#E3C893' },
  { bg: '#352230', fg: '#E6AFD2' },
  { bg: '#2C2D22', fg: '#CFD38E' },
] as const;

export const fonts = {
  regular: 'Nunito_400Regular',
  bold: 'Nunito_700Bold',
  extraBold: 'Nunito_800ExtraBold',
} as const;

export const type = {
  display: { fontSize: 30, lineHeight: 34, fontFamily: fonts.extraBold, letterSpacing: -0.3 },
  title: { fontSize: 24, lineHeight: 30, fontFamily: fonts.extraBold },
  heading: { fontSize: 18, lineHeight: 24, fontFamily: fonts.extraBold },
  body: { fontSize: 16, lineHeight: 24, fontFamily: fonts.regular },
  bodyStrong: { fontSize: 16, lineHeight: 22, fontFamily: fonts.bold },
  meta: { fontSize: 14, lineHeight: 20, fontFamily: fonts.regular },
  metaStrong: { fontSize: 14, lineHeight: 20, fontFamily: fonts.bold },
  tiny: { fontSize: 12, lineHeight: 16, fontFamily: fonts.bold },
  button: { fontSize: 18, lineHeight: 24, fontFamily: fonts.extraBold },
  // The one 48 px size: the big word at the centre of a game card (design direction › Typography).
  giant: { fontSize: 48, lineHeight: 52, fontFamily: fonts.extraBold },
} as const;

export const space = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 24, 6: 32, 7: 48, gutter: 24 } as const;

export const radius = { small: 12, card: 20, sheet: 28, pill: 999 } as const;

export const size = {
  minTarget: 44,
  buttonPrimary: 56,
  buttonSecondary: 44,
  micControl: 64,
  iconButton: 44,
  avatarRoom: 64,
  avatarBadge: 24,
  roomRing: 248,
  // Rooms of 7 to 10: a wider ring with smaller avatars (design direction › The room circle).
  roomRingLarge: 280,
  avatarSeatSmall: 48,
  maxSeats: 10,
  input: 56,
  tableAction: 48,
  moodTile: 104,
  rowAction: 96,
  doorTile: 120,
  tileIconBox: 40,
  supportLine: 80,
  chip: 32,
  countdownRing: 128,
  countdownStroke: 6,
  avatarList: 44,
  sheetList: 320,
  switchWidth: 52,
  switchHeight: 32,
  welcomeRing: 168,
  avatarWelcome: 48,
  icon: 24,
  iconBadge: 12,
  iconButton20: 20,
  iconMeta: 16,
  iconStroke: 2,
} as const;

export const border = { hairline: 1, input: 2, selected: 2, seatRing: 2 } as const;

export const motion = { fast: 150, base: 250, slow: 350, breathe: 900 } as const;

export const opacity = { pressed: 0.92, disabled: 0.5, glowLow: 0.6 } as const;

// The soft ember lamp in the middle of the room, as fractions of the ring.
export const roomGlowScale = { edge: 1.4, core: 1.2 } as const;

// The lift under the one primary action (Join the room, You're muted).
export const lift = { radius: 24, offset: 8, elevation: 8 } as const;

// From docs/design/tokens.json › rules.
export const rules = { maxTextScale: 1.3, roomMinPeople: 3, roomDropWaitSeconds: 120 } as const;

export const effects = {
  liveGlow: 'rgba(84, 201, 154, 0.25)',
  emberGlow: 'rgba(244, 161, 78, 0.22)',
  roomGlow: 'rgba(244, 161, 78, 0.20)',
  roomGlowEdge: 'rgba(244, 161, 78, 0.06)',
  // Design direction › The table slot: 0 0 48px 8px rgba(244,161,78,0.10), for the web.
  tableGlowWeb: '0 0 48px 8px rgba(244, 161, 78, 0.10)',
} as const;

// The ring around whoever is speaking: a gap in the background colour, then a ring, then a soft glow.
export const speaking = { gap: 4, ring: 3, glow: 14, glowStrength: 2.5 } as const;

export const sheetHandle = { width: 40, height: 4 } as const;

// docs/design/tokens.json › color.mood (night). Only for small mood icons and mood chips.
export const moodColors = {
  down: { fg: '#94B7E6', bg: '#212B3B' },
  bored: { fg: '#D7BC8E', bg: '#392F23' },
  laugh: { fg: '#F3D05E', bg: '#39311D' },
  advice: { fg: '#92C99F', bg: '#233427' },
} as const;

// The tinted icon squares on Home's door tiles (docs/screens/01-home.png): laugh yellow, sky blue, sage, rose.
export const doorColors = {
  play: moodColors.laugh,
  talk: moodColors.down,
  learn: moodColors.advice,
  people: { fg: '#E6AFD2', bg: '#352230' },
} as const;

// Ludo teams: always with a name and an icon, never colour alone (play.md › Pick teams).
export const teamColors = {
  sun: moodColors.laugh,
  sky: moodColors.down,
} as const;

export const ludo = { board: 280, token: 14, baseToken: 20, die: 56, pip: 10 } as const;

// shadow.roomGlow as gradient stops (radial: 20% → 6% at 45% → 0 at 70%).
export const glowStops = Object.assign(
  [
    { offset: '0%', opacity: 0.2 },
    { offset: '45%', opacity: 0.06 },
    { offset: '70%', opacity: 0 },
  ],
  { color: night.ember },
);

// The table card: lifted like a sheet, with a faint ember glow, "lit by the lamp" (design direction › The table slot).
export const tableCard = { shadowRadius: 48, shadowOpacity: 0.1, elevation: 6 } as const;

// Shapes of things on the table: a video, a photo, and a phone's shared screen (portrait).
export const media = { video: 16 / 9, photo: 4 / 3, screen: 3 / 4 } as const;
