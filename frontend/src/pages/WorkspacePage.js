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
  const [isTyping, setIsTyping] = useState(false);
  const [activeCommandId, setActiveCommandId] = useState(null);
  const messagesEndRef = useRef(null);
  const lastMessageCountRef = useRef(0);

  const user = currentUser || {
    id: 'demo-user-' + Math.random().toString(36).substr(2, 9),
    displayName: 'Demo User',
    email: 'demo@example.com'
  };

  // Detect command type from message text
  const getCommandType = (text) => {
    if (!text) return null;
    const trimmedText = text.trim().toLowerCase();
    if (trimmedText.startsWith('\\act')) return 'act';
    if (trimmedText.startsWith('\\ask')) return 'ask';
    if (trimmedText.startsWith('\\run')) return 'run';
    return null;
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
        
        const doryoMessages = msgs.filter(m => 
          m.senderName?.toLowerCase().includes('doryo') || 
          m.type === 'agent' || 
          m.senderId === 'doryo'
        );
        
        // When Doryo responds, stop animations
        if (doryoMessages.length > lastMessageCountRef.current) {
          setIsTyping(false);
          setActiveCommandId(null);
          lastMessageCountRef.current = doryoMessages.length;
        }
        
        setMessages(msgs);
      },
      (error) => {
        console.error('Error fetching messages:', error);
        setIsTyping(false);
        setActiveCommandId(null);
      }
    );

    return () => unsubscribe();
  }, [workspaceId]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    const text = newMessage.trim();
    if (!text || !workspaceId) return;

    setNewMessage('');
    
    // NEW: Only show typing indicator for command messages
    const commandType = getCommandType(text);
    const isCommand = commandType !== null;

    try {
      const messagesRef = collection(db, 'workspaces', workspaceId, 'messages');
      
      // Add message to Firestore
      const docRef = await addDoc(messagesRef, {
        senderId: user.id,
        senderName: user.displayName,
        text: text,
        type: 'user',
        timestamp: serverTimestamp(),
      });

      // NEW: Only activate typing indicator and animation for commands
      if (isCommand) {
        setIsTyping(true);
        setActiveCommandId(docRef.id);
      }

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
        setIsTyping(false);
        setActiveCommandId(null);
      });

    } catch (error) {
      console.error('Error sending message:', error);
      setNewMessage(text);
      setIsTyping(false);
      setActiveCommandId(null);
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
          
          const isDoryo = msg.senderName && 
            (msg.senderName.toLowerCase().includes('doryo') || 
             msg.type === 'agent' || 
             msg.senderId === 'doryo' ||
             msg.senderName.toLowerCase() === 'ai');
          
          // Detect command type
          const commandType = getCommandType(msg.text);
          const isCommand = commandType !== null;
          
          // Only animate if this is the active command (waiting for response)
          const shouldAnimate = isCommand && msg.id === activeCommandId;
          
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
                <div className={`message-text ${shouldAnimate ? `command-message command-${commandType}` : ''}`}>
                  {/* Only show badge on active command */}
                  {shouldAnimate && (
                    <span className={`command-badge badge-${commandType}`}>
                      {commandType}
                    </span>
                  )}
                  <span className={shouldAnimate ? 'command-text' : ''}>
                    {msg.text}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
        
        {/* NEW: Only show typing indicator if isTyping is true (commands only) */}
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