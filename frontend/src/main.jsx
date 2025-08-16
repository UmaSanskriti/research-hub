import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { DataProvider } from './context/DataContext'; // Import the provider
import App from './App';
import './index.css'; // Your Tailwind CSS entry point

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <DataProvider> {/* Wrap App with the DataProvider */}
        <App />
      </DataProvider>
    </BrowserRouter>
  </React.StrictMode>
);