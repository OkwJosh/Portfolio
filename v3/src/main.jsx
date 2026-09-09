import { Component, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles/index.css';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('App Runtime Error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', color: '#ff6b6b', background: '#0a0b10', fontFamily: 'monospace', minHeight: '100vh', zIndex: 99999, position: 'relative' }}>
          <h2 style={{ fontSize: '24px', marginBottom: '16px', color: '#ef4444' }}>Runtime Exception Detected</h2>
          <pre style={{ background: '#181a24', padding: '20px', borderRadius: '8px', overflow: 'auto', border: '1px solid #ef4444' }}>
            {this.state.error && this.state.error.toString()}
            {'\n'}
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

window.addEventListener('error', (event) => {
  console.error('Global Error:', event.error || event.message);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled Rejection:', event.reason);
});

/**
 * Drop the build-time static rendering once the app owns the page.
 *
 * It is already display:none by then (the <head> script sets data-js before
 * first paint), so this is not about flicker — it is about not leaving a
 * hidden duplicate of every heading in the DOM of a page that has the real
 * thing. See plugins/seo.js for why it is in the HTML at all.
 */
document.getElementById('static-content')?.remove();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
