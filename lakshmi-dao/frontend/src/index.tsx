import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css'; // Assuming you'll create this for global styles / Tailwind base
import App from './App';
// import reportWebVitals from './reportWebVitals'; // Commented out due to missing file

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
// reportWebVitals(); // Commented out due to missing file
