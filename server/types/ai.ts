export type AIResponse = {
  text: string;
  meta?: Record<string, any>;
};

export type BusinessReport = {
  generatedAt: string;
  executiveSummary: string;
  inventoryHealth: any;
  risks: any[];
  demandAnalysis: any;
  revenueAnalysis: any;
  recommendations: string[];
  actionPlan: { immediate: string[]; next7: string[]; next30: string[] };
};
