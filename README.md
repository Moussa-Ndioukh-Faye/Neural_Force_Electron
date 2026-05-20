# NeuralForge

> Multi-agent AI coding assistant powered by local LLMs (Ollama). Built with Electron, React, and TypeScript.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
[![CI](https://github.com/Moussa-Ndioukh-Faye/Neural_Force_Electron/actions/workflows/ci.yml/badge.svg)](https://github.com/Moussa-Ndioukh-Faye/Neural_Force_Electron/actions/workflows/ci.yml)

---

## Features

### Multi-Agent System
Six core agents plus 12 extended roles in the catalog. Switch between **Single** mode (direct chat) or **Team** mode (orchestrated agent delegation).

| Mode | Description |
|------|-------------|
| 💬 **Single** | Direct conversation with your LLM |
| 👥 **Team** | Multi-agent orchestration with leader, planner, executor, reviewer, researcher, and debugger |

**Agent delegation** — mention agents with `@agent` syntax or use pipeline commands:
- `@planner Analyse ce projet`
- `@executor Écris une fonction`
- `@reviewer Review ce code`
- `@debugger Debug cette erreur`
- `pipeline:feature Créer une API REST`
- `pipeline:bugfix Corriger le bug`

### Streaming Responses
Real-time token-by-token streaming with blinking cursor for instant feedback.

### Conversation Management
- Create, rename (double-click), and delete conversations
- Search/filter conversations
- Export conversations to Markdown, JSON, or plain text
- Drag & drop files to attach code as formatted blocks

### UI & Experience
- **Dark/Light theme** toggle (persisted)
- **Responsive design** — hamburger sidebar at ≤900px, mobile-friendly at 600px
- **Keyboard shortcuts**: `Ctrl+N` new, `Ctrl+W` close, `Ctrl+,` settings, `Ctrl+Enter` send, `Escape` close modals
- **Toast notifications** for copy, export, file drops
- **Copy message** button on every AI response
- **Timestamps** on all messages
- **Intelligent auto-scroll** — scrolls only when near bottom
- **Shift+Enter** multiline input
- **i18n** — French UI with extensible JSON translation system

### Security
- **CSP** (Content Security Policy) — `session` + meta tag
- **Sandboxed command execution** — whitelist, blocked patterns, 10s timeout
- **AES-256 encrypted store** for conversation data
- **Error Boundary** + global error handlers
- `contextIsolation: true`, `nodeIntegration: false`

---

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Ollama](https://ollama.ai/) running locally with at least one model pulled

### Install & Run

```bash
git clone https://github.com/Moussa-Ndioukh-Faye/Neural_Force_Electron.git
cd Neural_Force_Electron
npm install
npm start
```

The app connects to `http://localhost:11434` by default. Configure your model in settings (`Ctrl+,`).

### Development

```bash
npm run start   # Launch in dev mode
npm run package # Package for distribution
npm run lint    # ESLint check
npm run test    # Run tests
```

---

## Architecture

```
neuralforge-electron/
├── src/                    # Main process + renderer
│   ├── index.ts            # Electron main process (IPC, streaming, store, menu)
│   ├── preload.ts          # Context bridge API
│   ├── renderer.tsx        # React UI
│   ├── SettingsModal.tsx   # Settings dialog
│   ├── MarkdownMessage.tsx # Markdown rendering (marked + DOMPurify + highlight.js)
│   ├── ErrorBoundary.tsx   # React error boundary
│   ├── index.css           # Global styles (dark/light themes, responsive)
│   └── i18n/               # Translation files (fr, en)
├── models/                 # Agent system
│   └── scripts/
│       ├── agents.ts       # MultiAgentSystem with streaming delegation
│       ├── agent-catalog.ts# 12 agent roles, keyword detection, pipelines
│       ├── tools.ts        # Sandboxed tool executor (shell, file, Python, Node)
│       ├── manager.ts      # Model management CLI
│       └── __tests__/      # 23 Jest tests
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop | Electron 33 |
| UI | React 18 (`createElement` API, no JSX) |
| Language | TypeScript 4.5 (strict) |
| Bundler | Webpack (Electron Forge) |
| Testing | Jest + ts-jest |
| Markdown | marked + DOMPurify + highlight.js |
| Storage | AES-256 encrypted JSON |
| Virtualization | react-window (conversations list) |

---

## Project Status

- **Phase 1** ✅ — Security, store, agents, CLI tools
- **Phase 2** ✅ — UI/UX, streaming, conversations, responsive design
- **Phase 3** ✅ — TypeScript strict, ESLint, full test suite, CI/CD
- **Phase 4** ✅ — i18n, shortcuts, custom menu, drag & drop, export, accessibility, virtual list
