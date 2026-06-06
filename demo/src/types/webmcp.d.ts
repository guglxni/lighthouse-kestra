/** WebMCP — https://github.com/webmachinelearning/webmcp (experimental browser API). */

export type WebMcpToolResult = {
  content: Array<{ type: "text"; text: string } | { type: string; text?: string }>;
};

export type WebMcpToolRegistration = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute: (args: Record<string, unknown>) => Promise<WebMcpToolResult>;
};

export type WebMcpRegisterOptions = {
  signal?: AbortSignal;
  exposedTo?: string[];
};

export type WebMcpModelContext = {
  registerTool: (tool: WebMcpToolRegistration, options?: WebMcpRegisterOptions) => void;
};

declare global {
  interface Document {
    modelContext?: WebMcpModelContext;
  }
}

export {};
