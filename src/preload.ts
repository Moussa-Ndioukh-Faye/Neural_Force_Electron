import { contextBridge, ipcRenderer } from 'electron';

type ChunkData = { type: 'token' | 'done' | 'error'; content?: string };
type ChunkCallback = (data: ChunkData) => void;

const api = {
  getConversations: () => ipcRenderer.invoke('get-conversations'),
  createConversation: (title: string, mode?: string) => ipcRenderer.invoke('create-conversation', title, mode),
  deleteConversation: (id: string) => ipcRenderer.invoke('delete-conversation', id),
  renameConversation: (id: string, title: string) => ipcRenderer.invoke('rename-conversation', id, title),
  getMessages: (id: string) => ipcRenderer.invoke('get-messages', id),
  addMessage: (convId: string, role: string, content: string) => ipcRenderer.invoke('add-message', convId, role, content),
  chat: (messages: Record<string, unknown>[], mode?: string) => ipcRenderer.invoke('chat', messages, mode),
  startChatStream: (messages: Record<string, unknown>[], mode: string) => ipcRenderer.send('chat-stream', messages, mode),
  onChatChunk: (callback: ChunkCallback) => {
    const handler = (_: unknown, data: ChunkData) => callback(data);
    ipcRenderer.on('chat:chunk', handler);
    return () => ipcRenderer.removeListener('chat:chunk', handler);
  },
  getAgents: () => ipcRenderer.invoke('get-agents'),
  agentTask: (agent: string, task: string) => ipcRenderer.invoke('agent-task', agent, task),
  runPipeline: (type: string, task: string) => ipcRenderer.invoke('run-pipeline', type, task),
  getAgentStatus: () => ipcRenderer.invoke('get-agent-status'),
  getOllamaModels: () => ipcRenderer.invoke('get-ollama-models'),
  getSetting: (key: string) => ipcRenderer.invoke('get-setting', key),
  setSetting: (key: string, value: string) => ipcRenderer.invoke('set-setting', key, value),
  runCommand: (cmd: string) => ipcRenderer.invoke('run-command', cmd),
  getWorkspace: () => ipcRenderer.invoke('get-workspace'),
};

contextBridge.exposeInMainWorld('api', api);
declare global { interface Window { api: typeof api } }
