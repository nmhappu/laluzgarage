/**
 * Per-row hue for a Settings icon tile (SettingsTone in SettingsParts.kt): a deep tinted tile with a
 * bright icon in dark theme, a pale tile with a deep icon in light. The one place raw colours are
 * allowed outside the tokens.
 */
export type SettingsTone = 'theme' | 'team' | 'stats' | 'whatsapp' | 'logout';

const TONES: Record<SettingsTone, { dark: [string, string]; light: [string, string] }> = {
  theme: { dark: ['#2A1F45', '#C4B5FD'], light: ['#EDE9FE', '#6D28D9'] },
  team: { dark: ['#172A4D', '#8AB4FF'], light: ['#DBEAFE', '#1D4ED8'] },
  stats: { dark: ['#123A24', '#33E07D'], light: ['#D2F5DF', '#087A3C'] },
  whatsapp: { dark: ['#0F3A35', '#5EEAD4'], light: ['#CCFBF1', '#0F766E'] },
  logout: { dark: ['#3D161B', '#FF5A67'], light: ['#FFDCE0', '#C4122F'] },
};

export function toneColors(tone: SettingsTone, dark: boolean): { background: string; color: string } {
  const [background, color] = dark ? TONES[tone].dark : TONES[tone].light;
  return { background, color };
}
