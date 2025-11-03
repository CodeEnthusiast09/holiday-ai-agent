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

      // Extract messages from params with type safety
      const { message, messages, contextId, taskId } = params;

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

      // Execute agent with proper typing
      const response = (await agent.generate(mastraMessages, {
        stream: false,
      })) as AgentResponse;
      const agentText = response.text || "";

      // Build artifacts array with proper typing
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

      // Build conversation history with proper typing
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
