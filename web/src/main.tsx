import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { UserProvider } from './providers/user.tsx'
import { LoadingProvider } from './providers/loading.tsx'
import { ThemeProvider } from './components/theme-provider.tsx'
import { ConfigProvider } from './providers/config.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <ConfigProvider>
        <UserProvider>
          <LoadingProvider>
            <App />
          </LoadingProvider>
        </UserProvider>
      </ConfigProvider>
    </ThemeProvider>
  </StrictMode>,
)
