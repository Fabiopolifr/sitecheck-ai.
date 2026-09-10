import { env } from "@/lib/config/env";

export type DiscoveredBusiness = {
  name: string;
  website: string;
  city: string | null;
};

type PlacesTextSearchResponse = {
  places?: {
    displayName?: { text?: string };
    websiteUri?: string;
    formattedAddress?: string;
  }[];
};

/**
 * Google Places API (New) Text Search — the legitimate, ToS-compliant way
 * to discover businesses by query, instead of scraping Google Search/Maps
 * result pages directly (against Google's ToS, and liable to get the
 * server's IP blocked). Requires a paid Google Cloud API key
 * (GOOGLE_PLACES_API_KEY); returns an empty list — never throws — when
 * unconfigured, so the outreach batch degrades to manual-queue-only
 * instead of crashing. See AI/DECISIONS.md D37.
 */
export async function searchBusinesses(
  query: string,
  maxResults: number,
): Promise<DiscoveredBusiness[]> {
  if (!env.GOOGLE_PLACES_API_KEY) {
    console.warn(
      "GOOGLE_PLACES_API_KEY not configured — skipping Google Maps discovery",
    );
    return [];
  }

  try {
    const response = await fetch(
      "https://places.googleapis.com/v1/places:searchText",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": env.GOOGLE_PLACES_API_KEY,
          "X-Goog-FieldMask":
            "places.displayName,places.websiteUri,places.formattedAddress",
        },
        body: JSON.stringify({ textQuery: query, maxResultCount: maxResults }),
      },
    );

    if (!response.ok) {
      console.error(
        `Google Places API request failed: ${response.status} ${await response.text()}`,
      );
      return [];
    }

    const data = (await response.json()) as PlacesTextSearchResponse;

    return (data.places ?? [])
      .filter((place) => Boolean(place.websiteUri))
      .slice(0, maxResults)
      .map((place) => ({
        name: place.displayName?.text ?? "Attività sconosciuta",
        website: place.websiteUri!,
        city: place.formattedAddress ?? null,
      }));
  } catch (error) {
    console.error("Google Places API request threw:", error);
    return [];
  }
}
