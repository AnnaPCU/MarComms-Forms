import { useEffect, useState } from 'react'
import FormPage from './pages/FormPage'
import AdminPage from './pages/AdminPage'

// Hash routing (#/admin) keeps the app a single static file: no server rewrites needed.
function useHashRoute() {
  const [hash, setHash] = useState(() => window.location.hash)
  useEffect(() => {
    const onChange = () => setHash(window.location.hash)
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return hash.replace(/^#/, '') || '/'
}

export default function App() {
  const route = useHashRoute()
  return route.startsWith('/admin') ? <AdminPage /> : <FormPage />
}
