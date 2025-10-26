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
    <div className="dashboard-page-container">
      <header className="dashboard-header">
        <div className="dashboard-logo">Mention Dashboard</div>
        <div className="dashboard-user-section">
          <span className="dashboard-username">{username}</span>
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </div>
      </header>
      <main className="dashboard-main">
        <h3 className="workspaces-title">Your Workspaces</h3>
        {/* TODO: List workspaces from Firebase */}
        {workspaces.length === 0 ? (
          <p className="no-workspaces-message">No workspaces yet.</p>
        ) : (
          <ul className="workspaces-list">
            {workspaces.map(ws => (
              <li key={ws.id} className="workspace-list-item">{ws.name}</li>
            ))}
          </ul>
        )}
      </main>
      {/* Floating Action Button */}
      <div className="fab-container">
        <button
          className="fab-button"
          onClick={() => {}}
        >
          +
        </button>
        {/* Dropdown menu */}
        <div className="fab-dropdown">
          <button className="fab-action-btn" onClick={() => setShowCreateModal(true)}>Create Workspace</button>
          <button className="fab-action-btn" onClick={() => setShowJoinModal(true)}>Join Workspace</button>
        </div>
      </div>
      {/* Create Workspace Modal */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h4 className="modal-title">Create Workspace</h4>
            <p className="modal-text">Workspace ID: <span className="workspace-id-text">TODO</span></p>
            <button className="modal-btn">Copy Code</button>
            <button className="modal-btn modal-btn-primary">Create Workspace</button>
            <button className="modal-btn" onClick={() => setShowCreateModal(false)}>Close</button>
            {/* TODO: Logic to create workspace */}
          </div>
        </div>
      )}
      {/* Join Workspace Modal */}
      {showJoinModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h4 className="modal-title">Join Workspace</h4>
            <input type="text" placeholder="Paste Workspace ID" className="modal-input" />
            <button className="modal-btn modal-btn-primary">Join Workspace</button>
            <button className="modal-btn" onClick={() => setShowJoinModal(false)}>Close</button>
            {/* TODO: Logic to join workspace */}
          </div>
        </div>
      )}
    </div>
  );
}

export default DashboardPage;
