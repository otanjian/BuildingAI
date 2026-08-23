export type OpencodeEmbedColorScheme = "dark" | "light";

type BuildingAITheme = OpencodeEmbedColorScheme | "system";

/** Resolve the parent theme before passing it through the existing iframe element. */
export function resolveOpencodeEmbedColorScheme(
  theme: BuildingAITheme,
  systemPrefersDark: boolean,
): OpencodeEmbedColorScheme {
  if (theme === "system") return systemPrefersDark ? "dark" : "light";
  return theme;
}
