import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { getAllCountries, searchCountries } from "../lib/utils";

export const getAvailableCountriesTool = createTool({
  id: "get-supported-countries",

  description: `Gets the list of countries supported by Calendarific with their ISO codes.
  
Use this tool when:
- User asks "What countries are supported?" or "Which countries can you check?"
- User needs to find the correct country code (e.g., "What's the code for Nigeria?")
- User asks "Can you get holidays for [country name]?"
- You need to validate if a country is supported
- User provides an ambiguous country name and you need to clarify

This tool searches through 230+ supported countries instantly without making an API call.
Supports fuzzy search - can find countries by partial name or code.`,

  inputSchema: z.object({
    searchQuery: z
      .string()
      .describe(
        "Optional: Search/filter countries by name or code (e.g., 'United', 'NG', 'Africa', 'Island')",
      )
      .optional(),
  }),

  outputSchema: z.object({
    countries: z.array(
      z.object({
        name: z.string(),
        code: z.string(),
      }),
    ),
    totalCountries: z.number(),
    searchQuery: z.string().optional(),
  }),

  execute: async ({ context }) => {
    const { searchQuery } = context;

    try {
      let countries: Array<{ name: string; code: string }>;

      if (searchQuery && searchQuery.trim()) {
        // Perform search
        countries = searchCountries(searchQuery.trim());
      } else {
        // Return all countries
        countries = getAllCountries();
      }

      // Sort alphabetically by name
      countries.sort((a, b) => a.name.localeCompare(b.name));

      return {
        countries,
        totalCountries: countries.length,
        ...(searchQuery && { searchQuery }),
      };
    } catch (error) {
      throw new Error(
        `Failed to get supported countries: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  },
});
