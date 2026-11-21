export type TagLocale = "en" | "de"

export const TAG_LOCALES: readonly TagLocale[] = ["en", "de"]

const TAG_TRANSLATIONS: Record<TagLocale, Record<string, string>> = {
  en: {},
  de: {
    "Calories:Light": "Kalorien:Leicht",
    "Calories:Moderate": "Kalorien:Mittel",
    "Calories:Hearty": "Kalorien:Deftig",
    "Calories:Heavy": "Kalorien:Schwer",
    "Digest:Easy": "Verdauung:Leicht",
    "Digest:Moderate": "Verdauung:Mittel",
    "Digest:Slow": "Verdauung:Schwer",
    "Digest:Unknown": "Verdauung:Unbekannt",
  },
}

export function resolveTagLocale(value: string | undefined): TagLocale {
  const normalized = (value || "en").toLowerCase().trim()
  return (TAG_LOCALES as readonly string[]).includes(normalized)
    ? (normalized as TagLocale)
    : "en"
}

export function localizeTag(key: string, locale: TagLocale): string {
  const translations = TAG_TRANSLATIONS[locale]
  return Object.hasOwn(translations, key) ? translations[key] : key
}
