export const HOME_UNIFORM = "빨흰";
export const AWAY_UNIFORM = "스카이";

export const UNIFORM_OPTIONS = [
  { name: HOME_UNIFORM, color: "#e83d4f", swatch: "linear-gradient(135deg, #e83d4f 0 56%, #ffffff 56% 100%)" },
  { name: AWAY_UNIFORM, color: "#1976c9", swatch: "#1976c9" },
] as const;

export const UNIFORM_NAMES = UNIFORM_OPTIONS.map((uniform) => uniform.name);

export function getUniformSwatch(uniform: string) {
  return UNIFORM_OPTIONS.find((option) => option.name === uniform)?.swatch ?? "#888";
}
