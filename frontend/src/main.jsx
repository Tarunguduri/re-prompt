import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import CursorFollower from './components/CursorFollower.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <CursorFollower />
    <App />
  </StrictMode>,
)
