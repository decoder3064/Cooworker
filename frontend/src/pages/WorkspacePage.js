import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";

function WorkspacePage({ currentUser }) {
  const { id: workspaceId } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef(null);

  // Demo user for testing when not authenticated
  const user = currentUser || {
    id: "demo-user-" + Math.random().toString(36).substr(2, 9),
    displayName: "Demo User",
    email: "demo@example.com",
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!workspaceId) return;
    const messagesRef = collection(db, "workspaces", workspaceId, "messages");
    const q = query(messagesRef, orderBy("timestamp", "asc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const msgs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setMessages(msgs);
        console.log("Messages updated:", msgs);
      },
      (error) => {
        console.error("Error fetching messages:", error);
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
      const messagesRef = collection(db, "workspaces", workspaceId, "messages");

      // Add new document to Firestore
      await addDoc(messagesRef, {
        senderId: user.id, // Who sent it
        senderName: user.displayName, // Sender's name
        text: text, // Message content
        type: "user", // Message type
        timestamp: serverTimestamp(), // Server-generated timestamp
      });

      // Clear input field after sending
      setNewMessage("");
      console.log("Message sent successfully!");
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  // NEW: Handle exit workspace
  const handleExitWorkspace = async () => {
    try {
      // Notify backend that session has ended
      const response = await fetch(
        `http://localhost:8080/api/workspace/${workspaceId}/end-session`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        console.log("Session ended successfully");
      }
    } catch (error) {
      console.error("Error ending session:", error);
    } finally {
      // Navigate to dashboard regardless of API success/failure
      navigate("/dashboard");
    }
  };

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: 20 }}>
      {/* Header with exit button */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 10,
        }}
      >
        <h2 style={{ margin: 0 }}>Workspace Chat</h2>
        <button
          onClick={handleExitWorkspace}
          style={{
            padding: "8px 16px",
            borderRadius: 8,
            border: "1px solid #ddd",
            background: "#fff",
            color: "#666",
            cursor: "pointer",
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          ← Exit Workspace
        </button>
      </div>

      <p style={{ color: "#666", marginBottom: 20 }}>
        Signed in as: <strong>{user?.displayName}</strong>{" "}
        {!currentUser && <span style={{ color: "#ff9800" }}>(Demo Mode)</span>}
      </p>

      <div
        style={{
          border: "1px solid #ddd",
          borderRadius: 12,
          padding: 16,
          minHeight: 400,
          maxHeight: 500,
          overflowY: "auto",
          marginBottom: 16,
          background: "#f9f9f9",
        }}
      >
        {messages.length === 0 && (
          <div style={{ color: "#999", textAlign: "center", marginTop: 100 }}>
            No messages yet. Start the conversation!
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              marginBottom: 12,
              padding: 8,
              background: "#fff",
              borderRadius: 8,
            }}
          >
            <strong>{msg.senderName}:</strong> {msg.text}
          </div>
        ))}

        {/* Invisible element at the bottom to scroll to */}
        <div ref={messagesEndRef} />
      </div>

      {/* UPDATED: Form now has onSubmit handler */}
      <form onSubmit={handleSendMessage} style={{ display: "flex", gap: 8 }}>
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          style={{
            flex: 1,
            padding: "10px 14px",
            borderRadius: 24,
            border: "1px solid #ddd",
            outline: "none",
          }}
        />
        <button
          type="submit"
          style={{
            padding: "10px 20px",
            borderRadius: 24,
            border: "none",
            background: "#007bff",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          Send
        </button>
      </form>
    </div>
  );
}

export default WorkspacePage;
