import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import AvailabilityManager from '../components/AvailabilityManager'
import AdminAppointments from '../components/AdminAppointments'
import Navbar from '../components/Navbar' // The Navbar is imported here!

export default function AdminDashboard() {
  const [name, setName] = useState('')
  const [duration, setDuration] = useState('')
  const [price, setPrice] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const [servicesList, setServicesList] = useState([])

  useEffect(() => {
    fetchServices()
  }, [])

  const fetchServices = async () => {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching services:', error)
    } else {
      setServicesList(data)
    }
  }

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
      fetchServices() 
    }
  }

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this service?")
    if (!confirmDelete) return

    const { error } = await supabase
      .from('services')
      .delete()
      .eq('id', id) 

    if (error) {
      alert(`Error deleting: ${error.message}`)
    } else {
      fetchServices()
    }
  }

  return (
    <>
      {/* The Navbar spans the top of the screen outside the main container */}
      <Navbar />

      <div style={{ maxWidth: '600px', margin: '40px auto', padding: '20px' }}>
        <h2>Admin Dashboard</h2>
        <hr style={{ marginBottom: '20px' }} />

        {/* Your imported management components */}
        <AdminAppointments />
        <AvailabilityManager />
        
        {/* Your Services form */}
        <div style={{ backgroundColor: '#f9f9f9', padding: '20px', borderRadius: '8px', marginBottom: '30px' }}>
          <h3>Add a New Service</h3>
          <form onSubmit={handleAddService} style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '15px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px' }}>Service Name: </label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} required style={{ width: '100%', padding: '8px' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px' }}>Duration (minutes): </label>
              <input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} required style={{ width: '100%', padding: '8px' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px' }}>Price ($): </label>
              <input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} required style={{ width: '100%', padding: '8px' }} />
            </div>
            <button type="submit" style={{ padding: '10px', backgroundColor: '#28a745', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold', borderRadius: '4px' }}>
              Save Service
            </button>
          </form>
          {statusMessage && (
            <p style={{ marginTop: '15px', fontWeight: 'bold', color: statusMessage.includes('Error') ? 'red' : 'green' }}>{statusMessage}</p>
          )}
        </div>

        {/* Your Active Services list */}
        <div>
          <h3>Active Services</h3>
          {servicesList.length === 0 ? (
            <p>No services added yet.</p>
          ) : (
            <ul style={{ listStyleType: 'none', padding: 0 }}>
              {servicesList.map((service) => (
                <li key={service.id} style={{ border: '1px solid #ddd', padding: '15px', marginBottom: '10px', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong style={{ fontSize: '1.1em' }}>{service.name}</strong>
                    <p style={{ margin: '5px 0 0 0', color: '#555' }}>
                      {service.duration_minutes} minutes | ${service.price.toFixed(2)}
                    </p>
                  </div>
                  <button 
                    onClick={() => handleDelete(service.id)} 
                    style={{ backgroundColor: '#dc3545', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  )
}