import { useEffect, useState } from 'react';

export default function Dashboard() {
  const [clients, setClients] = useState([]);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  // Fetch clients when the page loads
  useEffect(() => {
    fetch('http://localhost:8080/api/clients')
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json();
      })
      .then(data => setClients(data))
      .catch(error => {
        console.error("Error fetching clients:", error);
        setStatusMessage("Cannot connect to backend server.");
      });
  }, []);

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    setStatusMessage('Submitting...');
    
    const newClient = { firstName, lastName, email };

    fetch('http://localhost:8080/api/clients', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newClient),
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to save client.');
        }
        return response.json();
      })
      .then(savedClient => {
        setClients([...clients, savedClient]);
        setFirstName('');
        setLastName('');
        setEmail('');
        setStatusMessage('Client added successfully!');
      })
      .catch(error => {
        console.error("Error adding client:", error);
        setStatusMessage("Error: Could not save client.");
      });
  };

  return (
    <div style={{ padding: "50px", fontFamily: "sans-serif" }}>
      <h2>Balanced Wellness CRM</h2>
      
      {/* Add Client Form */}
      <form onSubmit={handleSubmit} style={{ marginBottom: "30px", padding: "20px", border: "1px solid #ccc", borderRadius: "8px", maxWidth: "400px" }}>
        <h3>Add New Client</h3>
        <div style={{ marginBottom: "10px" }}>
          <label>First Name: </label>
          <input 
            type="text" 
            value={firstName} 
            onChange={(e) => setFirstName(e.target.value)} 
            required 
            style={{ width: "100%", padding: "8px", boxSizing: "border-box" }}
          />
        </div>
        <div style={{ marginBottom: "10px" }}>
          <label>Last Name: </label>
          <input 
            type="text" 
            value={lastName} 
            onChange={(e) => setLastName(e.target.value)} 
            required 
            style={{ width: "100%", padding: "8px", boxSizing: "border-box" }}
          />
        </div>
        <div style={{ marginBottom: "10px" }}>
          <label>Email: </label>
          <input 
            type="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            required 
            style={{ width: "100%", padding: "8px", boxSizing: "border-box" }}
          />
        </div>
        <button type="submit" style={{ padding: "10px 15px", backgroundColor: "#4CAF50", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>
          Add Client
        </button>
        
        {statusMessage && <p style={{ marginTop: "10px", fontSize: "14px", color: "#333" }}>{statusMessage}</p>}
      </form>

      <hr />

      <h3>Here are your registered clients:</h3>
      {clients.length === 0 ? (
        <p><i>No clients in the database yet.</i></p>
      ) : (
        <ul>
          {clients.map(client => (
            <li key={client.id} style={{ marginBottom: "8px" }}>
              <strong>{client.firstName} {client.lastName}</strong> - {client.email}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}