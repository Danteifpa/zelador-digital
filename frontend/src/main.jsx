import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import './index.css'
import { iniciarRegistroDeErros } from './lib/registroErros'

iniciarRegistroDeErros()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary nome="App" ecraInteiro>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
)
