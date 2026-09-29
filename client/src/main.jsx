import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UIProvider } from './ui';
import App from './App';
import './styles/styles.css';
import './styles/site.css';
import './styles/app.css';

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 15000, refetchOnWindowFocus: false, retry: (n, e) => n < 1 && (!e.status || e.status >= 500) } } });

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <UIProvider><App /></UIProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
