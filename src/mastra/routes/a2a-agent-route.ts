import { registerApiRoute } from "@mastra/core/server";
import { randomUUID } from "crypto";

// Define types for A2A protocol
type MessageRole = "user" | "assistant" | "system" | "agent";
type MessageKind = "message" | "tool" | "error";

interface MessagePart {
  kind: "text" | "data";
  text?: string;
  data?: any;
}

interface A2AMessage {
  kind: MessageKind;
  role: MessageRole;
  parts: MessagePart[];
  messageId?: string;
  taskId?: string;
}

interface A2ARequestParams {
  message?: A2AMessage;
  messages?: A2AMessage[];
  contextId?: string;
  taskId?: string;
  metadata?: Record<string, any>;
}

interface A2ARequest {
  jsonrpc: "2.0";
  id: string | number | null;
  method?: string;
  params?: A2ARequestParams;
}

interface A2AResponse<T = any> {
  jsonrpc: "2.0";
  id: string | number | null;
  result?: T;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

interface AgentResponse {
  text: string;
  toolResults?: Array<{
    toolName: string;
    result: any;
  }>;
}

interface MastraContext {
  get: <T = any>(key: string) => T;
  req: {
    param: (name: string) => string;
    json: () => Promise<A2ARequest>;
  };
  json: (response: A2AResponse, status?: number) => Response;
}

// =============================================================================
// HELPER: Generate Today's Holiday Greeting
// =============================================================================

async function generateHolidayGreeting(agent: any): Promise<string> {
  const today = new Date();
  const dateOptions: Intl.DateTimeFormatOptions = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  };
  const formattedDate = today.toLocaleDateString("en-US", dateOptions);

  // Generate ordinal suffix for day
  const day = today.getDate();
  const ordinal = (n: number) => {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  const shortDate = `${ordinal(day)} ${today.toLocaleDateString("en-US", { month: "long" })}, ${today.getFullYear()}`;

  try {
    // Ask the agent about today's holidays
    const response = (await agent.generate(
      `Today is ${formattedDate}. What holidays are being celebrated today worldwide? 
      Include major holidays from different countries (US, UK, Canada, India, Nigeria, etc.) 
      and also mention any international observances like World Health Day, Mother's Day, etc.
      
      Format your response in a warm, conversational tone suitable as a greeting message.
      Start with acknowledging today's date, then list the holidays with brief descriptions.
      Keep it concise but informative - aim for 3-5 major holidays.`,
    )) as AgentResponse;

    // Format the greeting
    const greeting = `Hi there! 👋

Today is **${shortDate}**.

${response.text}

Feel free to ask me about holidays in any country or on any specific date! 🌍`;

    return greeting;
  } catch (error) {
    console.error("Error generating holiday greeting:", error);

    // Fallback greeting if holiday fetch fails
    return `Hi there! 👋

Today is **${shortDate}**.

I'm your Global Holiday Assistant! I can help you discover holidays and observances from over 230 countries worldwide. 

Feel free to ask me:
• "What holidays does Nigeria have in 2025?"
• "When is Mother's Day celebrated?"
• "Is today a holiday in the US?"
• "Tell me about Independence Days worldwide"

How can I help you today? 🌍`;
  }
}

// =============================================================================
// HELPER: Detect if this is a new conversation
// =============================================================================

function isNewConversation(params: A2ARequestParams): boolean {
  // Check if there's no message history or if this is the first message
  const { messages, message } = params;

  // If there are no messages at all, it's a new conversation
  if (!messages && !message) {
    return true;
  }

  // If there's only one message and it's from the user, it's likely a new conversation
  if (messages && messages.length === 1 && messages[0].role === "user") {
    return true;
  }

  // If there's a single message and it's from the user
  if (message && !messages && message.role === "user") {
    return true;
  }

  // Check if the message content is empty or very short (like opening the chat)
  if (message) {
    const content = message.parts
      ?.map((part) => part.text || "")
      .join("")
      .trim();

    // If message is empty or just whitespace, treat as new conversation
    if (!content || content.length === 0) {
      return true;
    }
  }

  return false;
}

// =============================================================================
// ENHANCED A2A ROUTE WITH PROACTIVE GREETING
// =============================================================================

export const a2aAgentRoute = registerApiRoute("/a2a/agent/:agentId", {
  method: "POST",
  handler: async (c: MastraContext) => {
    try {
      const mastra = c.get("mastra");
      const agentId = c.req.param("agentId");

      // Parse JSON-RPC 2.0 request
      const body = (await c.req.json()) as A2ARequest;
      const { jsonrpc, id: requestId, method: _method, params = {} } = body;

      // Validate JSON-RPC 2.0 format
      if (jsonrpc !== "2.0" || !requestId) {
        return c.json(
          {
            jsonrpc: "2.0",
            id: requestId || null,
            error: {
              code: -32600,
              message:
                'Invalid Request: jsonrpc must be "2.0" and id is required',
            },
          },
          400,
        );
      }

      const agent = mastra.getAgent(agentId);
      if (!agent) {
        return c.json(
          {
            jsonrpc: "2.0",
            id: requestId,
            error: {
              code: -32602,
              message: `Agent '${agentId}' not found`,
            },
          },
          404,
        );
      }

      // Extract messages from params
      const {
        message,
        messages,
        contextId,
        taskId,
        metadata: _metadata,
      } = params;

      // ========================================================
      // PROACTIVE GREETING: Check if this is a new conversation
      // ========================================================
      const isNew = isNewConversation(params);

      if (isNew) {
        console.log(
          "🎉 New conversation detected - sending proactive greeting",
        );

        // Generate today's holiday greeting
        const greetingText = await generateHolidayGreeting(agent);

        const greetingMessageId = randomUUID();
        const greetingTaskId = taskId || randomUUID();

        // Return proactive greeting response
        return c.json({
          jsonrpc: "2.0",
          id: requestId,
          result: {
            id: greetingTaskId,
            contextId: contextId || randomUUID(),
            status: {
              state: "completed",
              timestamp: new Date().toISOString(),
              message: {
                messageId: greetingMessageId,
                role: "agent",
                parts: [{ kind: "text", text: greetingText }],
                kind: "message",
              },
            },
            artifacts: [
              {
                artifactId: randomUUID(),
                name: "HolidayGreeting",
                parts: [{ kind: "text", text: greetingText }],
              },
            ],
            history: [
              {
                kind: "message" as const,
                role: "agent" as const,
                parts: [{ kind: "text" as const, text: greetingText }],
                messageId: greetingMessageId,
                taskId: greetingTaskId,
              },
            ],
            kind: "task",
          },
        } as A2AResponse);
      }

      // ========================================================
      // NORMAL MESSAGE HANDLING: User has sent an actual message
      // ========================================================

      let messagesList: A2AMessage[] = [];
      if (message) {
        messagesList = [message];
      } else if (messages && Array.isArray(messages)) {
        messagesList = messages;
      }

      // Convert A2A messages to Mastra format
      const mastraMessages = messagesList.map((msg) => ({
        role: msg.role,
        content:
          msg.parts
            ?.map((part) => {
              if (part.kind === "text" && part.text) return part.text;
              if (part.kind === "data" && part.data)
                return JSON.stringify(part.data);
              return "";
            })
            .join("\n") || "",
      }));

      // Execute agent
      const response = (await agent.generate(mastraMessages)) as AgentResponse;
      const agentText = response.text || "";

      // Build artifacts array
      const artifacts: Array<{
        artifactId: string;
        name: string;
        parts: MessagePart[];
      }> = [
        {
          artifactId: randomUUID(),
          name: `${agentId}Response`,
          parts: [{ kind: "text", text: agentText }],
        },
      ];

      // Add tool results as artifacts
      if (response.toolResults?.length) {
        artifacts.push({
          artifactId: randomUUID(),
          name: "ToolResults",
          parts: response.toolResults.map((result) => ({
            kind: "data",
            data: result,
          })),
        });
      }

      // Build conversation history
      const history: A2AMessage[] = [
        ...messagesList.map((msg) => ({
          kind: "message" as const,
          role: msg.role,
          parts: msg.parts,
          messageId: msg.messageId || randomUUID(),
          taskId: msg.taskId || taskId || randomUUID(),
        })),
        {
          kind: "message" as const,
          role: "agent" as const,
          parts: [{ kind: "text" as const, text: agentText }],
          messageId: randomUUID(),
          taskId: taskId || randomUUID(),
        },
      ];

      // Return A2A-compliant response
      return c.json({
        jsonrpc: "2.0",
        id: requestId,
        result: {
          id: taskId || randomUUID(),
          contextId: contextId || randomUUID(),
          status: {
            state: "completed",
            timestamp: new Date().toISOString(),
            message: {
              messageId: randomUUID(),
              role: "agent",
              parts: [{ kind: "text", text: agentText }],
              kind: "message",
            },
          },
          artifacts,
          history,
          kind: "task",
        },
      } as A2AResponse);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      return c.json(
        {
          jsonrpc: "2.0",
          id: null,
          error: {
            code: -32603,
            message: "Internal error",
            data: { details: errorMessage },
          },
        },
        500,
      );
    }
  },
});
