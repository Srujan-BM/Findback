import { useEffect, useMemo, useState } from 'react'
import { api, errorMessage, setCsrfToken } from '../api/client'
import { AuthContext } from './auth'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState('')

  useEffect(() => {
    api.get('/auth/me')
      .then(async ({ data }) => {
        const { data: security } = await api.get('/auth/csrf')
        setCsrfToken(security.csrfToken)
        setUser(data.user)
      })
      .catch((error) => {
        setUser(null)
        if (error.response?.status !== 401) setAuthError(errorMessage(error))
      })
      .finally(() => setLoading(false))
  }, [])

  const value = useMemo(() => ({
    user,
    loading,
    authError,
    signIn: (nextUser, token) => {
      setCsrfToken(token)
      setAuthError('')
      setUser(nextUser)
    },
    signOut: async () => {
      await api.post('/auth/logout')
      setUser(null)
      setCsrfToken('')
    },
  }), [user, loading, authError])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

