# PLAN DE DÉVELOPPEMENT — NeuralForge

## 📊 Vue d'ensemble

| Métrique | Valeur |
|----------|--------|
| Statut | Pre-Alpha / Prototype |
| Lignes de code | ~1 100 (TS/TSX/CSS) |
| Fichiers sources | 15 |
| Tests | 0 |
| Dépendances | 12 |
| Niveau actuel | **2/5** — Prototype fonctionnel |
| Cible | **4/5** — Production (usage quotidien) |

---

## PHASE 1 — Fondation Sécurisée & Fonctionnelle
**Objectif : App stable, sécurisée, qui répond via Ollama sans crash**

### 1.1 — Chiffrement du store (sécurité données)
- **Tâche** : Configurer `electron-store` avec chiffrement AES
- **Fichier** : `src/index.ts:26-31`
- **Détail** : Ajouter `encryptionKey` basé sur machine ID (via `safeStorage` ou `node-machine-id`)
- **Risque** : Perte de clé = perte des données. Solution : stocker dans le keychain OS

### 1.2 — Content Security Policy (CSP)
- **Tâche** : Ajouter une CSP stricte dans `<meta>` ou via `session.defaultSession.webRequest`
- **Fichier** : `src/index.html:4-6`
- **Règle** : `default-src 'self'; script-src 'self'; connect-src 'self' http://localhost:*; style-src 'self' 'unsafe-inline'`
- **Pourquoi** : Empêche XSS même si le renderer est compromis

### 1.3 — Remplacer `run-command` par une version sandboxée
- **Fichier** : `src/index.ts:238-245`
- **Solution** : 
  - Whitelist de commandes autorisées : `['git', 'npm', 'node', 'python', 'pip', 'ls', 'dir', 'cat', 'type', 'echo']`
  - Liste noire absolue : `['rm -rf', 'del /f', 'format', 'shutdown', 'net user']`
  - Timeout maximum : 10s
  - Confirmation utilisateur obligatoire si commande non reconnue
  - Logguer toutes les commandes exécutées

### 1.4 — Vrai rendu Markdown dans les messages
- **Fichier** : `src/renderer.tsx:172-183`
- **Solution** : 
  - Installer `marked` + `DOMPurify` (ou `rehype-sanitize`)
  - Remplacer `<div className="message-content">{m.content}</div>` par un rendu markdown sécurisé
  - Ajouter coloration syntaxique avec `highlight.js` ou `prism.js`
- **Dépendances** : `marked`, `dompurify`, `highlight.js`

### 1.5 — Mode Single : historique complet du contexte
- **Fichier** : `src/index.ts:178-181`
- **Bug** : Actuellement n'envoie que les messages comme contexte mais pas le system prompt avant chaque message dans la liste
- **Fix** : Construire un tableau `messages` complet avec `{role: 'system', content: '...'}` en premier, puis user/assistant

### 1.6 — Error Boundary React
- **Fichier** : Nouveau fichier `src/ErrorBoundary.tsx`
- **Comportement** : Affiche "Une erreur est survenue" + bouton "Recharger" au lieu d'écran blanc
- **Wrapper** : `<ErrorBoundary><App /></ErrorBoundary>` dans `renderer.tsx`

### 1.7 — Gestion erreurs globale (main process)
- **Fichier** : `src/index.ts` (nouveau bloc après `app.on('ready')`)
- **Ajouter** :
  - `process.on('uncaughtException', handler)` → log + dialog + quit
  - `process.on('unhandledRejection', handler)` → log + dialog
  - `mainWindow.on('unresponsive', handler)` → dialog "forcer fermeture ?"

### 1.8 — Ajouter les dépendances manquantes
- `node-fetch` n'est plus nécessaire (on utilise `fetch` natif Node 18+) ✅ déjà fait
- Ajouter `marked`, `dompurify`, `highlight.js`
- Supprimer `openai` du `package.json` si non utilisé (ou le garder pour futur provider)

**🎯 Livrable Phase 1 : `v1.1-secure`**
- App ne crash pas
- CSP active
- Messages formatés en Markdown
- Données chiffrées
- Commandes sandboxées

---

## PHASE 2 — Expérience Utilisateur & Robustesse
**Objectif : Une app qu'on peut montrer à quelqu'un**

### 2.1 — UI Settings (modale de configuration)
| Champ | Type | Default |
|-------|------|---------|
| Ollama URL | input URL | `http://localhost:11434` |
| Modèle | select (liste dynamique via `/api/tags`) | `qwen2.5-coder` |
| Température | slider 0-2 | `0.7` |
| Mode par défaut | toggle Single/Team | `single` |
| Langue | select EN/FR | `fr` |

- **Fichiers** : Nouveau composant `SettingsModal.tsx` + CSS
- **IPC** : Réutiliser `get-setting`/`set-setting` existants
- **UI** : Icône ⚙️ dans la sidebar header → modale centrée

### 2.2 — Auto-détection des modèles Ollama disponibles
- **Fichier** : `src/index.ts` (nouvel IPC handler)
- **Nouvel IPC** : `get-ollama-models` → appelle `GET /api/tags` → retourne la liste des modèles
- **UI** : Le select "Modèle" dans Settings se remplit automatiquement

### 2.3 — Streaming des réponses Ollama
- **Fichier** : `models/scripts/agents.ts:72-90` et `src/index.ts:138-191`
- **Actuel** : `stream: false` → réponse complète
- **Cible** : `stream: true` → SSE → événements IPC `chat:chunk` → affichage progressif dans l'UI
- **UX** : Curseur clignotant pendant la réception, chaque token s'affiche en temps réel
- **IPC** : Passer de `invoke` (requête-réponse) à `on`/`send` (événements)

### 2.4 — Auto-scroll intelligent
- **Fichier** : `src/renderer.tsx:33-35`
- **Bug** : Si l'utilisateur a scrollé vers le haut pour lire, l'auto-scroll le force en bas
- **Fix** : Ne scroller que si l'utilisateur était déjà en bas de la conversation (détection via `scrollHeight - scrollTop < 100`)

### 2.5 — Timestamps sur les messages
- **Fichier** : `src/renderer.tsx:172-183`
- **Format** : `14:23` ou `Hier 09:15` ou `15 mai 14:23`
- **Afficher** : En petit, gris, en dessous du contenu du message

### 2.6 — Bouton copier sur les messages
- **Fichier** : `src/renderer.tsx:172-183`
- **UI** : Icône 📋 au hover du message → copie le contenu dans le presse-papier
- **IPC** : `navigator.clipboard.writeText()` ou IPC `copy-to-clipboard`

### 2.7 — Supprimer / Renommer les conversations
- **Fichier** : `src/renderer.tsx:137-147`
- **Supprimer** : Bouton 🗑️ au hover de l'item → confirmation dialog
- **Renommer** : Double-click sur le titre → `<input>` inline → Enter valide, Escape annule

### 2.8 — Support Shift+Enter (multiligne)
- **Fichier** : `src/renderer.tsx:191-199`
- **Changement** : Remplacer `<input>` par `<textarea>` avec `rows={1}` et auto-resize
- **Comportement** : Enter envoie, Shift+Enter = nouvelle ligne

### 2.9 — Responsive design (sidebar repliable)
- **Fichier** : `src/index.css`
- **Breakpoints** :
  - `< 900px` : sidebar passe en icônes uniquement (60px)
  - `< 600px` : sidebar masquée, bouton hamburger ☰
  - Team panel : idem, bascule à droite

### 2.10 — Notifications toast pour les erreurs
- **Fichier** : Nouveau composant `Toast.tsx`
- **Durée** : 5 secondes auto-dismiss
- **Types** : `error` (rouge), `success` (vert), `info` (bleu)

**🎯 Livrable Phase 2 : `v1.2-beta`**
- Settings fonctionnels
- Markdown rendu
- Conversations gérables
- Responsive
- Streaming

---

## PHASE 3 — Qualité Logicielle & Industrialisation
**Objectif : On peut merger, builder, livrer en confiance**

### 3.1 — Tests unitaires (Jest + Testing Library)
- **Tests IPC handlers** : `src/__tests__/index.test.ts`
  - `get-conversations` retourne bien la liste
  - `create-conversation` crée et persiste
  - `chat` répond correctement en mode single/team
  - `ollamaChat` gère les erreurs réseau
- **Tests agents** : `models/scripts/__tests__/agents.test.ts`
  - `MultiAgentSystem.getAgentList()` retourne 6 agents
  - `agentSystem.delegateTask()` avec agent valide/invalide
  - `detectAgentFromMessage()` détection par mot-clé
- **Tests renderer** : `src/__tests__/App.test.tsx`
  - Rendu sans crash
  - Bouton "New" crée une conversation
  - Envoi de message

### 3.2 — Configuration CI/CD (GitHub Actions)
- **Fichier** : `.github/workflows/ci.yml`
- **Étapes** :
  1. `npm ci` — installation
  2. `npm run lint` — ESLint
  3. `npm run typecheck` — TypeScript
  4. `npm test` — Jest
  5. `npm run package` — Build Electron
- **Déclencheurs** : push sur `main`, pull requests

### 3.3 — TypeScript strict
- **Fichier** : `tsconfig.json`
- **Passer** : `"strict": true`
- **Corriger** : Tous les `any` :
  - `src/index.ts` : `body: any`, `e: any`, `(settings: any)`
  - `src/renderer.tsx` : `convs: any[]`, `msgs: any[]`, `e: any`, `catch {}`
  - `models/scripts/agents.ts` : `body: any`, `e: any`, `catch (e: any)`
- **Installation** : `npm i -D @types/node` (ou mise à jour)

### 3.4 — ESLint renforcé
- **Fichier** : `.eslintrc.json`
- **Règles à ajouter** :
  - `@typescript-eslint/no-explicit-any: error`
  - `@typescript-eslint/no-floating-promises: error`
  - `react-hooks/rules-of-react-hooks: error`
  - `react-hooks/exhaustive-deps: warn`
  - `no-console: warn` (sauf `logger`)

### 3.5 — Packaging production
- **Icône** : Générer ou trouver une icône `.ico` (Windows), `.icns` (macOS), `.png` (Linux)
- **Config** : `forge.config.ts:15-17`
  ```ts
  packagerConfig: {
    asar: true,
    icon: './assets/icon'
  }
  ```
- **MakerSquirrel** : Ajouter `name`, `description`, `setupIcon`
- **Code signing** : Documenter la procédure (nécessite certificat Apple + Windows)

### 3.6 — Auto-updater
- **Dépendance** : `electron-updater`
- **Config** : 
  - Publier sur GitHub Releases
  - Vérifier les mises à jour au démarrage
  - Download progress + notification "Mise à jour disponible"
- **Forge publisher** : `@electron-forge/publisher-github`

### 3.7 — Logging structuré
- **Dépendance** : `electron-log`
- **Fichiers** :
  - `src/index.ts` → `log.info('App started')`, `log.error('IPC failed', err)`
  - `models/scripts/agents.ts` → `log.info('[Agent] planner started task')`
- **Niveaux** : `error`, `warn`, `info`, `debug`
- **Sortie** : Fichier dans `%APPDATA%/NeuralForge/logs/`

**🎯 Livrable Phase 3 : `v1.3-rc`**
- Tests verts
- CI/CD active
- TypeScript strict
- Packaging OK
- Auto-updates

---

## PHASE 4 — Polissage & Fonctionnalités Avancées
**Objectif : Expérience utilisateur premium**

### 4.1 — Internationalisation (i18n)
- **Fichier** : Nouveaux fichiers `src/i18n/fr.json`, `src/i18n/en.json`
- **Lib** : `i18next` (léger) ou simple store avec switch
- **Clés** : Toutes les chaînes UI : boutons, placeholders, titres

### 4.2 — Accessibilité (a11y)
- **ARIA** : `role="button"`, `aria-label` sur les boutons sans texte
- **Focus** : Ordre de tabulation logique, focus visible
- **Clavier** : Tab dans le chat, Escape ferme les modales
- **Contraste** : Vérifier ratio 4.5:1 minimum

### 4.3 — Virtualisation des listes
- **Dépendance** : `react-window` ou `@tanstack/react-virtual`
- **Conversations** : `FixedSizeList` (hauteur 60px par item)
- **Messages** : `FixedSizeList` avec auto-scroll

### 4.4 — Drag & drop de fichiers
- **Fichier** : `src/renderer.tsx`
- **Events** : `onDragOver`, `onDrop` sur le chat area
- **Traitement** : Lire le fichier → détecter le type (code, image, texte) → l'ajouter comme contexte du message
- **IPC** : `read-file` pour lire le contenu dans le main process

### 4.5 — Export de conversation
- **Formats** : Markdown (`.md`), JSON (`.json`), Texte brut (`.txt`)
- **IPC** : `export-conversation` → formate et écrit le fichier via `dialog.showSaveDialog`

### 4.6 — Menu personnalisé
- **Fichier** : `src/index.ts` (nouveau bloc après `createWindow`)
- **Items** : Fichier (New, Open, Save), Edition (Copy, Paste), Aide (About, Check Updates)

### 4.7 — Raccourcis clavier
| Raccourci | Action |
|-----------|--------|
| `Ctrl+N` | Nouvelle conversation |
| `Ctrl+W` | Fermer conversation |
| `Ctrl+,` | Ouvrir Settings |
| `Ctrl+Shift+F` | Plein écran |
| `Escape` | Annuler / Fermer modale |
| `Ctrl+Enter` | Envoyer (alternative) |

**🎯 Livrable Phase 4 : `v2.0` — Production**

---

## 📅 Timeline estimée

| Phase | Heures | Dépendances |
|-------|--------|-------------|
| P1 — Fondation | ~10.5h | — |
| P2 — UX & Robustesse | ~20h | P1 |
| P3 — Qualité & CI | ~24h | P1 |
| P4 — Polissage | ~19h | P2 + P3 |
| **Total** | **~73h** | |

---

## 🧱 Architecture technique cible

```
src/
├── index.ts              # Main process (IPC, store, fenêtre)
├── preload.ts            # Bridge API
├── renderer.tsx          # Point d'entrée React
├── ErrorBoundary.tsx     # Gestion erreurs React
├── components/
│   ├── App.tsx           # Composant principal
│   ├── Sidebar.tsx       # Conversations liste
│   ├── ChatArea.tsx      # Messages + input
│   ├── TeamPanel.tsx     # Agents + tâches
│   ├── SettingsModal.tsx # Configuration
│   └── Toast.tsx         # Notifications
├── i18n/
│   ├── fr.json
│   └── en.json
├── __tests__/
│   ├── index.test.ts
│   └── App.test.tsx
└── index.css

models/scripts/
├── agents.ts             # MultiAgentSystem
├── agent-catalog.ts      # Catalogue agents
└── tools.ts              # Tool executor
```

---

## 🛑 Bloqueurs & Risques

| Risque | Probabilité | Impact | Mitigation |
|--------|-------------|--------|------------|
| Ollama pas installé | Haute | Bloque tout | Détection + guide dans Settings |
| Incompatibilité TypeScript 4.5 | Haute | Build fail | Monter à TS 5.x ou ajouter `skipLibCheck` |
| `electron-store` chiffré → perte données | Moyenne | Critique | Backup automatique, safeStorage |
| Performance avec 1000+ conversations | Faible | UX dégradée | Virtualisation (P4.3) |
| Sécurité : CSP trop stricte bloque Ollama | Moyenne | Fonctionnel cassé | CSP avec `connect-src http://localhost:*` |
| Tests : impossible de mock Ollama | Moyenne | Tests lents | Mock fetch global dans Jest |
