import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import Button from './Button'
import toast from 'react-hot-toast'

export default function ServiceListItem() {
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingId, setEditingId] = useState(null)

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    duration_minutes: '',
    price: '',
    description: '',
    image_url: ''
  })

  useEffect(() => {
    fetchServices()
  }, [])

  const fetchServices = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .order('name', { ascending: true })
    
    if (!error && data) setServices(data)
    setLoading(false)
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleEdit = (service) => {
    setEditingId(service.id)
    setFormData({
      name: service.name,
      duration_minutes: service.duration_minutes,
      price: service.price,
      description: service.description || '',
      image_url: service.image_url || ''
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setFormData({ name: '', duration_minutes: '', price: '', description: '', image_url: '' })
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)

    const payload = {
      name: formData.name,
      duration_minutes: parseInt(formData.duration_minutes),
      price: parseFloat(formData.price),
      description: formData.description,
      image_url: formData.image_url
    }

    let error;

    if (editingId) {
      // Update existing service
      const { error: updateError } = await supabase
        .from('services')
        .update(payload)
        .eq('id', editingId)
      error = updateError
    } else {
      // Create new service
      const { error: insertError } = await supabase
        .from('services')
        .insert([payload])
      error = insertError
    }

    if (error) {
      toast.error(`Error saving service: ${error.message}`)
    } else {
      toast.success(editingId ? "Service updated successfully!" : "New service added!")
      handleCancelEdit()
      fetchServices()
    }
    
    setIsSubmitting(false)
  }

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this service? Clients will no longer be able to book it.")) return
    
    const { error } = await supabase.from('services').delete().eq('id', id)
    
    if (error) {
      toast.error(`Cannot delete service: ${error.message} (It may be attached to existing appointments)`)
    } else {
      toast.success("Service deleted.")
      fetchServices()
    }
  }

  return (
    <div style={{ backgroundColor: '#fff', padding: '25px', borderRadius: '8px', border: '1px solid #ddd', marginTop: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
      <h3 style={{ margin: '0 0 5px 0', color: '#2c3e50' }}>Healing Services Manager</h3>
      <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '20px' }}>
        Create, update, or remove the services your clients can choose from when booking.
      </p>

      {/* --- ADD / EDIT FORM --- */}
      <form onSubmit={handleSave} style={{ backgroundColor: '#f9f9f9', padding: '20px', borderRadius: '8px', marginBottom: '30px', border: editingId ? '2px solid #899E8B' : '1px solid #eaeaea' }}>
        <h4 style={{ margin: '0 0 15px 0', color: '#374151' }}>
          {editingId ? 'Edit Service' : 'Add a New Service'}
        </h4>
        
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: '1 1 250px' }}>
            <label style={{ fontSize: '0.9rem', fontWeight: '600', color: '#374151' }}>Service Name</label>
            <input type="text" name="name" value={formData.name} onChange={handleInputChange} required placeholder="e.g., 60-Minute Reiki" style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '0.95rem' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: '1 1 120px' }}>
            <label style={{ fontSize: '0.9rem', fontWeight: '600', color: '#374151' }}>Length (Minutes)</label>
            <input type="number" name="duration_minutes" value={formData.duration_minutes} onChange={handleInputChange} required min="1" placeholder="60" style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '0.95rem' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: '1 1 120px' }}>
            <label style={{ fontSize: '0.9rem', fontWeight: '600', color: '#374151' }}>Price ($)</label>
            <input type="number" name="price" value={formData.price} onChange={handleInputChange} required min="0" step="0.01" placeholder="100.00" style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '0.95rem' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: '1 1 100%' }}>
            <label style={{ fontSize: '0.9rem', fontWeight: '600', color: '#374151' }}>Description</label>
            <textarea name="description" value={formData.description} onChange={handleInputChange} rows="2" placeholder="Describe the benefits and details of this session..." style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '0.95rem', fontFamily: 'inherit', resize: 'vertical' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: '1 1 100%' }}>
            <label style={{ fontSize: '0.9rem', fontWeight: '600', color: '#374151' }}>Image URL (Optional)</label>
            <input type="url" name="image_url" value={formData.image_url} onChange={handleInputChange} placeholder="https://example.com/image.jpg" style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '0.95rem' }} />
          </div>

        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
          <Button variant="primary" type="submit" disabled={isSubmitting} style={{ backgroundColor: '#899E8B' }}>
            {isSubmitting ? 'Saving...' : (editingId ? 'Update Service' : 'Create Service')}
          </Button>
          {editingId && (
            <Button type="button" variant="secondary" onClick={handleCancelEdit}>
              Cancel Edit
            </Button>
          )}
        </div>
      </form>

      {/* --- SERVICES LIST --- */}
      <h4 style={{ color: '#2c3e50', marginBottom: '15px' }}>Current Services</h4>
      
      {loading ? (
        <p style={{ color: '#666' }}>Loading services...</p>
      ) : services.length === 0 ? (
        <p style={{ color: '#888', fontStyle: 'italic' }}>No services created yet.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '15px' }}>
          {services.map(service => (
            <div key={service.id} style={{ display: 'flex', flexDirection: 'column', background: '#fff', borderRadius: '8px', border: '1px solid #eaeaea', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
              
              {/* Optional Image */}
              {service.image_url && (
                <div style={{ height: '120px', backgroundImage: `url(${service.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center', borderBottom: '1px solid #eaeaea' }} />
              )}
              
              <div style={{ padding: '15px', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <strong style={{ color: '#2c3e50', fontSize: '1.1rem', lineHeight: '1.2' }}>{service.name}</strong>
                  <span style={{ fontWeight: 'bold', color: '#899E8B' }}>${Number(service.price).toFixed(2)}</span>
                </div>
                
                <span style={{ fontSize: '0.85rem', color: '#666', marginBottom: '10px', fontWeight: '500' }}>
                  ⏱ {service.duration_minutes} minutes
                </span>
                
                <p style={{ fontSize: '0.9rem', color: '#555', margin: '0 0 15px 0', flexGrow: 1 }}>
                  {service.description || <span style={{ fontStyle: 'italic', color: '#aaa' }}>No description provided.</span>}
                </p>

                <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid #eaeaea', paddingTop: '15px', marginTop: 'auto' }}>
                  <Button variant="secondary" className="btn-sm" onClick={() => handleEdit(service)} style={{ flex: 1 }}>
                    Edit
                  </Button>
                  <Button variant="danger" className="btn-sm" onClick={() => handleDelete(service.id)} style={{ flex: 1 }}>
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}