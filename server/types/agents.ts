export type AgentTask = {
  id: string;
  agent_name: string;
  task_type: string;
  priority: string;
  status: string;
  description?: string;
  meta?: Record<string, any>;
  user_id?: string;
  created_by?: string;
  created_at?: string;
};

export type AgentExecutionLog = {
  id: string;
  task_id: string;
  agent_name: string;
  status: string;
  result?: any;
  user_id?: string;
  created_by?: string;
  created_at?: string;
};
