import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ToastProvider } from './components/ToastProvider';
import { AppContextProvider } from './contexts/AppContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { storageService } from './services/storageService';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

storageService.initializeStorage().then(() => {
  root.render(
    <React.StrictMode>
      <ThemeProvider>
        <ToastProvider>
          <AppContextProvider>
            <App />
          </AppContextProvider>
        </ToastProvider>
      </ThemeProvider>
    </React.StrictMode>
  );
}).catch(err => {
  console.error("Failed to initialize storage:", err);
  root.render(<div>Failed to load application data. Please check connection.</div>);
});