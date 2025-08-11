import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

function SimpleApp() {
  return (
    <div>
      <h1>Test App</h1>
      <p>This is a simple test component</p>
    </div>
  );
}

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <SimpleApp />
    </StrictMode>
  );
}