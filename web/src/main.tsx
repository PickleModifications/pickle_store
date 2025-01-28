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
    <ConfigProvider>
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
          <UserProvider>
            <LoadingProvider>
              <App />
            </LoadingProvider>
          </UserProvider>
      </ThemeProvider>
    </ConfigProvider>
  </StrictMode>,
)
