import { debug } from "../debug";

export type AddressInput = {
  fullName?: string;
  line1: string;
  line2?: string | null;
  city: string;
  region?: string | null;
  postalCode: string;
  country: string; // Prefer ISO-2 where possible
  phone?: string | null;
};

export type AddressValidationResult = {
  valid: boolean;
  normalized?: Partial<AddressInput>;
  reason?: "not_found" | "incomplete" | "network" | "provider_error";
};

function getToken() {
  return (
    process.env.MAPBOX_TOKEN ||
    process.env.MAPBOX_ACCESS_TOKEN ||
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN ||
    ""
  );
}

export async function validateAndNormalizeAddress(
  input: AddressInput
): Promise<AddressValidationResult> {
  const token = getToken();
  if (!token) {
    // No provider configured, treat as valid and skip normalization
    return { valid: true };
  }
  try {
    const q = [input.line1, input.city, input.postalCode, input.country]
      .filter(Boolean)
      .join(", ");
    const params = new URLSearchParams();
    params.set("autocomplete", "true");
    params.set("types", "address,place,postcode");
    params.set("access_token", token);
    params.set("limit", "1");
    if (input.country && input.country.length === 2) {
      params.set("country", input.country.toUpperCase());
    }
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
      q
    )}.json?${params.toString()}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return { valid: false, reason: "provider_error" };
    const data = await res.json();
    const feature = Array.isArray(data.features) ? data.features[0] : null;
    if (!feature) return { valid: false, reason: "not_found" };
    /* eslint-disable-next-line */
    const ctx: any[] = Array.isArray(feature.context) ? feature.context : [];
    const getCtx = (prefix: string) =>
      ctx.find((c) => typeof c.id === "string" && c.id.startsWith(prefix));
    const house = feature.address || "";
    const street = feature.text || "";
    const line1 = [house, street].filter(Boolean).join(" ") || feature.text;
    const city = (getCtx("place")?.text || getCtx("locality")?.text) ?? "";
    const regionCtx = getCtx("region");
    const region =
      (regionCtx?.short_code?.split("-")?.[1] || "").toUpperCase() ||
      regionCtx?.text ||
      "";
    const postalCode = getCtx("postcode")?.text || "";
    const countryCode = (getCtx("country")?.short_code || "").toUpperCase();

    const normalized = {
      line1: line1 || input.line1,
      line2: input.line2 ?? null,
      city: city || input.city,
      region: region || input.region || null,
      postalCode: postalCode || input.postalCode,
      country: countryCode || input.country,
    } as Partial<AddressInput>;

    // Minimal validity: require line1, city OR postal, and country
    const valid = !!(
      normalized.line1 &&
      (normalized.city || normalized.postalCode) &&
      normalized.country
    );

    return { valid, normalized };
  } catch (e) {
    debug("ADDRESS", "validation_error", {
      message: e instanceof Error ? e.message : String(e),
    });
    return { valid: false, reason: "network" };
  }
}
