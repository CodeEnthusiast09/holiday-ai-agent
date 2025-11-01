import { HolidayResponse } from "../interface/holiday";
import { COUNTRY_CODES, CountryName } from "./constants";
import { LRUCache } from "lru-cache";

const holidayCache = new LRUCache<string, HolidayResponse>({
  max: 500, // Store 500 responses
  ttl: 1000 * 60 * 60 * 24, // 24 hours
});

async function fetchHolidays(params: {
  country?: string;
  year: number;
  month?: number;
  day?: number;
  type?: string;
}): Promise<HolidayResponse> {
  const apiKey = process.env.CALENDARIFIC_API_KEY;

  if (!apiKey) {
    throw new Error(
      "CALENDARIFIC_API_KEY is not set. Please add it to your .env file",
    );
  }

  const cacheKey = JSON.stringify(params);

  const cached = holidayCache.get(cacheKey);

  if (cached) {
    console.log("Cache hit");
    return cached;
  }

  // Build API URL with query parameters
  const url = new URL("https://calendarific.com/api/v2/holidays");
  url.searchParams.append("api_key", apiKey);

  if (params.country) {
    url.searchParams.append("country", params.country);
  }

  url.searchParams.append("year", params.year.toString());

  if (params.month) {
    url.searchParams.append("month", params.month.toString());
  }

  if (params.day) {
    url.searchParams.append("day", params.day.toString());
  }

  if (params.type) {
    url.searchParams.append("type", params.type);
  }

  console.log(`Calling Calendarific API: ${url.toString()}`);

  const response = await fetch(url.toString());

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Calendarific API error: ${response.status} ${response.statusText}. ${errorText}`,
    );
  }

  const data: HolidayResponse = await response.json();

  holidayCache.set(cacheKey, data);

  if (data.meta.code !== 200) {
    throw new Error(`Calendarific returned error code: ${data.meta.code}`);
  }

  return data;
}

export default fetchHolidays;

export function getCountryCode(countryName: string): string | null {
  // Direct match
  if (countryName in COUNTRY_CODES) {
    return COUNTRY_CODES[countryName as CountryName];
  }

  // Case-insensitive match
  const lowerName = countryName.toLowerCase();
  const entry = Object.entries(COUNTRY_CODES).find(
    ([name]) => name.toLowerCase() === lowerName,
  );

  return entry ? entry[1] : null;
}

// Helper function to get country name from code
export function getCountryName(countryCode: string): string | null {
  const upperCode = countryCode.toUpperCase();
  const entry = Object.entries(COUNTRY_CODES).find(
    ([, code]) => code === upperCode,
  );

  return entry ? entry[0] : null;
}

// Helper function for fuzzy search
export function searchCountries(
  query: string,
): Array<{ name: string; code: string }> {
  const lowerQuery = query.toLowerCase();

  return Object.entries(COUNTRY_CODES)
    .filter(
      ([name, code]) =>
        name.toLowerCase().includes(lowerQuery) ||
        code.toLowerCase().includes(lowerQuery),
    )
    .map(([name, code]) => ({ name, code }));
}

// Get all countries as array
export function getAllCountries(): Array<{ name: string; code: string }> {
  return Object.entries(COUNTRY_CODES).map(([name, code]) => ({ name, code }));
}
