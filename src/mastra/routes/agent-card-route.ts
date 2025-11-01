import { registerApiRoute } from "@mastra/core/server";

export const agentCardRoute = registerApiRoute("/.well-known/agent.json", {
  method: "GET",
  handler: async (c: any) => {
    const agentCard = {
      name: "Global Holiday Agent",
      description:
        "Your AI assistant for discovering holidays and observances from over 230 countries worldwide.",
      version: "1.0.0",
      serviceUrl: `${c.req.url.origin}/a2a/agent/holidayAgent`,
      authentication: {
        schemes: [],
      },
      capabilities: {
        streaming: false,
        pushNotifications: false,
        proactiveMessages: true,
      },
      skills: [
        {
          name: "get-holidays",
          description: "Get holidays for any country and date",
          examples: [
            "What holidays does Nigeria have?",
            "Is today a holiday in the US?",
            "When is Mother's Day?",
          ],
        },
      ],
    };

    return c.json(agentCard);
  },
});
