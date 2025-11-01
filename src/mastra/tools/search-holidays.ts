import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { COUNTRY_CODES, CountryCode } from "../lib/constants";
import fetchHolidays from "../lib/utils";

export const searchHolidaysByNameTool = createTool({
  id: "search-holidays-by-name",

  description: `Searches for holidays by name across all countries or within a specific country.
  
Use this tool when the user asks about:
- International observances: "When is Mother's Day?", "When do countries celebrate Independence Day?"
- Specific holiday: "Tell me about Christmas around the world", "When is New Year celebrated?"
- Holiday variations: "How do different countries celebrate [holiday]?"`,

  inputSchema: z.object({
    searchTerm: z
      .string()
      .min(2)
      .describe("The holiday name or keyword to search for"),
    country: z
      .string()
      .length(2)
      .toUpperCase()
      .optional()
      .describe("Optional: Limit search to a specific country using ISO code"),
    year: z
      .number()
      .int()
      .min(2001)
      .max(2049)
      .optional()
      .default(new Date().getFullYear()),
    type: z.enum(["national", "local", "religious", "observance"]).optional(),
  }),

  outputSchema: z.object({
    results: z.array(
      z.object({
        name: z.string(),
        description: z.string(),
        country: z.string(),
        countryCode: z.string(),
        date: z.string(),
        type: z.array(z.string()),
      }),
    ),
    searchTerm: z.string(),
    totalFound: z.number(),
    year: z.number(),
  }),

  execute: async ({ context }) => {
    const { searchTerm, country, year, type } = context;
    const searchYear = year || new Date().getFullYear();

    try {
      let countryCodes: string[] = [];

      if (country) {
        // Search in specific country
        countryCodes = [country];
      } else {
        // Use our constant for top countries instead of API call
        // Prioritize major countries for faster searches
        const priorityCountries = [
          "US",
          "GB",
          "CA",
          "AU",
          "IN",
          "NG",
          "ZA",
          "FR",
          "DE",
          "IT",
          "ES",
          "JP",
          "CN",
          "BR",
          "MX",
          "AR",
          "RU",
          "KR",
          "ID",
          "TR",
          "NL",
          "SE",
          "NO",
          "DK",
          "FI",
          "PL",
          "UA",
          "RO",
          "CZ",
          "GR",
          "PT",
          "BE",
          "HU",
          "AT",
          "CH",
          "IL",
          "SG",
          "MY",
          "TH",
          "PH",
          "VN",
          "PK",
          "BD",
          "EG",
          "SA",
          "AE",
          "KE",
          "GH",
          "ET",
          "TZ",
        ];

        // Filter to only supported countries
        countryCodes = priorityCountries.filter((code) =>
          Object.values(COUNTRY_CODES).includes(code as CountryCode),
        );
      }

      const results: any[] = [];
      const searchLower = searchTerm.toLowerCase();

      // Search through each country
      for (const countryCode of countryCodes) {
        try {
          const data = await fetchHolidays({
            country: countryCode,
            year: searchYear,
            type,
          });

          const matches = data.response.holidays.filter(
            (h: any) =>
              h.name.toLowerCase().includes(searchLower) ||
              h.description.toLowerCase().includes(searchLower),
          );

          results.push(
            ...matches.map((h: any) => ({
              name: h.name,
              description: h.description,
              country: h.country.name,
              countryCode: h.country.id,
              date: h.date.iso,
              type: h.type,
            })),
          );
        } catch {
          // Skip countries that fail
          continue;
        }
      }

      return {
        results,
        searchTerm,
        totalFound: results.length,
        year: searchYear,
      };
    } catch (error) {
      throw new Error(
        `Failed to search holidays: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  },
});
