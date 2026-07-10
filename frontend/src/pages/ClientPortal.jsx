import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import Navbar from '../components/Navbar' // 1. Add this import at the top!

export default function ClientPortal() {
  // ... [Keep all your existing state variables and functions exactly the same] ...

  // 2. Update your return statement to look like this:
  return (
    <>
      {/* 3. Drop your Navbar right at the top of the page */}
      <Navbar />
      
      {/* Your existing portal content remains wrapped in its centered div */}
      <div style={{ maxWidth: '600px', margin: '40px auto', padding: '20px' }}>
        <h2>Client Booking Portal</h2>
        <hr style={{ marginBottom: '20px' }} />

        <div style={{ backgroundColor: '#e8f4f8', padding: '20px', borderRadius: '8px', marginBottom: '30px' }}>
          <h3>Book an Appointment</h3>
          
          {availability.length > 0 && (
            <div style={{ backgroundColor: '#fff', padding: '10px', borderRadius: '4px', fontSize: '0.85em', color: '#555', marginBottom: '15px' }}>
              <strong>Operating Hours:</strong>
              <ul style={{ margin: '5px 0 0 0', paddingLeft: '20px' }}>
                {availability.map(a => (
                  <li key={a.id}>
                     Day {a.day_of_week}: {a.start_time.substring(0, 5)} - {a.end_time.substring(0, 5)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <form onSubmit={handleBooking} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px' }}>Select a Service:</label>
              <select value={selectedService} onChange={(e) => setSelectedService(e.target.value)} required style={{ width: '100%', padding: '8px' }}>
                <option value="" disabled>-- Choose a service --</option>
                {services.map(service => (
                  <option key={service.id} value={service.id}>
                    {service.name} ({service.duration_minutes} min) - ${service.price}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px' }}>Date:</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required style={{ width: '100%', padding: '8px' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px' }}>Time:</label>
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} required style={{ width: '100%', padding: '8px' }} />
            </div>
            <button type="submit" style={{ padding: '10px', backgroundColor: '#0066cc', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
              Submit Booking Request
            </button>
          </form>
          
          {statusMessage && <p style={{ marginTop: '15px', fontWeight: 'bold', color: statusMessage.includes('Error') ? 'red' : 'green' }}>{statusMessage}</p>}
        </div>

        <div>
          <h3>My Upcoming Appointments</h3>
          {myAppointments.length === 0 ? (
            <p>You have no pending or upcoming appointments.</p>
          ) : (
            <ul style={{ listStyleType: 'none', padding: 0 }}>
              {myAppointments.map((apt) => (
                <li key={apt.id} style={{ border: '1px solid #ddd', padding: '15px', marginBottom: '10px', borderRadius: '4px' }}>
                  <strong style={{ fontSize: '1.1em', display: 'block' }}>{apt.services?.name}</strong>
                  <span style={{ color: '#555' }}>Date: {apt.appointment_date} at {apt.start_time.substring(0, 5)}</span>
                  <span style={{ display: 'inline-block', marginLeft: '15px', padding: '3px 8px', borderRadius: '12px', fontSize: '0.8em', backgroundColor: apt.status === 'pending' ? '#ffc107' : apt.status === 'confirmed' ? '#28a745' : '#dc3545', color: apt.status === 'pending' ? '#000' : '#fff' }}>
                    {apt.status.toUpperCase()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  )
}