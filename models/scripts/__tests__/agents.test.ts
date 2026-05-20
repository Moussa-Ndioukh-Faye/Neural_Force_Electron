import { MultiAgentSystem } from '../agents';
import { detectAgentFromMessage, getTeamPipeline, AGENT_CATALOG } from '../agent-catalog';

const originalFetch = globalThis.fetch;

describe('AgentCatalog', () => {
  it('AGENT_CATALOG has 12 entries', () => {
    expect(AGENT_CATALOG.length).toBe(12);
  });

  it('first 6 are core agents', () => {
    const coreRoles = AGENT_CATALOG.slice(0, 6).map(a => a.role);
    expect(coreRoles).toEqual(['leader', 'planner', 'executor', 'reviewer', 'researcher', 'debugger']);
  });

  it('each agent has required fields', () => {
    for (const a of AGENT_CATALOG) {
      expect(a.role).toBeDefined();
      expect(a.name).toBeDefined();
      expect(a.description).toBeDefined();
      expect(a.capabilities).toBeInstanceOf(Array);
    }
  });

  it('catalog entries have unique roles', () => {
    const roles = AGENT_CATALOG.map(a => a.role);
    expect(new Set(roles).size).toBe(roles.length);
  });
});

describe('detectAgentFromMessage', () => {
  it('detects "plan" keyword', () => {
    expect(detectAgentFromMessage('plan this project')).toBe('planner');
  });

  it('detects "implement" keyword', () => {
    expect(detectAgentFromMessage('implement a function')).toBe('executor');
  });

  it('detects "review" keyword', () => {
    expect(detectAgentFromMessage('review this code')).toBe('reviewer');
  });

  it('detects "debug" keyword', () => {
    expect(detectAgentFromMessage('debug this crash')).toBe('debugger');
  });

  it('returns null for unknown messages', () => {
    expect(detectAgentFromMessage('hello world')).toBeNull();
  });

  it('is case insensitive', () => {
    expect(detectAgentFromMessage('PLAN the sprint')).toBe('planner');
  });
});

describe('getTeamPipeline', () => {
  it('returns roles for feature pipeline', () => {
    const roles = getTeamPipeline('feature');
    expect(roles).toContain('planner');
    expect(roles).toContain('executor');
    expect(roles).toContain('reviewer');
  });

  it('returns roles for bugfix pipeline', () => {
    const roles = getTeamPipeline('bugfix');
    expect(roles).toContain('debugger');
    expect(roles).toContain('executor');
    expect(roles).toContain('reviewer');
  });

  it('returns empty for unknown pipeline', () => {
    expect(getTeamPipeline('unknown')).toEqual([]);
  });
});

describe('MultiAgentSystem', () => {
  let system: MultiAgentSystem;

  beforeEach(() => {
    system = new MultiAgentSystem();
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        message: { content: 'Test response' }
      })
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('returns 6 agents in getAgentList', () => {
    const list = system.getAgentList();
    expect(list).toHaveLength(6);
  });

  it('has leader as first agent', () => {
    const list = system.getAgentList();
    expect(list[0].id).toBe('leader');
  });

  it('delegateTask returns response', async () => {
    system.ollamaUrl = 'http://localhost:11434';
    system.model = 'test-model';
    const result = await system.delegateTask('planner', 'test task');
    expect(result).toBe('Test response');
  });

  it('delegateTask sets agent busy then idle', async () => {
    system.ollamaUrl = 'http://localhost:11434';
    system.model = 'test-model';

    const statuses: string[] = [];
    system.on('agent-status', (s: { status: string }) => statuses.push(s.status));

    await system.delegateTask('planner', 'task');
    expect(statuses).toContain('busy');
    expect(statuses).toContain('idle');
  });

  it('delegateTask throws for unknown agent', async () => {
    await expect(system.delegateTask('unknown', 'task')).rejects.toThrow('not found');
  });

  it('autoDelegate processes keyword detection', async () => {
    const result = await system.autoDelegate('implement login page');
    expect(result.agentId).toBe('executor');
    expect(result.response).toBe('Test response');
  });

  it('autoDelegate uses leader as fallback', async () => {
    const result = await system.autoDelegate('hello');
    expect(result.agentId).toBe('leader');
  });

  it('runPipeline returns response with pipeline type', async () => {
    const result = await system.runPipeline('feature', 'build api');
    expect(result.pipeline).toBe('feature');
    expect(result.agentId).toBe('pipeline');
    expect(result.response).toContain('Pipeline: feature');
  });

  it('runPipeline throws for unknown type', async () => {
    await expect(system.runPipeline('unknown', 'task')).rejects.toThrow('not found');
  });

  it('handles Ollama fetch error gracefully', async () => {
    globalThis.fetch = jest.fn().mockRejectedValue(new Error('Connection refused'));
    system.ollamaUrl = 'http://localhost:11434';
    system.model = 'test-model';
    await expect(system.delegateTask('planner', 'task')).rejects.toThrow('Ollama');
  });
});
