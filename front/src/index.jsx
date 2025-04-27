import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import App from './App';
import AddRoutePage from '../src/components/AddRoute';
import 'leaflet-routing-machine';
import 'leaflet/dist/leaflet.css';
import './style.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Router>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/add-route" element={<AddRoutePage />} />
      </Routes>
    </Router>
  </React.StrictMode>
);