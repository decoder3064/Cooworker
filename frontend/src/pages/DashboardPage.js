import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';

function DashboardPage({ currentUser }) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showFabMenu, setShowFabMenu] = useState(false);
  const navigate = useNavigate();

  // Get username from currentUser or Firebase auth
  const username = currentUser?.displayName || auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || 'User';
  const workspaces = []; // TODO: Fetch from Firebase

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
        <div className="dashboard-logo">Dashboard</div>
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
      <div 
        className="fab-container"
        onMouseEnter={() => {
          console.log('Mouse entered FAB container');
          setShowFabMenu(true);
        }}
        onMouseLeave={() => {
          console.log('Mouse left FAB container');
          setShowFabMenu(false);
        }}
      >
        <button 
          className="fab-button"
          onClick={() => {
            console.log('FAB clicked, toggling menu');
            setShowFabMenu(!showFabMenu);
          }}
        >
          +
        </button>
        {/* Dropdown menu - shows on hover or click */}
        {showFabMenu && (
          <div 
            className="fab-dropdown"
            onMouseEnter={() => {
              console.log('Mouse entered dropdown');
              setShowFabMenu(true);
            }}
          >
            <button 
              className="fab-action-btn" 
              onClick={() => {
                console.log('Create Workspace clicked');
                setShowCreateModal(true);
                setShowFabMenu(false);
              }}
            >
              Create Workspace
            </button>
            <button 
              className="fab-action-btn" 
              onClick={() => {
                console.log('Join Workspace clicked');
                setShowJoinModal(true);
                setShowFabMenu(false);
              }}
            >
              Join Workspace
            </button>
          </div>
        )}
      </div>
      {/* Create Workspace Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
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
        <div className="modal-overlay" onClick={() => setShowJoinModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
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
