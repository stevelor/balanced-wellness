import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import Navbar from '../components/Navbar'
import AdminVitals from '../components/AdminVitals'
import AdminManual from '../components/AdminManual'
import AdminAppointments from '../components/AdminAppointments'
import BlockedDatesManager from '../components/BlockedDatesManager'
import AvailabilityManager from '../components/AvailabilityManager'
import ServiceListItem from '../components/ServiceListItem' // <-- Adjusted Import

export default function AdminDashboard() {
  const navigate = useNavigate()

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) navigate('/login') 
    }
    checkUser()
  }, [navigate])

  return (
    <div style={{ backgroundColor: '#f9fafb', minHeight: '100vh', paddingBottom: '60px' }}>
      <Navbar />
      
      <div style={{ maxWidth: '1100px', margin: '40px auto', padding: '0 20px' }}>
        
        {/* --- Dashboard Header --- */}
        <div style={{ marginBottom: '30px' }}>
          <h1 style={{ color: '#2c3e50', margin: '0 0 8px 0', fontSize: '2rem' }}>Admin Dashboard</h1>
          <p style={{ color: '#666', margin: 0, fontSize: '1.05rem' }}>
            Welcome back, Donna. Here is your schedule at a glance.
          </p>
        </div>
        
        {/* --- 1. The Vitals Cards --- */}
        <AdminVitals />

        {/* --- 2. The Main Appointments Table --- */}
        <div style={{ marginTop: '30px' }}>
          <AdminAppointments />
        </div>

        {/* --- 3. The Manual Booking Tool --- */}
        <div style={{ marginTop: '30px' }}>
          <AdminManual />
        </div>

        {/* --- 4. The Blocked Dates Manager --- */}
        <div style={{ marginTop: '30px' }}>
          <BlockedDatesManager />
        </div>

        {/* --- 5. The Services Manager (Using ServiceListItem) --- */}
        <div style={{ marginTop: '30px' }}>
          <ServiceListItem />
        </div>

        {/* --- 6. The Weekly Hours Manager --- */}
        <div style={{ marginTop: '30px' }}>
          <AvailabilityManager />
        </div>

      </div>
    </div>
  )
}