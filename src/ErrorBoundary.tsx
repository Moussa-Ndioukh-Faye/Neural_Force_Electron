import * as React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[NeuralForge] React Error:', error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return React.createElement('div', {
        style: {
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: '#0a0a0b',
          color: '#fafafa',
          fontFamily: 'Inter, sans-serif',
          padding: 40,
          textAlign: 'center',
          gap: 16
        }
      },
        React.createElement('div', { style: { fontSize: 48 } }, '🧠'),
        React.createElement('h1', { style: { fontSize: 24, margin: 0 } }, 'Une erreur est survenue'),
        React.createElement('p', {
          style: { color: '#a1a1aa', maxWidth: 400, fontSize: 14, lineHeight: 1.6 }
        }, this.state.error?.message || 'Erreur inconnue'),
        React.createElement('div', { style: { display: 'flex', gap: 12, marginTop: 8 } },
          React.createElement('button', {
            onClick: this.handleReset,
            style: {
              padding: '12px 24px',
              background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
              color: 'white',
              border: 'none',
              borderRadius: 10,
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: 14
            }
          }, '🔄 Réessayer'),
          React.createElement('button', {
            onClick: this.handleReload,
            style: {
              padding: '12px 24px',
              background: '#18181b',
              color: '#a1a1aa',
              border: '1px solid #27272a',
              borderRadius: 10,
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: 14
            }
          }, '↻ Recharger')
        )
      );
    }

    return this.props.children;
  }
}
