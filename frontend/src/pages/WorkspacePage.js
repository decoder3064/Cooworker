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

      // 2. Send to Backend API (for AI agent processing)
      const backendResponse = await fetch('http://localhost:8080/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          senderUserName: user.displayName,
          workspaceId: workspaceId,
          message: text,
        }),
      });

      if (!backendResponse.ok) {
        console.error('Backend API error:', await backendResponse.text());
      } else {
        console.log('Message sent to backend successfully');
      }
      
      // Clear input field
      setNewMessage('');
      console.log('Message sent successfully to Firebase and backend!');
    } catch (error) {
      console.error('Error sending message:', error);
      // Still clear the input even if backend fails
      setNewMessage('');
    }
  };

  // NEW: Handle exit workspace
  const handleExitWorkspace = async () => {
    try {
    //   // Notify backend that session has ended
    //   const response = await fetch(`http://localhost:8080/api/workspace/${workspaceId}/end-session`, {
    //     method: 'POST',
    //     headers: {
    //       'Content-Type': 'application/json',
    //     },
    //   });
      
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

      {/* Messages Container - iMessage Style */}
      <div className="messages-container">
        {messages.map((msg) => {
          const isOwnMessage = msg.senderId === user.id;
          
          return (
            <div 
              key={msg.id} 
              className={`message-item ${isOwnMessage ? 'own-message' : 'other-message'}`}
            >
              {/* Avatar/Icon */}
              <div 
                className="message-sender" 
                title={msg.senderName}
              >
                {msg.senderName ? msg.senderName.charAt(0).toUpperCase() : 'U'}
              </div>
              
              {/* Message Content */}
              <div className="message-content-wrapper">
                <div className="message-sender-name">
                  {isOwnMessage ? 'You' : msg.senderName}
                </div>
                <div className="message-text">{msg.text}</div>
              </div>
            </div>
          );
        })}
        
        {/* Auto-scroll anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Section - Bottom Fixed */}
      <div className="message-input-section">
        <div className="message-input-wrapper">
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage(e);
              }
            }}
            placeholder="Message Doryo..."
            className="message-input"
            rows="1"
          />
          <button
            onClick={handleSendMessage}
            className="send-message-btn"
            disabled={!newMessage.trim()}
            title="Send message"
          >
            ↑
          </button>
        </div>
      </div>
    </div>
  );
}

export default WorkspacePage;