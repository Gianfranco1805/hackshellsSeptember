import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { WalkSessionProvider } from './context/WalkSessionContext'
import { AppRouter } from './router/AppRouter'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <WalkSessionProvider>
          <AppRouter />
        </WalkSessionProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
