import { Outlet } from 'react-router-dom'
import NavBar from '../components/NavBar.jsx'
import '../styles/layouts.css'

function DashboardLayout() {
  return (
    <div className="app-shell app-shell--dashboard">
      <NavBar />
      <main className="app-main app-main--dashboard">
        <Outlet />
      </main>
    </div>
  )
}

export default DashboardLayout
