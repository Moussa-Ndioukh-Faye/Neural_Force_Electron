import * as React from 'react';

interface SettingsData {
  ollamaUrl: string;
  model: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  settings: SettingsData;
  onSave: (key: string, value: string) => void;
}

export function SettingsModal({ open, onClose, settings, onSave }: Props) {
  const [ollamaUrl, setOllamaUrl] = React.useState(settings.ollamaUrl);
  const [model, setModel] = React.useState(settings.model);
  const [models, setModels] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [saved, setSaved] = React.useState(false);

  React.useEffect(() => {
    loadModels();
  }, [open]);

  async function loadModels() {
    setLoading(true);
    try {
      const list = await window.api.getOllamaModels();
      setModels(list);
    } catch {
      setModels([]);
    }
    setLoading(false);
  }

  function handleSave(key: string, value: string) {
    onSave(key, value);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') onClose();
  }

  if (!open) return null;

  return React.createElement('div', {
    className: 'modal-overlay',
    onClick: (e: React.MouseEvent) => { if (e.target === e.currentTarget) onClose(); },
    onKeyDown: handleKeyDown
  },
    React.createElement('div', { className: 'modal-content settings-modal' },
      React.createElement('div', { className: 'modal-header' },
        React.createElement('h2', null, '⚙️ Paramètres'),
        React.createElement('button', { className: 'modal-close', onClick: onClose }, '✕')
      ),

      React.createElement('div', { className: 'modal-body' },
        // Ollama URL
        React.createElement('div', { className: 'settings-field' },
          React.createElement('label', { className: 'settings-label' }, 'Ollama URL'),
          React.createElement('div', { className: 'settings-input-row' },
            React.createElement('input', {
              className: 'settings-input',
              type: 'url',
              value: ollamaUrl,
              onChange: e => setOllamaUrl(e.target.value),
              placeholder: 'http://localhost:11434'
            }),
            React.createElement('button', {
              className: 'settings-save-btn',
              onClick: () => handleSave('ollamaUrl', ollamaUrl)
            }, 'Sauvegarder')
          )
        ),

        // Model
        React.createElement('div', { className: 'settings-field' },
          React.createElement('label', { className: 'settings-label' }, 'Modèle'),
          React.createElement('div', { className: 'settings-input-row' },
            React.createElement('select', {
              className: 'settings-input settings-select',
              value: model,
              onChange: e => setModel(e.target.value)
            },
              models.length === 0 && React.createElement('option', { value: model }, model || 'Aucun modèle'),
              models.map(m => React.createElement('option', { key: m, value: m }, m))
            ),
            React.createElement('button', {
              className: 'settings-save-btn',
              onClick: () => handleSave('model', model)
            }, 'Sauvegarder'),
            React.createElement('button', {
              className: 'settings-refresh-btn',
              onClick: loadModels,
              disabled: loading,
              title: 'Rafraîchir la liste'
            }, loading ? '⟳' : '↻')
          ),
          React.createElement('span', { className: 'settings-hint' },
            models.length > 0
              ? `${models.length} modèle(s) disponible(s) sur Ollama`
              : 'Aucun modèle trouvé. Vérifiez qu\'Ollama est lancé.'
          )
        ),

        // Info
        React.createElement('div', { className: 'settings-info' },
          React.createElement('p', null, '🔒 Les données sont chiffrées avec AES-256'),
          React.createElement('p', null, '💡 Les modifications prennent effet immédiatement')
        )
      ),

      saved && React.createElement('div', { className: 'settings-toast' }, '✅ Paramètre sauvegardé')
    )
  );
}
