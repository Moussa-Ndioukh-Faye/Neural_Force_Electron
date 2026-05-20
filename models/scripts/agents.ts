import { EventEmitter } from 'events';
import { AGENT_CATALOG, AGENT_DISPLAY, detectAgentFromMessage, getTeamPipeline, AgentRole } from './agent-catalog';

export type AgentStatus = 'idle' | 'busy' | 'error';

export interface AgentInfo {
  id: string;
  name: string;
  role: string;
  icon: string;
  description: string;
  color: string;
  status: AgentStatus;
}

const CORE_ROLES: AgentRole[] = ['leader', 'planner', 'executor', 'reviewer', 'researcher', 'debugger'];

class Agent extends EventEmitter {
  public id: string;
  public name: string;
  public status: AgentStatus = 'idle';
  public currentTask: string | null = null;

  constructor(private role: string) {
    super();
    const entry = AGENT_CATALOG.find(a => a.role === role);
    this.id = role;
    this.name = entry?.name || role;
  }

  async processTask(taskDescription: string, ollamaUrl: string, model: string): Promise<string> {
    this.status = 'busy';
    this.currentTask = taskDescription;
    this.emit('status-change', this.getSnapshot());

    try {
      const display = AGENT_DISPLAY[this.role];
      const response = await ollamaChat(ollamaUrl, model, taskDescription, display?.systemPrompt);

      this.status = 'idle';
      this.currentTask = null;
      this.emit('status-change', this.getSnapshot());

      return response;
    } catch (error: any) {
      this.status = 'error';
      this.emit('status-change', this.getSnapshot());
      setTimeout(() => {
        this.status = 'idle';
        this.currentTask = null;
        this.emit('status-change', this.getSnapshot());
      }, 2000);
      throw error;
    }
  }

  getSnapshot() {
    const display = AGENT_DISPLAY[this.role] || { icon: '🤖', color: 'default', systemPrompt: '' };
    const entry = AGENT_CATALOG.find(a => a.role === this.role);
    return {
      id: this.id,
      name: this.name,
      role: entry?.description || this.role,
      icon: display.icon,
      color: display.color,
      description: entry?.description || '',
      status: this.status
    };
  }
}

async function ollamaChat(ollamaUrl: string, model: string, userMessage: string, system?: string): Promise<string> {
  try {
    const body: any = { model, stream: false };
    if (system) body.system = system;
    body.messages = [{ role: 'user', content: userMessage }];

    const res = await fetch(`${ollamaUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!res.ok) throw new Error(`Ollama error: ${res.status}`);
    const data = await res.json();
    return data.message?.content || 'No response';
  } catch (e: any) {
    throw new Error(`Ollama: ${e.message}`);
  }
}

function formatAgentHeader(agentId: string): string {
  const display = AGENT_DISPLAY[agentId];
  const entry = AGENT_CATALOG.find(a => a.role === agentId);
  return `${display?.icon || '🤖'} **${entry?.name || agentId}**\n\n`;
}

function formatPipelineHeader(pipelineType: string, steps: string[]): string {
  const icons: Record<string, string> = {
    feature: '🚀', bugfix: '🛠️', review: '🔍', research: '📚'
  };
  const icon = icons[pipelineType] || '📋';
  const stepsList = steps.map((s, i) => `  ${i + 1}. ${s}`).join('\n');
  return `${icon} **Pipeline: ${pipelineType}**\nÉtapes:\n${stepsList}\n\n`;
}

export class MultiAgentSystem extends EventEmitter {
  private agents: Map<string, Agent> = new Map();
  public ollamaUrl: string = 'http://localhost:11434';
  public model: string = 'qwen2.5-coder';

  constructor() {
    super();
    for (const role of CORE_ROLES) {
      const agent = new Agent(role);
      agent.on('status-change', (snapshot: AgentInfo) => {
        this.emit('agent-status', snapshot);
      });
      this.agents.set(role, agent);
    }
  }

  getAgentList(): AgentInfo[] {
    return Array.from(this.agents.values()).map(a => a.getSnapshot());
  }

  async delegateTask(agentId: string, taskDescription: string): Promise<string> {
    const agent = this.agents.get(agentId);
    if (!agent) throw new Error(`Agent '${agentId}' not found`);
    return agent.processTask(taskDescription, this.ollamaUrl, this.model);
  }

  async autoDelegate(taskDescription: string): Promise<{ agentId: string; response: string; pipeline?: string }> {
    const lower = taskDescription.toLowerCase();

    const pipelineMatch = lower.match(/^pipeline:? (feature|bugfix|review|research)/i);
    if (pipelineMatch) {
      const pipeType = pipelineMatch[1].toLowerCase();
      return this.runPipeline(pipeType, taskDescription.replace(/^pipeline:?\s+\w+\s*/i, ''));
    }

    const detected = detectAgentFromMessage(taskDescription);
    if (detected && this.agents.has(detected)) {
      const response = await this.delegateTask(detected, taskDescription);
      return { agentId: detected, response };
    }

    const leaderResponse = await this.delegateTask('leader',
      `Analyze this request and determine which specialist should handle it, then provide the response as if you were that specialist.\n\nRequest: ${taskDescription}`
    );
    return { agentId: 'leader', response: leaderResponse };
  }

  async runPipeline(type: string, taskDescription: string): Promise<{ agentId: string; response: string; pipeline: string }> {
    const roles = getTeamPipeline(type);
    if (roles.length === 0) throw new Error(`Pipeline '${type}' not found`);

    const steps = roles.map(r => {
      const entry = AGENT_CATALOG.find(a => a.role === r);
      return entry?.name || r;
    });

    let result = formatPipelineHeader(type, steps);
    for (const role of roles) {
      if (!this.agents.has(role)) continue;
      try {
        const response = await this.delegateTask(role, taskDescription);
        result += formatAgentHeader(role) + response + '\n\n---\n\n';
      } catch (e: any) {
        result += formatAgentHeader(role) + `❌ Erreur: ${e.message}\n\n---\n\n`;
      }
    }

    return { agentId: 'pipeline', response: result, pipeline: type };
  }
}

export const agentSystem = new MultiAgentSystem();
