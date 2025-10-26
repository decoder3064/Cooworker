import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

function WorkspacePage({ currentUser }) {
  const { id: workspaceId } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);

  // Demo user for testing when not authenticated
  const user = currentUser || {
    id: 'demo-user-' + Math.random().toString(36).substr(2, 9),
    displayName: 'Demo User',
    email: 'demo@example.com'
  };


  useEffect(() => {
  messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
}, [messages]);

  useEffect(() => {
    if (!workspaceId) return;
    const messagesRef = collection(db, 'workspaces', workspaceId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const msgs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setMessages(msgs);
        console.log('Messages updated:', msgs);
      },
      (error) => {
        console.error('Error fetching messages:', error);
      }
    );

    return () => unsubscribe();
  }, [workspaceId]);

  // NEW: Handle sending a message
  const handleSendMessage = async (e) => {
    e.preventDefault(); // Prevent page refresh
    
    const text = newMessage.trim(); // Remove extra spaces
    if (!text || !workspaceId) return; // Don't send empty messages

    try {
      // Get reference to messages collection
      const messagesRef = collection(db, 'workspaces', workspaceId, 'messages');
      
      // Add new document to Firestore
      await addDoc(messagesRef, {
        senderId: user.id,                    // Who sent it
        senderName: user.displayName,         // Sender's name
        text: text,                                  // Message content
        type: 'user',                                // Message type
        timestamp: serverTimestamp(),                // Server-generated timestamp
      });
      
      // Clear input field after sending
      setNewMessage('');
      console.log('Message sent successfully!');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  // NEW: Handle exit workspace
  const handleExitWorkspace = async () => {
    try {
      // Notify backend that session has ended
      const response = await fetch(`http://localhost:8080/api/workspace/${workspaceId}/end-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        console.log('Session ended successfully');
      }
    } catch (error) {
      console.error('Error ending session:', error);
    } finally {
      // Navigate to dashboard regardless of API success/failure
      navigate('/dashboard');
    }
  };

  return (
    <div className="workspace-page-container">
      {/* Header with exit button */}
      <div className="workspace-header">
        <h2 className="workspace-title">Workspace Chat</h2>
        <button
          onClick={handleExitWorkspace}
          className="exit-workspace-btn"
        >
          ← Exit Workspace
        </button>
      </div>
      
      <p className="workspace-user-info">
        Signed in as: <strong className="user-display-name">{user?.displayName}</strong> 
        {!currentUser && <span className="demo-mode-badge">(Demo Mode)</span>}
      </p>

      <div className="messages-container">
        {messages.length === 0 && (
          <div className="empty-messages-placeholder">
            No messages yet. Start the conversation!
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className="message-item">
            <strong className="message-sender-name">{msg.senderName}:</strong> 
            <span className="message-text">{msg.text}</span>
          </div>
        ))}
        
        {/* Invisible element at the bottom to scroll to */}
        <div ref={messagesEndRef} />
      </div>

      {/* UPDATED: Form now has onSubmit handler */}
      <form onSubmit={handleSendMessage} className="message-input-form">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="message-input-field"
        />
        <button
          type="submit"
          className="send-message-btn"
        >
          Send
        </button>
      </form>
    </div>
  );
}

export default WorkspacePage;