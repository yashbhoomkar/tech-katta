import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './styles.css';

const buildShaMeta = document.querySelector('meta[name="tech-katta-build-sha"]');
if (buildShaMeta) buildShaMeta.setAttribute('content', __TECH_KATTA_BUILD_SHA__);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
