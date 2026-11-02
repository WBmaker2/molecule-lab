import { createRoot } from 'react-dom/client';
import './ui/styles/main.css';
import { App } from './app/App';

const rootElement = document.getElementById('app');
const boot = document.getElementById('boot');

if (rootElement) {
  createRoot(rootElement).render(<App />);
  boot?.remove();
}
