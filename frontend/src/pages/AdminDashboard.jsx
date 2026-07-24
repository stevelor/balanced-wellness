import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { useSupabaseTable } from '../hooks/useSupabaseTable'
import AvailabilityManager from '../components/AvailabilityManager'
import AdminAppointments from '../components/AdminAppointments'
import Navbar from '../components/Navbar'
import Card from '../components/Card'
import Button from '../components/Button'
import ServiceListItem from '../components/ServiceListItem'
import BlockedDatesManager from '../components/BlockedDatesManager'
import AdminVitals from '../components/AdminVitals'

export default function AdminDashboard() {
  const { data: servicesList, loading, refetch } = useSupabaseTable('services', {
    orderBy: 'created_at',
    ascending: false,
  })

  const [name, setName] = useState('')
  const [duration, setDuration] = useState('')
  const [price, setPrice] = useState('')
  const [statusMessage, setStatusMessage] = useState('')

  const handleAddService = async (e) => {
    e.preventDefault()
    setStatusMessage('Adding service...')

    const { error } = await supabase
      .from('services')
      .insert([{ name: name, duration_minutes: parseInt(duration), price: parseFloat(price) }])

    if (error) {
      setStatusMessage(`Error: ${error.message}`)
    } else {
      setStatusMessage('Service added successfully!')
      setName('')
      setDuration('')
      setPrice('')
      refetch()
    }
  }

  return (
    <>
      {/* The Navbar spans the top of the screen outside the main container */}
      <Navbar />

      <div className="page-container-narrow">
        <h2>Admin Dashboard</h2>
        <hr style={{ marginBottom: '20px' }} />

        {/* Your imported management components */}
        <AdminAppointments />
        <AvailabilityManager />
        <BlockedDatesManager/>
        <AdminVitals/>

        {/* Your Services form */}
        <Card tone="default">
          <h3>Add a New Service</h3>
          <form onSubmit={handleAddService} style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '15px' }}>
            <div className="form-group">
              <label>Service Name: </label>
              <input type="text" className="form-input" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Duration (minutes): </label>
              <input type="number" className="form-input" value={duration} onChange={(e) => setDuration(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Price ($): </label>
              <input type="number" step="0.01" className="form-input" value={price} onChange={(e) => setPrice(e.target.value)} required />
            </div>
            <Button type="submit" variant="success">
              Save Service
            </Button>
          </form>
          {statusMessage && (
            <p className={`status-message ${statusMessage.includes('Error') ? 'status-message-error' : 'status-message-success'}`}>
              {statusMessage}
            </p>
          )}
        </Card>

        {/* Your Active Services list — each item can now be edited in place */}
        <div>
          <h3>Active Services</h3>
          {loading ? (
            <p className="loading-text">Loading services...</p>
          ) : servicesList.length === 0 ? (
            <p className="empty-text">No services added yet.</p>
          ) : (
            <ul style={{ listStyleType: 'none', padding: 0 }}>
              {servicesList.map((service) => (
                <ServiceListItem key={service.id} service={service} onChanged={refetch} />
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  )
}