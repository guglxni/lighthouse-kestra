export type TopicPreview = {
  id: string;
  name: string;
  description: string;
  schedule?: string;
  sourceCounts: {
    rss: number;
    arxiv: number;
    github: number;
    hn: number;
    reddit: number;
    youtube: number;
    web: number;
  };
};

export type ExecutionPreview = {
  id: string;
  namespace: string;
  flowId: string;
  state: string;
  startDate?: string;
  durationMs?: number;
};

export type DashboardPayload = {
  generatedAt: string;
  demoMode: boolean;
  demoBanner?: string;
  envHints: {
    kestraUrl: string;
    kestraTenant: string;
    litellmUrl: string;
    databaseConfigured: boolean;
    litellmKeyConfigured: boolean;
  };
  topics: TopicPreview[];
  services: {
    kestra: {
      ok: boolean;
      ms?: number;
      error?: string;
      flowsTotal?: number;
      flowsByNamespace?: Record<string, number>;
      executions?: ExecutionPreview[];
    };
    postgres: {
      ok: boolean;
      error?: string;
      counts?: {
        documents: number;
        embeddings: number;
        classifications: number;
        briefs: number;
        chatTurns: number;
      };
      docsByTopic?: Record<string, number>;
      latestBriefs?: Array<{ topic_id: string; date: string; clusters: number }>;
    };
    litellm: {
      ok: boolean;
      error?: string;
      models?: string[];
    };
  };
  pipeline: Array<{
    id: string;
    title: string;
    subtitle: string;
    flows: string[];
    accent: "cyan" | "violet" | "amber" | "emerald";
  }>;
  byokPresets: Array<{
    id: string;
    title: string;
    modelHint: string;
    keys: string[];
    notes: string;
  }>;
};
