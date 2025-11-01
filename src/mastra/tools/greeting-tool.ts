async function buildHolidayGreeting(
  agent: any,
  metadata?: Record<string, any>,
) {
  const userTimezone =
    metadata?.timezone ||
    metadata?.tz ||
    metadata?.user?.timezone ||
    Intl.DateTimeFormat().resolvedOptions().timeZone;

  const today = new Date();

  const formattedDate = today.toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: userTimezone,
  });

  // Derive user's country or region from metadata (if available)
  const userCountry =
    metadata?.country?.toUpperCase?.() ||
    metadata?.location?.countryCode?.toUpperCase?.() ||
    null;

  // Query your holiday tool
  const result = await agent.callTool("check-today-holidays", {
    country: userCountry || undefined,
  });

  const { holidays } = result.output || {};
  let holidayText = "";

  if (holidays?.length) {
    const topHolidays = holidays.slice(0, 5);
    holidayText =
      topHolidays
        .map(
          (h: any) =>
            `🎉 **${h.name}** (${h.country}) — ${h.description || ""}`,
        )
        .join("\n") + (holidays.length > 5 ? "\n...and more!" : "");
  } else {
    holidayText = "There don’t seem to be any major holidays today.";
  }

  return `Hi there! 👋 Today is ${formattedDate}.\n\n${holidayText}`;
}

export default buildHolidayGreeting;
