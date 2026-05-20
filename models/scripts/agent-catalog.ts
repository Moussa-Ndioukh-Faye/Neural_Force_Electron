export type AgentRole =
  | 'leader'
  | 'planner'
  | 'executor'
  | 'reviewer'
  | 'researcher'
  | 'debugger'
  | 'architect'
  | 'analyst'
  | 'test-engineer'
  | 'security-reviewer'
  | 'writer'
  | 'git-master';

export interface Agent {
  role: AgentRole;
  name: string;
  description: string;
  capabilities: string[];
  model: string;
}

export interface AgentDisplayInfo {
  icon: string;
  color: string;
  systemPrompt: string;
}

export const AGENT_DISPLAY: Record<string, AgentDisplayInfo> = {
  leader: {
    icon: '👑', color: 'leader',
    systemPrompt: `You are the Team Leader, an AI orchestration expert. Your role is to coordinate the team and delegate tasks. Analyze incoming requests and determine which specialist agent should handle them. Explain which agent should handle the task and why. Available agents: planner (planning & task breakdown), executor (code implementation), reviewer (code review), researcher (research & docs), debugger (debugging & bug fixing).`
  },
  planner: {
    icon: '📋', color: 'planner',
    systemPrompt: `You are a Planning Specialist. Break down tasks into clear, actionable steps. Identify dependencies, estimate effort, and create structured execution plans. Always output a numbered plan with clear phases.`
  },
  executor: {
    icon: '⚡', color: 'executor',
    systemPrompt: `You are a Code Execution Specialist. Write clean, efficient, well-documented code. Implement solutions with complete, working code including necessary imports and examples. Always specify the programming language.`
  },
  reviewer: {
    icon: '🔍', color: 'reviewer',
    systemPrompt: `You are a Code Review Specialist. Review code for bugs, style issues, performance problems, and security vulnerabilities. Provide specific, constructive feedback with actionable suggestions. Use a checklist format.`
  },
  researcher: {
    icon: '🔎', color: 'researcher',
    systemPrompt: `You are a Research Specialist. Find documentation, explain concepts, provide examples, and analyze technologies. Give comprehensive, well-structured answers with references and links.`
  },
  debugger: {
    icon: '🐛', color: 'debugger',
    systemPrompt: `You are a Debugging Specialist. Analyze error messages, trace through code logic, identify root causes, and suggest concrete fixes. Be methodical: first understand the problem, then find the root cause, then propose the fix.`
  },
  architect: { icon: '🏗️', color: 'architect', systemPrompt: 'You are a System Architecture Specialist. Design system architecture, define interfaces, evaluate tradeoffs, and create technical specifications.' },
  analyst: { icon: '📊', color: 'analyst', systemPrompt: 'You are a Requirements Analyst. Gather and analyze requirements, define acceptance criteria, identify constraints, and validate specifications.' },
  'test-engineer': { icon: '🧪', color: 'test-engineer', systemPrompt: 'You are a Test Engineer. Design test strategies, write test cases, ensure code coverage, and validate software robustness.' },
  'security-reviewer': { icon: '🛡️', color: 'security-reviewer', systemPrompt: 'You are a Security Reviewer. Audit code for vulnerabilities, identify security risks, and recommend mitigations following OWASP guidelines.' },
  writer: { icon: '📝', color: 'writer', systemPrompt: 'You are a Technical Writer. Create clear documentation, write migration guides, and produce well-structured technical content.' },
  'git-master': { icon: '🔀', color: 'git-master', systemPrompt: 'You are a Git Specialist. Manage version control, review commit history, resolve merge conflicts, and enforce git best practices.' }
};

export const AGENT_CATALOG: Agent[] = [
  {
    role: 'leader',
    name: 'Team Leader',
    description: 'Orchestration & coordination',
    capabilities: ['orchestration', 'task-allocation', 'coordination'],
    model: 'qwen2.5-coder'
  },
  {
    role: 'planner',
    name: 'Planner',
    description: 'Planification & analyse',
    capabilities: ['analysis', 'planning', 'decomposition'],
    model: 'qwen2.5-coder'
  },
  {
    role: 'executor',
    name: 'Executor',
    description: 'Implémentation & code',
    capabilities: ['code-execution', 'file-management', 'terminal'],
    model: 'qwen2.5-coder'
  },
  {
    role: 'reviewer',
    name: 'Reviewer',
    description: 'Code review & qualité',
    capabilities: ['code-review', 'linting', 'testing'],
    model: 'qwen2.5-coder'
  },
  {
    role: 'researcher',
    name: 'Researcher',
    description: 'Recherche & documentation',
    capabilities: ['web-search', 'documentation', 'analysis'],
    model: 'qwen2.5-coder'
  },
  {
    role: 'debugger',
    name: 'Debugger',
    description: 'Debug & troubleshooting',
    capabilities: ['debugging', 'error-analysis', 'troubleshooting'],
    model: 'qwen2.5-coder'
  },
  {
    role: 'architect',
    name: 'Architect',
    description: 'Architecture système',
    capabilities: ['system-design', 'architecture', 'interfaces'],
    model: 'qwen2.5-coder'
  },
  {
    role: 'analyst',
    name: 'Analyst',
    description: 'Analyse des besoins',
    capabilities: ['requirements', 'analysis', 'validation'],
    model: 'qwen2.5-coder'
  },
  {
    role: 'test-engineer',
    name: 'Test Engineer',
    description: 'Tests & couverture',
    capabilities: ['testing', 'coverage', 'test-strategy'],
    model: 'qwen2.5-coder'
  },
  {
    role: 'security-reviewer',
    name: 'Security Reviewer',
    description: 'Audit sécurité',
    capabilities: ['security', 'vulnerabilities', 'audit'],
    model: 'qwen2.5-coder'
  },
  {
    role: 'writer',
    name: 'Writer',
    description: 'Documentation technique',
    capabilities: ['documentation', 'writing', 'guides'],
    model: 'qwen2.5-coder'
  },
  {
    role: 'git-master',
    name: 'Git Master',
    description: 'Gestion de version',
    capabilities: ['git', 'version-control', 'history'],
    model: 'qwen2.5-coder'
  }
];

export const TEAM_PIPELINE: Record<string, AgentRole[]> = {
  feature: ['analyst', 'planner', 'executor', 'test-engineer', 'reviewer', 'writer'],
  bugfix: ['debugger', 'executor', 'reviewer'],
  review: ['reviewer', 'security-reviewer'],
  research: ['researcher', 'architect', 'writer']
};

export const KEYWORD_DETECTION: Record<string, AgentRole> = {
  'plan': 'planner',
  'implement': 'executor',
  'review': 'reviewer',
  'debug': 'debugger',
  'research': 'researcher',
  'test': 'test-engineer',
  'security': 'security-reviewer',
  'docs': 'writer',
  'git': 'git-master',
  'design': 'architect',
  'analyze': 'analyst'
};

export function detectAgentFromMessage(message: string): AgentRole | null {
  const lower = message.toLowerCase();
  for (const [keyword, role] of Object.entries(KEYWORD_DETECTION)) {
    if (lower.includes(keyword)) return role;
  }
  return null;
}

export function getTeamPipeline(type: string): AgentRole[] {
  return TEAM_PIPELINE[type] || [];
}