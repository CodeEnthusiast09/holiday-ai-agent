import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import fetchHolidays from "../lib/utils";
import { Holiday } from "../interface/holiday";

export const getHolidaysByCountryTool = createTool({
  id: "get-holidays-by-country",

  description: `Fetches all holidays and observances for a country. 
  Use this when the user asks about holidays or observances in a specific country (e.g., "holidays in Nigeria", "US holidays in 2025").
  Returns detailed information including local names, dates, and whether they're observed nationwide.
  
  Use this tool to:
  - Get all holidays for a specific country and year
  - Find holidays on a specific date (requires month and day)
  - Search for specific holiday types (national, local, religious, observance)
  - Look up Independence Days, Mother's Day, World Health Day, etc.
  
  Required parameters:
  - country: ISO 3166-1 alpha-2 code (US, GB, NG, IN, FR, DE, CA, AU, JP, BR, etc.)
  - year: Four-digit year (2000-2100)
  
  Optional parameters:
  - month: Month number (1-12)
  - day: Day of month (1-31)
  - type: Holiday type filter (national, local, religious, observance)
  
  Examples:
  - All US holidays in 2025: country=US, year=2025
  - Nigeria Independence Day: country=NG, year=2025, month=10, day=1
  - Religious holidays in India: country=IN, year=2025, type=religious
  - Christmas worldwide: month=12, day=25, year=2025 (query multiple countries)`,

  inputSchema: z.object({
    country: z
      .string()
      .length(2, "Country code must be exactly 2 characters")
      .transform((val) => val.toUpperCase())
      .describe(
        "Two-letter ISO 3166-1 alpha-2 country code (e.g., US, GB, NG, IN)",
      ),

    year: z
      .number()
      .int()
      .min(2000, "Year must be 2000 or later")
      .max(2100, "Year must be 2100 or earlier")
      .describe("Year for which to fetch holidays (e.g., 2025)"),

    month: z
      .number()
      .int()
      .min(1, "Month must be between 1 and 12")
      .max(12, "Month must be between 1 and 12")
      .optional()
      .describe("Optional: Month number (1=January, 12=December)"),

    day: z
      .number()
      .int()
      .min(1, "Day must be between 1 and 31")
      .max(31, "Day must be between 1 and 31")
      .optional()
      .describe("Optional: Day of the month (1-31)"),

    type: z.enum(["national", "local", "religious", "observance"]).optional()
      .describe(`Optional: Filter by holiday type:
        - national: Public, federal, and bank holidays
        - local: Regional and state-specific holidays
        - religious: Buddhist, Christian, Hindu, Muslim, etc.
        - observance: International observances and awareness days`),
  }),

  outputSchema: z.object({
    holidays: z.array(
      z.object({
        name: z.string().describe("Name of the holiday"),
        description: z.string().describe("Detailed description of the holiday"),
        date: z.string().describe("ISO date format (YYYY-MM-DD)"),
        type: z.array(z.string()).describe("Types/categories of the holiday"),
        country: z.string().describe("Country name"),
      }),
    ),
    count: z.number().describe("Total number of holidays found"),
    query: z
      .object({
        country: z.string(),
        year: z.number(),
        month: z.number().optional(),
        day: z.number().optional(),
        type: z.string().optional(),
      })
      .describe("The query parameters used"),
  }),

  execute: async ({ context }) => {
    console.log("Fetching holidays from Calendarific API");
    console.log("Query parameters:", JSON.stringify(context, null, 2));

    const { country, year, month, day, type } = context;

    try {
      // Fetch data from Calendarific
      const data = await fetchHolidays({
        country,
        year,
        month,
        day,
        type,
      });

      // Transform the response to match our outputSchema
      const holidays = data.response.holidays.map((h: Holiday) => ({
        name: h.name,
        description: h.description,
        date: h.date.iso, // Extract ISO date string from date object
        type: h.type, // Already an array of strings
        country: h.country.name, // Extract country name from country object
      }));

      return {
        holidays,
        count: holidays.length,
        query: {
          country,
          year,
          ...(month && { month }),
          ...(day && { day }),
          ...(type && { type }),
        },
      };
    } catch (error) {
      console.error("Error fetching holidays:", error);
      throw new Error(
        `Failed to fetch holidays: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  },
});
