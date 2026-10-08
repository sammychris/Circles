import { night, type Colors } from './tokens';

export * from './tokens';

// Night is the default. Day arrives later as a setting; screens already read colours from here.
export function useColors(): Colors {
  return night;
}
