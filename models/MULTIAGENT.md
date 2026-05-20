# NeuralForge - Multi-Agent System

## Architecture Multi-Agent

```
NeuralForge
├── Team Leader (Orchestrateur)
│   ├── Planner Agent - Décompose les tâches
│   ├── Executor Agent - Exécute le code
│   ├── Researcher Agent - Recherche/documentation
│   ├── Reviewer Agent - Code review
│   └── Debugger Agent - Résolution bugs
├── Communication Layer (IPC)
├── Task Queue (Shared)
└── Shared Memory
```

## Rôles d'Agents

| Agent | Rôle | Outils |
|-------|------|--------|
| `leader` | Orchestration, распределение задач | Task management |
| `planner` | Planification, décomposition | Analysis, planning |
| `executor` | Exécution de code | Terminal, editor |
| `reviewer` | Code review, qualité | Linter, tests |
| `researcher` | Recherche, documentation | Web, docs |
| `debugger` | Debug, troubleshooting | Logs, debugging |

## Protocole de Communication

```typescript
interface AgentMessage {
  from: string;
  to: string;
  type: 'task' | 'result' | 'error' | 'status';
  payload: any;
  timestamp: number;
}
```

## Configuration

Les agents utilisent les mêmes modèles (Qwen2.5-Coder, etc.) via Ollama ou API externe.