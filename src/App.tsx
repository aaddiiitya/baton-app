// ---------------------------------------------------------------------------
// Baton — app shell: routing + session state.
//
// The source of truth is now the Supabase database, reached through the Python
// API (src/lib/api.ts). App keeps the latest copy of the user's house in state
// and passes data and callbacks down to each screen through props.
// ---------------------------------------------------------------------------

import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import type {
  AppState,
  Handover,
  HandoverInput,
  HandoverResult,
  JoinHouseInput,
  NewDamageInput,
  NewHouseInput,
} from './types'
import { api, ApiError, clearToken, getToken, setToken } from './lib/api'

import LoginScreen from './screens/LoginScreen'
import SetupScreen from './screens/SetupScreen'
import TimelineScreen from './screens/TimelineScreen'
import LogDamageScreen from './screens/LogDamageScreen'
import HandoverScreen from './screens/HandoverScreen'
import ResultScreen from './screens/ResultScreen'
import ExitPackScreen from './screens/ExitPackScreen'

function BatonApp() {
  const navigate = useNavigate()

  // --- Session state ----------------------------------------------------------
  const [data, setData] = useState<AppState | null>(null)
  const [loading, setLoading] = useState<boolean>(() => getToken() !== null)
  const [lastResult, setLastResult] = useState<{ result: HandoverResult; handover: Handover } | null>(null)

  // On first load, restore the session from the saved token (if any).
  useEffect(() => {
    if (!getToken()) return
    api
      .state()
      .then(setData)
      .catch(() => clearToken())
      .finally(() => setLoading(false))
  }, [])

  /** If the token expired mid-session, send the user back to log in. */
  function handleAuthError(err: unknown): never {
    if (err instanceof ApiError && err.status === 401) {
      clearToken()
      setData(null)
      navigate('/login')
    }
    throw err
  }

  // --- Handlers (passed to screens as props) ----------------------------------

  async function handleAuth(mode: 'login' | 'signup', email: string, password: string) {
    const auth = mode === 'signup' ? await api.signup(email, password) : await api.login(email, password)
    setToken(auth.accessToken)
    const state = await api.state()
    setData(state)
    navigate(state.house ? '/timeline' : '/setup')
  }

  function handleLogout() {
    clearToken()
    setData(null)
    setLastResult(null)
    navigate('/login')
  }

  async function handleCreateHouse(input: NewHouseInput) {
    try {
      setData(await api.createHouse(input))
      navigate('/timeline')
    } catch (err) {
      handleAuthError(err)
    }
  }

  async function handleJoinHouse(input: JoinHouseInput) {
    try {
      setData(await api.joinHouse(input))
      navigate('/timeline')
    } catch (err) {
      handleAuthError(err)
    }
  }

  async function handleAddDamage(input: NewDamageInput) {
    try {
      setData(await api.addDamage(input))
      navigate('/timeline')
    } catch (err) {
      handleAuthError(err)
    }
  }

  async function handleConfirmHandover(input: HandoverInput) {
    try {
      const res = await api.confirmHandover(input)
      setData(res.state)
      setLastResult({ result: res.result, handover: res.handover })
      navigate('/result')
    } catch (err) {
      handleAuthError(err)
    }
  }

  // --- Derived values -----------------------------------------------------------
  if (loading) {
    return <p className="pt-24 text-center text-sm text-muted">Loading your house record...</p>
  }

  const user = data?.user ?? null
  const house = data?.house ?? null
  const timeline = data?.timeline ?? []
  const me = house?.residents.find((r) => r.id === user?.id)
  const isCurrent = me?.isCurrent ?? false
  const currentResidents = house ? house.residents.filter((r) => r.isCurrent) : []
  const damageEntries = timeline.filter((e) => e.kind === 'damage')
  const roomsChecked = new Set(damageEntries.map((e) => e.room).filter(Boolean)).size

  // Where a logged-in user without access to a screen should go instead.
  const home = !user ? '/login' : house ? '/timeline' : '/setup'

  return (
    <div className="min-h-screen bg-canvas">
      {/* Centred mobile column, max ~420px wide */}
      <div className="mx-auto w-full max-w-[420px] px-5 py-8">
        <Routes>
          <Route
            path="/login"
            element={user ? <Navigate to={home} replace /> : <LoginScreen onAuth={handleAuth} />}
          />

          <Route
            path="/setup"
            element={
              user && !house ? (
                <SetupScreen
                  email={user.email}
                  onCreate={handleCreateHouse}
                  onJoin={handleJoinHouse}
                  onLogout={handleLogout}
                />
              ) : (
                <Navigate to={home} replace />
              )
            }
          />

          <Route
            path="/timeline"
            element={
              user && house ? (
                <TimelineScreen
                  house={house}
                  timeline={timeline}
                  currentUser={user}
                  isCurrent={isCurrent}
                  hasHandover={data?.handover?.incomingResponse === 'agree'}
                  onLogout={handleLogout}
                />
              ) : (
                <Navigate to={home} replace />
              )
            }
          />

          <Route
            path="/log-damage"
            element={
              user && house && isCurrent ? (
                <LogDamageScreen residents={currentResidents} currentUserId={user.id} onSave={handleAddDamage} />
              ) : (
                <Navigate to={home} replace />
              )
            }
          />

          <Route
            path="/handover"
            element={
              user && house && isCurrent ? (
                <HandoverScreen
                  currentUser={user}
                  currentResidents={currentResidents}
                  roomsChecked={roomsChecked}
                  damageItemsLogged={damageEntries.length}
                  onConfirm={handleConfirmHandover}
                />
              ) : (
                <Navigate to={home} replace />
              )
            }
          />

          <Route
            path="/result"
            element={
              user && lastResult ? (
                <ResultScreen
                  result={lastResult.result}
                  handover={lastResult.handover}
                  outgoingName={user.firstName}
                  outgoingColour={me?.colour ?? null}
                />
              ) : (
                <Navigate to={home} replace />
              )
            }
          />

          <Route
            path="/exit-pack"
            element={
              user && house && data?.handover ? (
                <ExitPackScreen currentUser={user} house={house} timeline={timeline} handover={data.handover} />
              ) : (
                <Navigate to={home} replace />
              )
            }
          />

          {/* Unknown paths and the root go to the right starting screen. */}
          <Route path="*" element={<Navigate to={home} replace />} />
        </Routes>
      </div>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <BatonApp />
    </BrowserRouter>
  )
}

export default App
