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
      },
      (error) => {
        console.error('Error fetching messages:', error);
      }
    );

    return () => unsubscribe();
  }, [workspaceId]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    const text = newMessage.trim();
    if (!text || !workspaceId) return;

    try {
      const messagesRef = collection(db, 'workspaces', workspaceId, 'messages');
      
      await addDoc(messagesRef, {
        senderId: user.id,
        senderName: user.displayName,
        text: text,
        type: 'user',
        timestamp: serverTimestamp(),
      });

      try {
        const backendResponse = await fetch('https://calhacksbackendlettaagent-production.up.railway.app/message', {
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
      } catch (backendError) {
        console.error('Backend API unavailable:', backendError);
      }
      
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      setNewMessage('');
    }
  };

  const handleExitWorkspace = async () => {
    navigate('/dashboard');
  };

  return (
    <div className="workspace-page-container">
      <header className="workspace-header">
        <h2 className="workspace-title">Doryo</h2>
        <button className="exit-workspace-btn" onClick={handleExitWorkspace}>
          ← Exit Workspace
        </button>
      </header>

      <div className="messages-container">
        {messages.length === 0 && (
          <div className="empty-messages-placeholder">
            No messages yet. Start the conversation!
          </div>
        )}

        {messages.map((msg) => {
          const isOwnMessage = msg.senderId === user.id;
          
          return (
            <div 
              key={msg.id} 
              className={`message-item ${isOwnMessage ? 'own-message' : 'other-message'}`}
            >
              <div className="message-sender">
                {msg.senderName ? msg.senderName.charAt(0).toUpperCase() : 'U'}
              </div>
              
              <div className="message-content-wrapper">
                <div className="message-sender-name">
                  {isOwnMessage ? 'You' : msg.senderName}
                </div>
                <div className="message-text">{msg.text}</div>
              </div>
            </div>
          );
        })}
        
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="message-input-form">
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
            className="message-input-field"
            rows="1"
          />
          <button
            type="submit"
            className="send-message-btn"
            disabled={!newMessage.trim()}
            title="Send message"
          >
            ↑
          </button>
        </div>
      </form>
    </div>
  );
}

export default WorkspacePage;