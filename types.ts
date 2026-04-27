export type SensoryTagType = 'QUIET' | 'LOW_LIGHT' | 'SOCIAL' | 'NATURE' | 'GLARE' | 'ECHO' | 'SMELL';

export interface SensoryTagDef {
  label: string;
  color: string;
  bg: string;
  border: string;
}

export interface SensoryProfile {
  noise: number;
  crowds: number;
  lighting: number;
}

export interface Building {
  id: string;
  name: string;
  code: string;
  coordinates: [number, number];
  category: 'library' | 'sport' | 'social' | 'tech' | 'calm' | 'academic';
  tags: SensoryTagType[];
  sensoryProfile: SensoryProfile;
  description: string;
  features: string[];
  access: string;
  sensoryEntrance?: string;
  bestTime: string;
  popularTimes: number[];
}

export interface MapConfig {
  light: string;
  dark: string;
}