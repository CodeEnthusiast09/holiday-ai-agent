import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import fetchHolidays, { getAllCountries } from "../lib/utils";
import { Holiday } from "../interface/holiday";

export const getHolidaysForDateTool = createTool({
  id: "get-holidays-for-date",

  description: `Gets all holidays on a specific date across all countries or in a specific country.
  
  Use this tool when the user asks:
  - "What holidays are on [date]?"
  - "Is [date] a holiday anywhere?"
  - "What's celebrated on December 25th?"
  - "Tell me about holidays on my birthday [date]"
  - "What countries celebrate on [date]?"
  
  Returns all holidays that occur on the specified date with their descriptions and countries.
  By default, searches across multiple countries unless a specific country is provided.`,

  inputSchema: z.object({
    month: z
      .number()
      .int()
      .min(1, "Month must be between 1 and 12")
      .max(12, "Month must be between 1 and 12")
      .describe("Month of the date (1=January, 12=December)"),

    day: z
      .number()
      .int()
      .min(1, "Day must be between 1 and 31")
      .max(31, "Day must be between 1 and 31")
      .describe("Day of the month (1-31)"),

    year: z
      .number()
      .int()
      .min(2000, "Year must be 2000 or later")
      .max(2100, "Year must be 2100 or earlier")
      .optional()
      .describe(
        "Year to check (e.g., 2025). If not provided, uses current year.",
      ),

    country: z
      .string()
      .length(2, "Country code must be exactly 2 characters")
      .transform((val) => val.toUpperCase())
      .optional()
      .describe(
        "Optional: Check only this country (ISO code like US, GB, NG). If not provided, searches across all countries.",
      ),
  }),

  outputSchema: z.object({
    date: z.string().describe("The queried date in ISO format (YYYY-MM-DD)"),
    holidays: z.array(
      z.object({
        name: z.string().describe("Name of the holiday"),
        description: z.string().describe("Detailed description of the holiday"),
        country: z.string().describe("Country name"),
        countryCode: z.string().describe("ISO country code"),
        type: z.array(z.string()).describe("Types/categories of the holiday"),
      }),
    ),
    totalHolidays: z.number().describe("Total number of holidays found"),
    countriesSearched: z.number().describe("Number of countries searched"),
  }),

  execute: async ({ context }) => {
    console.log("Fetching holidays for specific date");
    console.log("Query parameters:", JSON.stringify(context, null, 2));

    const { month, day, year, country } = context;

    // Use current year if not provided
    const searchYear = year ?? new Date().getFullYear();

    // Format date string for response
    const dateStr = `${searchYear}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    try {
      let countriesToSearch: Array<{ name: string; code: string }> = [];

      // Determine which countries to search
      if (country) {
        // Single country search
        console.log(`Searching single country: ${country}`);
        countriesToSearch = [{ name: "Selected Country", code: country }];
      } else {
        // Multi-country search - get list of major countries to avoid API rate limits
        console.log("Searching across multiple countries");

        // Get all countries from your constants
        const allCountries = getAllCountries();

        // Prioritize major countries to stay within API limits
        // You can adjust this list based on your needs
        const priorityCountries = [
          "US",
          "GB",
          "CA",
          "AU",
          "IN",
          "NG",
          "FR",
          "DE",
          "IT",
          "ES",
          "BR",
          "MX",
          "JP",
          "CN",
          "ZA",
          "AR",
          "RU",
          "KR",
          "ID",
          "SA",
          "AE",
          "EG",
          "KE",
          "GH",
          "PK",
          "BD",
          "VN",
          "TH",
          "PH",
          "MY",
          "SG",
          "NZ",
          "IE",
          "NL",
          "BE",
          "CH",
          "SE",
          "NO",
          "DK",
          "FI",
          "PL",
          "TR",
          "IL",
          "QA",
          "KW",
        ];

        // Filter to priority countries
        countriesToSearch = allCountries.filter((c) =>
          priorityCountries.includes(c.code),
        );

        console.log(`Will search ${countriesToSearch.length} countries`);
      }

      const holidays: Array<{
        name: string;
        description: string;
        country: string;
        countryCode: string;
        type: string[];
      }> = [];

      let successfulSearches = 0;
      let failedSearches = 0;

      // Search each country
      for (const { code: countryCode } of countriesToSearch) {
        try {
          // Use your existing fetchHolidays function with caching
          const data = await fetchHolidays({
            country: countryCode,
            year: searchYear,
            month,
            day,
          });

          // Transform and add holidays from this country
          const countryHolidays = data.response.holidays.map((h: Holiday) => ({
            name: h.name,
            description: h.description,
            country: h.country.name,
            countryCode: h.country.id,
            type: h.type,
          }));

          if (countryHolidays.length > 0) {
            holidays.push(...countryHolidays);
            console.log(
              `Found ${countryHolidays.length} holiday(s) in ${countryCode}`,
            );
          }

          successfulSearches++;
        } catch (error) {
          // Silently continue if a country fails (might not have data for that date)
          failedSearches++;
          console.log(`No data or error for ${countryCode}`);
          continue;
        }

        // Add small delay between requests to respect API rate limits
        // Only needed for multi-country searches
        if (!country && countriesToSearch.length > 1) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }

      console.log(
        `Search complete: ${holidays.length} holidays found across ${successfulSearches} countries`,
      );
      if (failedSearches > 0) {
        console.log(`${failedSearches} countries had no data or errors`);
      }

      // Sort holidays by country name for better readability
      holidays.sort((a, b) => a.country.localeCompare(b.country));

      return {
        date: dateStr,
        holidays,
        totalHolidays: holidays.length,
        countriesSearched: successfulSearches,
      };
    } catch (error) {
      console.error("Error fetching holidays for date:", error);
      throw new Error(
        `Failed to get holidays for date: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  },
});
