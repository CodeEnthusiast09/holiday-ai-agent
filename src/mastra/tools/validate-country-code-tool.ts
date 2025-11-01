import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { getCountryCode, getCountryName, searchCountries } from "../lib/utils";

export const validateCountryCodeTool = createTool({
  id: "validate-country-code",

  description: `Validates and converts between country names and ISO codes.
  
Use this tool when:
- User provides a country name and you need the ISO code
- You need to validate if a country code exists
- User asks "What's the code for [country]?"
- You need to convert a code back to a country name

This is useful for validating user input before calling other holiday tools.`,

  inputSchema: z.object({
    input: z
      .string()
      .describe(
        "Country name or ISO code to validate/convert (e.g., 'Nigeria', 'NG', 'United States', 'US')",
      ),
  }),

  outputSchema: z.object({
    isValid: z.boolean(),
    countryName: z.string().nullable(),
    countryCode: z.string().nullable(),
    suggestions: z
      .array(
        z.object({
          name: z.string(),
          code: z.string(),
        }),
      )
      .optional(),
  }),

  execute: async ({ context }) => {
    const { input } = context;
    const trimmedInput = input.trim();

    try {
      // Check if input is a 2-letter code
      if (trimmedInput.length === 2) {
        const countryName = getCountryName(trimmedInput);

        if (countryName) {
          return {
            isValid: true,
            countryName,
            countryCode: trimmedInput.toUpperCase(),
          };
        }
      }

      // Check if input is a country name
      const countryCode = getCountryCode(trimmedInput);

      if (countryCode) {
        return {
          isValid: true,
          countryName: trimmedInput,
          countryCode,
        };
      }

      // Not found - provide suggestions
      const suggestions = searchCountries(trimmedInput).slice(0, 5);

      return {
        isValid: false,
        countryName: null,
        countryCode: null,
        suggestions: suggestions.length > 0 ? suggestions : undefined,
      };
    } catch (error) {
      throw new Error(
        `Failed to validate country code: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  },
});
