import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import fetchHolidays from "../lib/utils";

export const checkTodayHolidaysTool = createTool({
  id: "check-today-holidays",

  description: `Checks if today is a holiday in a specific country or globally.
  
Use this tool when:
- User asks "Is today a holiday?"
- "Is today a holiday in [country]?"
- "What holidays are today?"`,

  inputSchema: z.object({
    country: z
      .string()
      .length(2)
      .toUpperCase()
      .optional()
      .describe(
        "Optional: Check specific country. If not provided, checks multiple major countries.",
      ),
  }),

  outputSchema: z.object({
    date: z.string(),
    isHoliday: z.boolean(),
    holidays: z.array(
      z.object({
        name: z.string(),
        description: z.string(),
        country: z.string(),
        type: z.array(z.string()),
      }),
    ),
    totalHolidays: z.number(),
  }),

  execute: async ({ context }) => {
    const { country } = context;
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    const day = today.getDate();
    const dateStr = today.toISOString().split("T")[0];

    try {
      let countryCodes: string[] = [];

      if (country) {
        countryCodes = [country];
      } else {
        // Check major countries using our constant
        countryCodes = [
          "US",
          "GB",
          "CA",
          "AU",
          "IN",
          "NG",
          "ZA",
          "FR",
          "DE",
          "JP",
          "CN",
          "BR",
        ];
      }

      const holidays: any[] = [];

      for (const countryCode of countryCodes) {
        try {
          const data = await fetchHolidays({
            country: countryCode,
            year,
            month,
            day,
          });

          holidays.push(
            ...data.response.holidays.map((h: any) => ({
              name: h.name,
              description: h.description,
              country: h.country.name,
              type: h.type,
            })),
          );
        } catch {
          continue;
        }
      }

      return {
        date: dateStr,
        isHoliday: holidays.length > 0,
        holidays,
        totalHolidays: holidays.length,
      };
    } catch (error) {
      throw new Error(
        `Failed to check today's holidays: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  },
});
