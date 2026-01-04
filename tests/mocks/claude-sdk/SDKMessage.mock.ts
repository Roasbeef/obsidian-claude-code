import type { SDKMessage } from "./index";

// Create an init message (legacy - for backward compatibility).
export function createInitMessage(sessionId = "test-session-123"): SDKMessage {
  return {
    type: "init",
    session_id: sessionId,
  };
}

// Create a system init message with tools list (matches actual SDK).
export function createSystemInitMessage(
  sessionId = "test-session-123",
  tools: string[] = ["Read", "Write", "Bash", "Glob", "Grep", "Edit", "Task"]
): SDKMessage {
  return {
    type: "system",
    subtype: "init",
    session_id: sessionId,
    tools,
  } as SDKMessage;
}

// Create an assistant message with text.
export function createAssistantMessage(text: string): SDKMessage {
  return {
    type: "assistant",
    message: {
      role: "assistant",
      content: [{ type: "text", text }],
    },
  };
}

// Create a result message with usage (legacy - for backward compatibility).
export function createResultMessage(
  inputTokens = 100,
  outputTokens = 50
): SDKMessage {
  return {
    type: "result",
    result: {
      usage: {
        input_tokens: inputTokens,
        output_tokens: outputTokens,
      },
    },
  };
}

// Create a success result message (matches actual SDK).
export function createSuccessResultMessage(
  numTurns = 1,
  totalCostUsd = 0.01,
  result?: string
): SDKMessage {
  return {
    type: "result",
    subtype: "success",
    num_turns: numTurns,
    total_cost_usd: totalCostUsd,
    result,
  } as SDKMessage;
}

// Create an error result message.
export function createErrorResultMessage(errors: string[]): SDKMessage {
  return {
    type: "result",
    subtype: "error",
    errors,
  } as SDKMessage;
}

// Create a tool use message.
export function createToolUseMessage(
  toolName: string,
  input: any,
  toolId?: string
): SDKMessage {
  return {
    type: "assistant",
    message: {
      role: "assistant",
      content: [
        {
          type: "tool_use",
          id: toolId ?? `tool-${Date.now()}`,
          name: toolName,
          input,
        },
      ],
    },
  };
}

// Create a tool result message.
export function createToolResultMessage(
  toolUseId: string,
  content: string,
  isError = false
): SDKMessage {
  return {
    type: "assistant",
    message: {
      role: "user",
      content: [
        {
          type: "tool_result",
          tool_use_id: toolUseId,
          content,
          is_error: isError,
        } as any,
      ],
    },
  };
}

// Create a Task (subagent) tool use message.
export function createTaskToolMessage(
  subagentType: string,
  description: string,
  toolId?: string
): SDKMessage {
  return createToolUseMessage(
    "Task",
    {
      subagent_type: subagentType,
      description,
      prompt: description,
    },
    toolId
  );
}

// Create a complete conversation sequence (legacy).
export function createConversationSequence(
  response: string,
  toolCalls?: Array<{ name: string; input: any; result: string }>
): SDKMessage[] {
  const messages: SDKMessage[] = [createInitMessage()];

  if (toolCalls) {
    for (const tool of toolCalls) {
      const toolId = `tool-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      messages.push(createToolUseMessage(tool.name, tool.input, toolId));
      messages.push(createToolResultMessage(toolId, tool.result));
    }
  }

  messages.push(createAssistantMessage(response));
  messages.push(createResultMessage());

  return messages;
}

// Create a complete SDK conversation sequence (matches actual SDK flow).
export function createSDKConversationSequence(
  response: string,
  options?: {
    sessionId?: string;
    tools?: string[];
    toolCalls?: Array<{ name: string; input: any; result?: string }>;
    numTurns?: number;
    totalCostUsd?: number;
  }
): SDKMessage[] {
  const sessionId = options?.sessionId ?? "test-session-123";
  const tools = options?.tools ?? ["Read", "Write", "Bash", "Edit", "Task"];
  const numTurns = options?.numTurns ?? 1;
  const totalCostUsd = options?.totalCostUsd ?? 0.01;

  const messages: SDKMessage[] = [createSystemInitMessage(sessionId, tools)];

  if (options?.toolCalls) {
    for (const tool of options.toolCalls) {
      const toolId = `tool-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      messages.push(createToolUseMessage(tool.name, tool.input, toolId));
      if (tool.result !== undefined) {
        messages.push(createToolResultMessage(toolId, tool.result));
      }
    }
  }

  if (response) {
    messages.push(createAssistantMessage(response));
  }
  messages.push(createSuccessResultMessage(numTurns, totalCostUsd, response));

  return messages;
}
