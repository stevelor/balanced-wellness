import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import Navbar from '../components/Navbar'
import AdminVitals from '../components/AdminVitals'
import AdminManual from '../components/AdminManual'
import AdminAppointments from '../components/AdminAppointments'
import BlockedDatesManager from '../components/BlockedDatesManager'
import ServiceListItem from '../components/ServiceListItem'
import AvailabilityManager from '../components/AvailabilityManager'
import EventsManager from '../components/EventsManager' // <-- NEW IMPORT

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
        
        <div style={{ marginBottom: '30px' }}>
          <h1 style={{ color: '#2c3e50', margin: '0 0 8px 0', fontSize: '2rem' }}>Admin Dashboard</h1>
          <p style={{ color: '#666', margin: 0, fontSize: '1.05rem' }}>Welcome back, Donna. Here is your schedule at a glance.</p>
        </div>
        
        <AdminVitals />

        <div style={{ marginTop: '30px' }}><AdminAppointments /></div>
        <div style={{ marginTop: '30px' }}><AdminManual /></div>
        <div style={{ marginTop: '30px' }}><BlockedDatesManager /></div>
        
        {/* --- NEW EVENTS BLOCK --- */}
        <div style={{ marginTop: '30px' }}>
          <EventsManager />
        </div>

        <div style={{ marginTop: '30px' }}><ServiceListItem /></div>
        <div style={{ marginTop: '30px' }}><AvailabilityManager /></div>

      </div>
    </div>
  )
}