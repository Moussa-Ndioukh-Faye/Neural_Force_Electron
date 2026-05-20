import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import './index.css';
import { ErrorBoundary } from './ErrorBoundary';
import { MarkdownMessage } from './MarkdownMessage';
import { SettingsModal } from './SettingsModal';

interface AgentInfo {
  id: string; name: string; role: string; icon: string;
  description: string; color: string; status: string;
}

const QUICK_ACTIONS = [
  { text: '@planner Analyse ce projet', agent: 'planner' },
  { text: '@executor Écris une fonction', agent: 'executor' },
  { text: '@reviewer Review ce code', agent: 'reviewer' },
  { text: '@debugger Debug cette erreur', agent: 'debugger' },
  { text: 'pipeline:feature Créer une API REST', agent: 'pipeline' },
  { text: 'pipeline:bugfix Corriger le bug', agent: 'pipeline' },
];

function formatTime(ts: string): string {
  if (!ts) return "";
  const d = new Date(ts);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 86400000) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diff < 604800000) return d.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString([], { day: 'numeric', month: 'short' });
}

function App() {
  const [convs, setConvs] = React.useState<Record<string, unknown>[]>([]);
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [msgs, setMsgs] = React.useState<Record<string, unknown>[]>([]);
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [mode, setMode] = React.useState<'single' | 'team'>('single');
  const [agents, setAgents] = React.useState<AgentInfo[]>([]);
  const [taskInput, setTaskInput] = React.useState("");
  const [taskResult, setTaskResult] = React.useState<string>("");
  const [settings, setSettings] = React.useState({ ollamaUrl: 'http://localhost:11434', model: 'qwen2.5-coder' });
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [renamingId, setRenamingId] = React.useState<string | null>(null);
  const [renameValue, setRenameValue] = React.useState("");
  const [toast, setToast] = React.useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [darkMode, setDarkMode] = React.useState(true);
  const renameInputRef = React.useRef<HTMLInputElement>(null);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const messagesRef = React.useRef<HTMLDivElement>(null);
  const toastTimer = React.useRef<ReturnType<typeof setTimeout>>();

  function showToast(message: string, type: 'success' | 'error' = 'success') {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, type });
    toastTimer.current = setTimeout(() => setToast(null), 2500);
  }

  async function copyMessage(content: string) {
    try {
      await navigator.clipboard.writeText(content);
      showToast('Copié !');
    } catch { showToast('Erreur de copie', 'error'); }
  }

  function toggleDarkMode() {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
    window.api.setSetting('theme', next ? 'dark' : 'light');
  }

  React.useEffect(() => {
    loadConvs();
    loadAgents();
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const url = await window.api.getSetting('ollamaUrl');
      const model = await window.api.getSetting('model');
      setSettings({
        ollamaUrl: url || 'http://localhost:11434',
        model: model || 'qwen2.5-coder'
      });
      const theme = await window.api.getSetting('theme');
      if (theme === 'light' || theme === 'dark') {
        setDarkMode(theme === 'dark');
        document.documentElement.setAttribute('data-theme', theme);
      }
    } catch { }
  }

  React.useEffect(() => {
    if (!messagesRef.current) return;
    const el = messagesRef.current;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 150;
    if (isNearBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [msgs]);

  async function loadConvs() {
    try {
      const c = await window.api.getConversations();
      setConvs(c);
      if (c.length > 0 && !activeId) {
        setActiveId(c[0].id);
        setMode(c[0].mode || 'single');
        loadMsgs(c[0].id);
      }
    } catch { }
  }

  async function loadAgents() {
    try {
      const a = await window.api.getAgents();
      setAgents(a);
    } catch { }
  }

  async function loadMsgs(id: string) {
    try {
      const m = await window.api.getMessages(id);
      setMsgs(m);
    } catch { }
  }

  async function newConv() {
    try {
      const c = await window.api.createConversation(
        mode === 'team' ? `Team ${Date.now()}` : `Chat ${Date.now()}`,
        mode
      );
      setConvs([c, ...convs]);
      setActiveId(c.id);
      setMsgs([]);
    } catch { }
  }

  async function send() {
    if (!input.trim() || !activeId || loading) return;
    const userMsg = { id: Date.now().toString(), role: 'user', content: input, timestamp: new Date().toISOString() };
    setMsgs(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    await window.api.addMessage(activeId, 'user', userMsg.content);

    if (mode === 'team') {
      try {
        const resp = await window.api.chat([...msgs, userMsg], mode);
        setMsgs(prev => [...prev, resp]);
        await window.api.addMessage(activeId, 'assistant', resp.content);
      } catch (e) {
        setMsgs(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: `❌ Erreur: ${(e as Error).message}`, timestamp: new Date().toISOString() }]);
      }
      setLoading(false);
      return;
    }

    const streamId = `stream-${Date.now()}`;
    const streamMsg = { id: streamId, role: 'assistant', content: '', timestamp: new Date().toISOString(), streaming: true };
    setMsgs(prev => [...prev, streamMsg]);
    let fullContent = '';

    const cleanup = window.api.onChatChunk((data) => {
      if (data.type === 'token') {
        fullContent += data.content;
        setMsgs(prev => prev.map(m => m.id === streamId ? { ...m, content: fullContent } : m));
      } else if (data.type === 'done') {
        setMsgs(prev => prev.map(m => m.id === streamId ? { ...m, streaming: false, content: fullContent } : m));
        window.api.addMessage(activeId, 'assistant', fullContent);
        setLoading(false);
        cleanup();
      } else if (data.type === 'error') {
        setMsgs(prev => prev.map(m => m.id === streamId ? { ...m, content: `❌ Erreur: ${data.content}`, streaming: false } : m));
        setLoading(false);
        cleanup();
      }
    });

    window.api.startChatStream([...msgs, userMsg], mode);
  }

  async function runTask(agent: string) {
    if (!taskInput.trim()) return;
    setLoading(true);
    try {
      const res = await window.api.agentTask(agent, taskInput);
      setTaskResult(res.success ? res.result : `❌ ${res.error}`);
    } catch (e) {
      setTaskResult(`❌ ${(e as Error).message}`);
    }
    setLoading(false);
  }

  async function runPipelineTask(type: string) {
    if (!taskInput.trim()) return;
    setLoading(true);
    try {
      const res = await window.api.runPipeline(type, taskInput);
      setTaskResult(res.response);
    } catch (e) {
      setTaskResult(`❌ ${(e as Error).message}`);
    }
    setLoading(false);
  }

  return React.createElement('div', { className: 'app' },
    React.createElement('div', {
      className: `sidebar-overlay ${sidebarOpen ? 'visible' : ''}`,
      onClick: () => setSidebarOpen(false)
    }),
    React.createElement('button', {
      className: `hamburger ${sidebarOpen ? 'hidden' : ''}`,
      onClick: () => setSidebarOpen(true),
      title: 'Ouvrir le menu'
    }, '☰'),
    React.createElement('aside', { className: `sidebar ${sidebarOpen ? '' : 'collapsed'}`, },
        React.createElement('div', { className: 'sidebar-header' },
          React.createElement('div', { className: 'logo' },
            React.createElement('div', { className: 'logo-icon' }, '🧠'),
            React.createElement('span', { className: 'logo-text' }, 'NeuralForge'),
            React.createElement('button', {
              className: 'settings-gear',
              onClick: () => setSettingsOpen(true),
              title: 'Paramètres'
            }, '⚙️'),
            React.createElement('button', {
              className: 'theme-toggle',
              onClick: toggleDarkMode,
              title: darkMode ? 'Mode clair' : 'Mode sombre'
            }, darkMode ? '☀️' : '🌙')
          ),
          React.createElement('div', { className: 'mode-toggle' },
            React.createElement('button', {
              className: mode === 'single' ? 'mode-btn active' : 'mode-btn',
              onClick: () => setMode('single')
            }, '💬 Single'),
            React.createElement('button', {
              className: mode === 'team' ? 'mode-btn active' : 'mode-btn',
              onClick: () => setMode('team')
            }, '👥 Team')
          ),
          React.createElement('button', { className: 'new-chat-btn', onClick: newConv }, '+ New')
        ),
      React.createElement('button', { className: 'sidebar-close', onClick: () => setSidebarOpen(false) }, '✕'),
      React.createElement('div', { className: 'conversations-search' },
        React.createElement('input', {
          className: 'conv-search-input',
          value: searchQuery,
          onChange: e => setSearchQuery(e.target.value),
          placeholder: '🔍 Rechercher...'
        })
      ),
      React.createElement('div', { className: 'conversations-list' },
        convs.filter(c => c.title.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && React.createElement('div', { className: 'empty-sidebar' }, 'Aucune conversation'),
        convs.filter(c => c.title.toLowerCase().includes(searchQuery.toLowerCase())).map(c => {
          const isRenaming = renamingId === c.id;
          return React.createElement('div', {
            key: c.id,
            className: activeId === c.id ? 'conversation-item active' : 'conversation-item',
            onClick: () => { setActiveId(c.id); loadMsgs(c.id); setMode(c.mode || 'single'); },
            onDoubleClick: () => {
              setRenamingId(c.id);
              setRenameValue(c.title);
              setTimeout(() => renameInputRef.current?.focus(), 50);
            }
          },
            React.createElement('span', { className: 'conv-icon' }, c.mode === 'team' ? '👥' : '💬'),
            isRenaming ?
              React.createElement('input', {
                ref: renameInputRef,
                className: 'conv-rename-input',
                value: renameValue,
                onChange: e => setRenameValue(e.target.value),
                onBlur: async () => {
                  if (renameValue.trim() && renameValue !== c.title) {
                    await window.api.renameConversation(c.id, renameValue.trim());
                    setConvs(prev => prev.map(x => x.id === c.id ? { ...x, title: renameValue.trim() } : x));
                  }
                  setRenamingId(null);
                },
                onKeyDown: e => {
                  if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                  if (e.key === 'Escape') setRenamingId(null);
                },
                onClick: e => e.stopPropagation()
              }) :
              React.createElement('span', { className: 'conv-title' }, c.title),
            React.createElement('button', {
              className: 'conv-delete-btn',
              onClick: async e => {
                e.stopPropagation();
                if (!confirm('Supprimer cette conversation ?')) return;
                await window.api.deleteConversation(c.id);
                setConvs(prev => prev.filter(x => x.id !== c.id));
                if (activeId === c.id) { setActiveId(''); setMsgs([]); }
              },
              title: 'Supprimer'
            }, '×')
          );
        })
      )
    ),

    React.createElement('main', { className: 'chat-area' },
      !activeId ?
        React.createElement('div', { className: 'welcome' },
          React.createElement('div', { className: 'welcome-icon' }, '🧠'),
          React.createElement('h1', null, 'NeuralForge'),
          React.createElement('p', null, 'AI coding assistant with multi-agent team'),
          mode === 'team' && React.createElement('div', { className: 'welcome-tips' },
            React.createElement('p', null, '👑 @leader - Coordination'),
            React.createElement('p', null, '📋 @planner - Planification'),
            React.createElement('p', null, '⚡ @executor - Code'),
            React.createElement('p', null, '🔍 @reviewer - Review'),
            React.createElement('p', null, '🔎 @researcher - Recherche'),
            React.createElement('p', null, '🐛 @debugger - Debug'),
            React.createElement('p', { style: { marginTop: 12, color: 'var(--accent-orange)' } }, '🚀 pipeline:feature|bugfix|review|research - Lance un pipeline complet')
          ),
          React.createElement('button', { className: 'welcome-btn', onClick: newConv }, 'Start')
        ) :
        React.createElement(React.Fragment, null,
          React.createElement('div', { className: 'messages', ref: messagesRef },
            msgs.length === 0 && React.createElement('div', { className: 'empty-chat' },
              mode === 'team' ? '👥 Tapez @agent ou pipeline:type pour commencer' : '💬 Commencez la conversation'
            ),
            msgs.map(m => {
              const isPipeline = m.content.includes('**Pipeline:');
              return React.createElement('div', {
                key: m.id,
                className: `message ${m.role}${isPipeline ? ' pipeline' : ''}${m.streaming ? ' streaming' : ''}`
              },
                React.createElement('div', { className: 'message-avatar' },
                  m.role === 'user' ? '👤' : (isPipeline ? '🚀' : '🤖')
                ),
                React.createElement('div', { className: 'message-content' },
                  React.createElement(MarkdownMessage, { content: m.content }),
                  React.createElement('div', { className: 'message-footer' },
                    React.createElement('div', { className: 'message-time' }, formatTime(m.timestamp)),
                    React.createElement('button', {
                      className: 'copy-btn',
                      onClick: () => copyMessage(m.content),
                      title: 'Copier le message'
                    }, '📋')
                  )
                )
              );
            }),
            loading && React.createElement('div', { className: 'message assistant' },
              React.createElement('div', { className: 'message-avatar' }, '🤖'),
              React.createElement('div', { className: 'message-content thinking' }, '🧠 NeuralForge réfléchit...')
            ),
            React.createElement('div', { ref: messagesEndRef })
          ),
          React.createElement('div', { className: 'input-area' },
            React.createElement('textarea', {
              value: input,
              onChange: e => setInput(e.target.value),
              onKeyDown: e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              },
              placeholder: mode === 'team'
                ? '@planner @executor @reviewer | pipeline:feature Créer une API...'
                : 'Message NeuralForge...',
              disabled: loading,
              rows: 2
            }),
            React.createElement('button', { onClick: send, disabled: loading || !input.trim() }, 'Envoyer')
          ),
          mode === 'team' && React.createElement('div', { className: 'quick-actions' },
            QUICK_ACTIONS.map((q, i) =>
              React.createElement('button', {
                key: i,
                className: 'quick-btn',
                onClick: () => setInput(q.text)
              }, q.text)
            )
          )
        )
    ),

    mode === 'team' && React.createElement('aside', { className: 'team-panel' },
      React.createElement('div', { className: 'team-header' },
        React.createElement('h3', null, '👥 NeuralForge Team'),
        React.createElement('span', { className: 'team-count' }, `${agents.length} agents`)
      ),
      React.createElement('div', { className: 'team-stats' },
        React.createElement('div', { className: 'team-stats-title' }, 'Team Status'),
        React.createElement('div', { className: 'stats-row' },
          React.createElement('div', { className: 'stat' },
            React.createElement('span', { className: 'stat-value' }, agents.filter(a => a.status === 'busy').length),
            React.createElement('span', { className: 'stat-label' }, 'Actifs')
          ),
          React.createElement('div', { className: 'stat' },
            React.createElement('span', { className: 'stat-value' }, agents.length),
            React.createElement('span', { className: 'stat-label' }, 'Disponibles')
          ),
          React.createElement('div', { className: 'stat' },
            React.createElement('span', { className: 'stat-value' }, msgs.filter(m => m.role === 'assistant').length),
            React.createElement('span', { className: 'stat-label' }, 'Réponses')
          )
        )
      ),
      React.createElement('div', { className: 'agent-list' },
        agents.map(agent =>
          React.createElement('div', {
            key: agent.id,
            className: `agent-card ${agent.color} ${agent.status}`
          },
            React.createElement('div', { className: 'agent-card-header' },
              React.createElement('div', { className: 'agent-avatar' }, agent.icon),
              React.createElement('div', { className: 'agent-info' },
                React.createElement('div', { className: 'agent-name' }, agent.name),
                React.createElement('div', { className: 'agent-role' }, agent.role)
              ),
              React.createElement('span', {
                className: `status-badge ${agent.status === 'busy' ? 'busy' : agent.status === 'error' ? 'error' : 'idle'}`
              }, agent.status === 'busy' ? '▶ En cours' : agent.status === 'error' ? '✗ Erreur' : '✓ Prêt')
            ),
            React.createElement('div', { className: 'agent-desc' }, agent.description)
          )
        )
      ),
      React.createElement('div', { className: 'agent-task-section' },
        React.createElement('textarea', {
          className: 'agent-task-input',
          value: taskInput,
          onChange: e => setTaskInput(e.target.value),
          placeholder: 'Décrivez une tâche pour les agents...'
        }),
        React.createElement('div', { className: 'agent-task-buttons' },
          React.createElement('button', { className: 'agent-task-btn', onClick: () => runTask('planner') }, '📋 Planifier'),
          React.createElement('button', { className: 'agent-task-btn', onClick: () => runTask('executor') }, '⚡ Coder'),
          React.createElement('button', { className: 'agent-task-btn', onClick: () => runTask('reviewer') }, '🔍 Review'),
          React.createElement('button', { className: 'agent-task-btn', onClick: () => runTask('debugger') }, '🐛 Debug'),
          React.createElement('button', { className: 'agent-task-btn pipeline', onClick: () => runPipelineTask('feature') }, '🚀 Feature'),
          React.createElement('button', { className: 'agent-task-btn pipeline', onClick: () => runPipelineTask('bugfix') }, '🛠️ Bugfix')
        ),
        taskResult && React.createElement('div', {
          className: 'task-result',
          style: { marginTop: 12, padding: 12, background: 'var(--bg-tertiary)', borderRadius: 8, fontSize: 13, whiteSpace: 'pre-wrap', maxHeight: 200, overflowY: 'auto' }
        }, taskResult)
      )
    ),

    React.createElement(SettingsModal, {
      key: settingsOpen ? 'open' : 'closed',
      open: settingsOpen,
      onClose: () => setSettingsOpen(false),
      settings,
      onSave: async (key, value) => {
        await window.api.setSetting(key, value);
        setSettings(prev => ({ ...prev, [key]: value }));
      }
    }),

    toast && React.createElement('div', {
      className: `toast toast-${toast.type}`,
      onClick: () => setToast(null)
    }, toast.message)
  );
}

const container = document.getElementById('root');
if (container) {
  const root = ReactDOM.createRoot(container);
  root.render(React.createElement(ErrorBoundary, null, React.createElement(App)));
}
