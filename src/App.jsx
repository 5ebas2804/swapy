import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useCurrentUser, useSwapyStore } from './store/useSwapyStore'
import { startSync } from './store/sync'
import UserLayout from './layouts/UserLayout'
import AdminLayout from './layouts/AdminLayout'
import LoginView from './views/auth/LoginView'
import StationsView from './views/user/StationsView'
import StationDetailView from './views/user/StationDetailView'
import ReservationSuccessView from './views/user/ReservationSuccessView'
import MyBatteryView from './views/user/MyBatteryView'
import WalletView from './views/user/WalletView'
import ProfileView from './views/user/ProfileView'
import AdminDashboard from './views/admin/AdminDashboard'

// Solo deja pasar si la sesión de esta pestaña tiene el rol pedido.
function RequireRole({ role, children }) {
  const session = useSwapyStore((s) => s.session)
  const user = useCurrentUser()
  if (!session || !user) return <Navigate to="/login" replace />
  if (session.role !== role) return <Navigate to={session.role === 'admin' ? '/admin' : '/app'} replace />
  return children
}

function Home() {
  const session = useSwapyStore((s) => s.session)
  const user = useCurrentUser()
  if (!session || !user) return <Navigate to="/login" replace />
  return <Navigate to={session.role === 'admin' ? '/admin' : '/app'} replace />
}

export default function App() {
  // Telemetría + sincronización entre pestañas: un bloqueo en Admin se refleja al instante en el repartidor.
  useEffect(() => startSync(), [])

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<LoginView />} />
      <Route path="/app" element={<RequireRole role="rider"><UserLayout /></RequireRole>}>
        <Route index element={<StationsView />} />
        <Route path="station/:stationId" element={<StationDetailView />} />
        <Route path="reservation" element={<ReservationSuccessView />} />
        <Route path="battery" element={<MyBatteryView />} />
        <Route path="wallet" element={<WalletView />} />
        <Route path="profile" element={<ProfileView />} />
      </Route>
      <Route path="/admin" element={<RequireRole role="admin"><AdminLayout /></RequireRole>}>
        <Route index element={<AdminDashboard />} />
      </Route>
      <Route path="*" element={<Home />} />
    </Routes>
  )
}
