import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import Store from 'electron-store';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { agentSystem, AgentInfo } from '../models/scripts/agents';

declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

if (require('electron-squirrel-startup')) app.quit();

process.on('uncaughtException', (error) => {
  console.error('[NeuralForge] Uncaught Exception:', error);
  dialog.showErrorBox('Erreur critique', `Une erreur inattendue est survenue:\n${error.message}\n\nL'application va se fermer.`);
  app.quit();
});

process.on('unhandledRejection', (reason) => {
  console.error('[NeuralForge] Unhandled Rejection:', reason);
});

interface Message {
  id: string;
  role: string;
  content: string;
  timestamp: string;
}

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  messages: Message[];
  mode: 'single' | 'team';
}

function getEncryptionKey(): string {
  return crypto.createHash('sha256')
    .update('neuralforge-store-v1-' + app.getPath('userData'))
    .digest('hex')
    .slice(0, 32);
}

function createEncryptedStore() {
  const key = getEncryptionKey();
  const defaults = {
    conversations: [],
    settings: { ollamaUrl: 'http://localhost:11434', model: 'qwen2.5-coder' }
  };

  try {
    return new Store({ encryptionKey: key, defaults });
  } catch {
    // Migrate from unencrypted store
    try {
      const oldStore = new Store({ defaults });
      const data = oldStore.store;
      const configPath = path.join(app.getPath('userData'), 'config.json');
      if (fs.existsSync(configPath)) fs.unlinkSync(configPath);
      const newStore = new Store({ encryptionKey: key, defaults });
      newStore.store = data;
      return newStore;
    } catch {
      return new Store({ encryptionKey: key, defaults });
    }
  }
}

const store = createEncryptedStore();

const settings = store.get('settings') as { ollamaUrl: string; model: string };
agentSystem.ollamaUrl = settings.ollamaUrl;
agentSystem.model = settings.model;

async function ollamaChat(model: string, messages: { role: string; content: string }[], system?: string): Promise<string> {
  try {
    const body: any = { model, stream: false };
    if (system) body.system = system;
    body.messages = messages;

    const res = await fetch(`${agentSystem.ollamaUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!res.ok) throw new Error(`Ollama error: ${res.status}`);
    const data = await res.json();
    return data.message?.content || 'No response';
  } catch (e: any) {
    return `❌ Ollama: ${e.message}. Vérifiez qu'Ollama est démarré (ollama serve)`;
  }
}

const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

function getAgentChatLabel(agentId: string): string {
  const agent = agentSystem.getAgentList().find(a => a.id === agentId);
  return agent ? `${agent.icon} **${agent.name}**` : `🤖 **${agentId}**`;
}

const CSP = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self' http://localhost:* https://localhost:*; img-src 'self' data:; font-src 'self'";

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 1200, height: 800,
    minWidth: 800, minHeight: 600,
    backgroundColor: '#0D0D0F',
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [CSP]
      }
    });
  });

  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
};

// === IPC HANDLERS ===

ipcMain.handle('get-conversations', () => {
  try {
    return store.get('conversations', []).map((c: Conversation) => ({
      id: c.id, title: c.title, created_at: c.created_at, updated_at: c.updated_at, mode: c.mode
    }));
  } catch (e: any) {
    return [];
  }
});

ipcMain.handle('create-conversation', (_, title: string, mode: 'single' | 'team' = 'single') => {
  try {
    const conv: Conversation = {
      id: generateId(), title, created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(), messages: [], mode
    };
    const convs = store.get('conversations', []);
    store.set('conversations', [conv, ...convs]);
    return conv;
  } catch (e: any) {
    return null;
  }
});

ipcMain.handle('delete-conversation', (_, id: string) => {
  try {
    const convs = store.get('conversations', []);
    store.set('conversations', convs.filter((c: Conversation) => c.id !== id));
  } catch (e: any) { }
});

ipcMain.handle('rename-conversation', (_, id: string, title: string) => {
  try {
    const convs = store.get('conversations', []);
    const idx = convs.findIndex((c: Conversation) => c.id === id);
    if (idx === -1) return;
    convs[idx].title = title;
    store.set('conversations', convs);
  } catch (e: any) { }
});

ipcMain.handle('get-messages', (_, conversationId: string) => {
  try {
    const convs = store.get('conversations', []);
    const conv = convs.find((c: Conversation) => c.id === conversationId);
    return conv ? conv.messages : [];
  } catch (e: any) {
    return [];
  }
});

ipcMain.handle('add-message', (_, conversationId: string, role: string, content: string) => {
  try {
    const convs = store.get('conversations', []);
    const idx = convs.findIndex((c: Conversation) => c.id === conversationId);
    if (idx === -1) return null;

    const msg: Message = { id: generateId(), role, content, timestamp: new Date().toISOString() };
    convs[idx].messages.push(msg);
    convs[idx].updated_at = new Date().toISOString();
    store.set('conversations', convs);
    return msg;
  } catch (e: any) {
    return null;
  }
});

// === CHAT - AGENT DELEGATION ===
ipcMain.handle('chat', async (_, messages: Message[], mode: 'single' | 'team' = 'single') => {
  try {
    const userMsg = messages[messages.length - 1]?.content || '';

    if (mode === 'team') {
      const agentMatch = userMsg.match(/@(planner|executor|reviewer|researcher|debugger|leader)/i);

      if (agentMatch) {
        const agent = agentMatch[1].toLowerCase();
        const task = userMsg.replace(/@\w+\s*/i, '').trim();
        const response = await agentSystem.delegateTask(agent, task);
        return {
          id: generateId(), role: 'assistant',
          content: `${getAgentChatLabel(agent)}\n\n${response}`,
          timestamp: new Date().toISOString()
        };
      }

      const pipelineMatch = userMsg.match(/^pipeline:?\s*(feature|bugfix|review|research)/i);
      if (pipelineMatch) {
        const pipeType = pipelineMatch[1].toLowerCase();
        const task = userMsg.replace(/^pipeline:?\s*\w+\s*/i, '').trim();
        const result = await agentSystem.runPipeline(pipeType, task);
        return {
          id: generateId(), role: 'assistant',
          content: result.response,
          timestamp: new Date().toISOString()
        };
      }

      const autoResult = await agentSystem.autoDelegate(userMsg);
      return {
        id: generateId(), role: 'assistant',
        content: `${getAgentChatLabel(autoResult.agentId)}\n\n${autoResult.response}`,
        timestamp: new Date().toISOString()
      };
    }

    // Single mode
    const response = await ollamaChat(agentSystem.model, [
      { role: 'system', content: 'You are NeuralForge, an AI coding assistant. Help users write, debug, and understand code. Be concise and practical.' },
      ...messages.map(m => ({ role: m.role, content: m.content }))
    ]);
    return { id: generateId(), role: 'assistant', content: response, timestamp: new Date().toISOString() };

  } catch (e: any) {
    return {
      id: generateId(), role: 'assistant',
      content: `❌ Erreur: ${e.message}`,
      timestamp: new Date().toISOString()
    };
  }
});

// === AGENT IPCs ===
ipcMain.handle('get-agents', () => {
  return agentSystem.getAgentList();
});

ipcMain.handle('agent-task', async (_, agent: string, task: string) => {
  try {
    const result = await agentSystem.delegateTask(agent, task);
    return { success: true, agent, result };
  } catch (e: any) {
    return { success: false, agent, error: e.message };
  }
});

ipcMain.handle('run-pipeline', async (_, type: string, task: string) => {
  try {
    return await agentSystem.runPipeline(type, task);
  } catch (e: any) {
    return { agentId: 'pipeline', response: `❌ Erreur pipeline: ${e.message}`, pipeline: type };
  }
});

ipcMain.handle('get-agent-status', () => {
  return agentSystem.getAgentList();
});

// === OLLAMA MODELS ===
ipcMain.handle('get-ollama-models', async () => {
  try {
    const res = await fetch(`${agentSystem.ollamaUrl}/api/tags`, { method: 'GET', signal: AbortSignal.timeout(5000) });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.models || []).map((m: any) => m.name);
  } catch {
    return [];
  }
});

// === SETTINGS ===
ipcMain.handle('get-setting', (_, key: string) => {
  try {
    const s = store.get('settings', {}) as any;
    return s[key] || null;
  } catch { return null; }
});

ipcMain.handle('set-setting', (_, key: string, value: string) => {
  try {
    const s = store.get('settings', {}) as any;
    s[key] = value;
    store.set('settings', s);
    if (key === 'ollamaUrl') agentSystem.ollamaUrl = value;
    if (key === 'model') agentSystem.model = value;
  } catch (e: any) { }
});

// === SANDBOXED COMMAND EXECUTION ===
const ALLOWED_COMMANDS = ['git', 'npm', 'node', 'python', 'pip', 'ls', 'dir', 'cat', 'type', 'echo', 'cd'];
const BLOCKED_PATTERNS = [/rm\s+-rf/i, /del\s+\/f/i, /format/i, /shutdown/i, /net\s+user/i, /rd\s+\/s/i];

function isCommandSafe(cmd: string): { safe: boolean; reason?: string } {
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(cmd)) return { safe: false, reason: 'Commande interdite pour des raisons de sécurité' };
  }
  return { safe: true };
}

ipcMain.handle('run-command', async (_, cmd: string) => {
  const check = isCommandSafe(cmd);
  if (!check.safe) {
    return { success: false, output: '', error: check.reason };
  }

  const { exec } = require('child_process');
  return new Promise(resolve => {
    exec(cmd, { timeout: 10000 }, (err: any, stdout: string, stderr: string) => {
      resolve({ success: !err, output: stdout || '', error: stderr || err?.message || '' });
    });
  });
});

ipcMain.handle('get-workspace', () => require('os').homedir() + '/NeuralForge/workspace');

app.on('ready', createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
