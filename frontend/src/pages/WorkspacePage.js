import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

function WorkspacePage({ currentUser }) {
  const { id: workspaceId } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isTyping, setIsTyping] = useState(false); // NEW: Track if Doryo is typing
  const messagesEndRef = useRef(null);
  const lastMessageCountRef = useRef(0);

  const user = currentUser || {
    id: 'demo-user-' + Math.random().toString(36).substr(2, 9),
    displayName: 'Demo User',
    email: 'demo@example.com'
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

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
        
        // NEW: If we got a new message from Doryo, stop typing indicator
        const doryoMessages = msgs.filter(m => 
          m.senderName?.toLowerCase().includes('doryo') || 
          m.type === 'agent' || 
          m.senderId === 'doryo'
        );
        
        if (doryoMessages.length > lastMessageCountRef.current) {
          setIsTyping(false);
          lastMessageCountRef.current = doryoMessages.length;
        }
        
        setMessages(msgs);
      },
      (error) => {
        console.error('Error fetching messages:', error);
        setIsTyping(false);
      }
    );

    return () => unsubscribe();
  }, [workspaceId]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    const text = newMessage.trim();
    if (!text || !workspaceId) return;

    // Clear input immediately
    setNewMessage('');
    
    // NEW: Show typing indicator when user sends a message
    setIsTyping(true);

    try {
      const messagesRef = collection(db, 'workspaces', workspaceId, 'messages');
      
      // Add message to Firestore
      await addDoc(messagesRef, {
        senderId: user.id,
        senderName: user.displayName,
        text: text,
        type: 'user',
        timestamp: serverTimestamp(),
      });

      // Send to backend asynchronously
      fetch('https://calhacksbackendlettaagent-production.up.railway.app/message', {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: user.displayName,
          workspace_id: workspaceId,
          message: text,
        }),
      }).catch((backendError) => {
        console.error('Backend API error (non-blocking):', backendError);
        setIsTyping(false); // Stop typing indicator on error
      });

    } catch (error) {
      console.error('Error sending message:', error);
      setNewMessage(text);
      setIsTyping(false); // Stop typing indicator on error
    }
  };

  const handleCopyInviteCode = () => {
    navigator.clipboard.writeText(workspaceId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExitWorkspace = async () => {
    navigate('/dashboard');
  };

  return (
    <div className="workspace-page-container">
      <header className="workspace-header">
        <div className="workspace-header-left">
          <h2 className="workspace-title">Doryo</h2>
        </div>
        <div className="workspace-header-right">
          <button 
            className="invite-btn" 
            onClick={() => setShowInviteModal(true)}
          >
            + Invite
          </button>
          <button className="exit-workspace-btn" onClick={handleExitWorkspace}>
            ← Exit
          </button>
        </div>
      </header>

      <div className="messages-container">
        {messages.length === 0 && (
          <div className="empty-messages-placeholder">
            No messages yet. Start the conversation!
          </div>
        )}

        {messages.map((msg) => {
          const isOwnMessage = msg.senderId === user.id;
          
          // Check if message is from Doryo (AI agent)
          const isDoryo = msg.senderName && 
            (msg.senderName.toLowerCase().includes('doryo') || 
             msg.type === 'agent' || 
             msg.senderId === 'doryo' ||
             msg.senderName.toLowerCase() === 'ai');
          
          return (
            <div 
              key={msg.id} 
              className={`message-item ${isOwnMessage ? 'own-message' : 'other-message'}`}
            >
              <div className={`message-sender ${isDoryo ? 'doryo-avatar' : ''}`}>
                {msg.senderName ? msg.senderName.charAt(0).toUpperCase() : 'U'}
              </div>
              
              <div className="message-content-wrapper">
                <div className={`message-sender-name ${isDoryo ? 'doryo-name' : ''}`}>
                  {isOwnMessage ? 'You' : msg.senderName}
                </div>
                <div className="message-text">{msg.text}</div>
              </div>
            </div>
          );
        })}
        
        {/* NEW: Typing Indicator */}
        {isTyping && (
          <div className="message-item other-message typing-indicator-message">
            <div className="message-sender doryo-avatar">
              D
            </div>
            <div className="message-content-wrapper">
              <div className="message-sender-name doryo-name">
                Doryo
              </div>
              <div className="typing-indicator">
                <span className="typing-dot"></span>
                <span className="typing-dot"></span>
                <span className="typing-dot"></span>
              </div>
            </div>
          </div>
        )}
        
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

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="modal-overlay" onClick={() => setShowInviteModal(false)}>
          <div className="modal-content invite-modal-content" onClick={(e) => e.stopPropagation()}>
            <h4 className="modal-title">Invite to Workspace</h4>
            <p className="modal-text">Share this code with your friends to join:</p>
            
            <div className="invite-code-container">
              <code className="workspace-invite-code">{workspaceId}</code>
            </div>
            
            <button
              className="modal-btn modal-btn-primary"
              onClick={handleCopyInviteCode}
            >
              {copied ? '✓ Copied!' : 'Copy Invite Code'}
            </button>
            
            <button
              className="modal-btn"
              onClick={() => setShowInviteModal(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default WorkspacePage;