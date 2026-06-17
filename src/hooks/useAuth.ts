import { useState, useEffect, useCallback } from 'react'
import {
  InteractionRequiredAuthError,
  PublicClientApplication,
  type AccountInfo,
} from '@azure/msal-browser'

const graphScopes = ['Calendars.ReadWrite']

const authConfig = {
  clientId: import.meta.env.VITE_ENTRA_CLIENT_ID as string | undefined,
  tenantId: (import.meta.env.VITE_ENTRA_TENANT_ID as string | undefined) || 'common',
  redirectUri: import.meta.env.VITE_REDIRECT_URI as string | undefined,
}

let authClient: PublicClientApplication | null | undefined

function createAuthClient() {
  if (authClient !== undefined) return authClient
  if (!authConfig.clientId) {
    authClient = null
    return null
  }
  authClient = new PublicClientApplication({
    auth: {
      clientId: authConfig.clientId,
      authority: `https://login.microsoftonline.com/${authConfig.tenantId}`,
      redirectUri: authConfig.redirectUri || window.location.origin,
    },
    cache: { cacheLocation: 'localStorage' },
  })
  return authClient
}

function getAuthErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

function getMsalErrorCode(error: unknown) {
  if (typeof error === 'object' && error !== null && 'errorCode' in error) {
    const code = (error as { errorCode?: unknown }).errorCode
    return typeof code === 'string' ? code : null
  }
  return null
}

function needsInteractiveToken(error: unknown) {
  return error instanceof InteractionRequiredAuthError || getMsalErrorCode(error) === 'timed_out'
}

export function useAuth() {
  const [account, setAccount] = useState<AccountInfo | null>(null)
  const [authMessage, setAuthMessage] = useState('')
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [calendarAccessToken, setCalendarAccessToken] = useState<string | null>(null)

  useEffect(() => {
    const client = createAuthClient()
    if (!client) return

    const loadAccount = async () => {
      await client.initialize()
      const redirectResult = await client.handleRedirectPromise()
      const existing = redirectResult?.account ?? client.getAllAccounts()[0]
      if (redirectResult?.accessToken) setCalendarAccessToken(redirectResult.accessToken)
      if (existing) {
        client.setActiveAccount(existing)
        setAccount(existing)
        setAuthMessage('Signed in with Microsoft Outlook calendar access.')
      }
    }

    void loadAccount().catch((err: unknown) => {
      setAuthMessage(`Microsoft sign-in could not be restored: ${getAuthErrorMessage(err)}`)
    })
  }, [])

  const signIn = useCallback(async () => {
    const client = createAuthClient()
    if (!client) {
      setAuthMessage('Microsoft sign-in needs an approved Microsoft Entra app registration. Local planning works without it.')
      return
    }
    if (isSigningIn) return
    setIsSigningIn(true)
    try {
      await client.initialize()
      await client.loginRedirect({
        scopes: graphScopes,
        prompt: account ? 'consent' : 'select_account',
      })
    } catch (err: unknown) {
      setAuthMessage(`Microsoft sign-in failed: ${getAuthErrorMessage(err)}`)
      setIsSigningIn(false)
    }
  }, [account, isSigningIn])

  const signOut = useCallback(async () => {
    const client = createAuthClient()
    setAccount(null)
    setCalendarAccessToken(null)
    if (!client) return
    try {
      await client.initialize()
      const a = account ?? client.getActiveAccount() ?? client.getAllAccounts()[0]
      await client.logoutRedirect({
        account: a ?? undefined,
        postLogoutRedirectUri: window.location.origin,
      })
    } catch (err: unknown) {
      setAuthMessage(`Microsoft sign-out failed: ${getAuthErrorMessage(err)}`)
    }
  }, [account])

  const getAccessToken = useCallback(async (): Promise<string> => {
    const client = createAuthClient()
    if (!client || !account) throw new Error('Connect Microsoft 365 before syncing.')

    if (calendarAccessToken) return calendarAccessToken

    await client.initialize()
    try {
      const result = await client.acquireTokenSilent({ account, scopes: graphScopes })
      setCalendarAccessToken(result.accessToken)
      return result.accessToken
    } catch (err) {
      if (needsInteractiveToken(err)) {
        // Try interactive token acquisition
        try {
          await client.initialize()
          await client.loginRedirect({ scopes: graphScopes, prompt: 'consent' })
        } catch (redirectErr: unknown) {
          throw new Error(`Microsoft needs interactive consent: ${getAuthErrorMessage(redirectErr)}`, { cause: redirectErr })
        }
        throw new Error('Redirecting for consent...', { cause: err })
      }
      throw err
    }
  }, [account, calendarAccessToken])

  const graphRequest = useCallback(async <T,>(pathOrUrl: string, options: RequestInit = {}): Promise<T> => {
    const token = await getAccessToken()
    const url = pathOrUrl.startsWith('https://') ? pathOrUrl : `https://graph.microsoft.com/v1.0${pathOrUrl}`
    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Prefer: 'outlook.timezone="UTC"',
        ...options.headers,
      },
    })
    if (!response.ok) {
      const text = await response.text()
      // If token expired, clear it so next call gets a fresh one
      if (response.status === 401) {
        setCalendarAccessToken(null)
      }
      throw new Error(`Microsoft Graph request failed (${response.status}): ${text}`)
    }
    return (await response.json()) as T
  }, [getAccessToken])

  return {
    account,
    authMessage,
    setAuthMessage,
    isSigningIn,
    calendarAccessToken,
    signIn,
    signOut,
    getAccessToken,
    graphRequest,
    setCalendarAccessToken,
  }
}
