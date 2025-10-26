import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';

function DashboardPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const navigate = useNavigate();

  // TODO: Fetch username and workspaces from Firebase
  const username = 'Username'; // TODO
  const workspaces = []; // TODO

  // Logout handler
  const handleLogout = async () => {
    try {
      await signOut(auth);
      // Remove user token from localStorage or env
      localStorage.removeItem('userToken');
      navigate('/');
    } catch (error) {
      alert('Logout failed: ' + error.message);
    }
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderBottom: '1px solid #eee' }}>
        <div style={{ fontWeight: 'bold', fontSize: '20px' }}>Mention Dashboard</div>
        <div>
          <span style={{ marginRight: '16px' }}>{username}</span>
          <button onClick={handleLogout}>Logout</button>
        </div>
      </header>
      <main style={{ flex: 1, padding: '32px' }}>
        <h3>Your Workspaces</h3>
        {/* TODO: List workspaces from Firebase */}
        {workspaces.length === 0 ? (
          <p>No workspaces yet.</p>
        ) : (
          <ul>
            {workspaces.map(ws => (
              <li key={ws.id}>{ws.name}</li>
            ))}
          </ul>
        )}
      </main>
      {/* Floating Action Button */}
      <div style={{ position: 'fixed', bottom: 32, right: 32 }}>
        <button
          style={{ borderRadius: '50%', width: 56, height: 56, fontSize: 32, background: '#1976d2', color: 'white', border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}
          onClick={() => {}}
        >
          +
        </button>
        {/* Dropdown menu */}
        <div style={{ marginTop: 8 }}>
          <button onClick={() => setShowCreateModal(true)}>Create Workspace</button>
          <button onClick={() => setShowJoinModal(true)}>Join Workspace</button>
        </div>
      </div>
      {/* Create Workspace Modal */}
      {showCreateModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', padding: 32, borderRadius: 8 }}>
            <h4>Create Workspace</h4>
            <p>Workspace ID: <span style={{ fontWeight: 'bold' }}>TODO</span></p>
            <button>Copy Code</button>
            <button style={{ marginLeft: 16 }}>Create Workspace</button>
            <button style={{ marginLeft: 16 }} onClick={() => setShowCreateModal(false)}>Close</button>
            {/* TODO: Logic to create workspace */}
          </div>
        </div>
      )}
      {/* Join Workspace Modal */}
      {showJoinModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', padding: 32, borderRadius: 8 }}>
            <h4>Join Workspace</h4>
            <input type="text" placeholder="Paste Workspace ID" style={{ width: '100%', marginBottom: 16 }} />
            <button>Join Workspace</button>
            <button style={{ marginLeft: 16 }} onClick={() => setShowJoinModal(false)}>Close</button>
            {/* TODO: Logic to join workspace */}
          </div>
        </div>
      )}
    </div>
  );
}

export default DashboardPage;
