import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Composio } from '@composio/core';
import { auth } from '../firebase';

// Composio config from environment variables
const COMPOSIO_API_KEY = process.env.REACT_APP_COMPOSIO_API_KEY;
const AUTH_CONFIG_IDS = {
  github: process.env.REACT_APP_COMPOSIO_GITHUB_AUTH_CONFIG_ID,
  notion: process.env.REACT_APP_COMPOSIO_NOTION_AUTH_CONFIG_ID,
  gmail: process.env.REACT_APP_COMPOSIO_GMAIL_AUTH_CONFIG_ID,
};
// The callback URL should be registered in your Composio dashboard
// For local dev: http://localhost:3000/onboarding
// For prod: https://your-app.com/onboarding
const CALLBACK_URL = "http://localhost:3000/onboarding";

const composio = new Composio({ apiKey: COMPOSIO_API_KEY });

function OnboardingPage() {
  const navigate = useNavigate();
  const [connected, setConnected] = useState({ github: false, notion: false, gmail: false });
  const [loading, setLoading] = useState({ github: false, notion: false, gmail: false });

  // Use Firebase Auth UID as userId
  const userId = localStorage.getItem('user_id');
  console.log("Onboarding for userId:", userId);

  const handleConnect = async (tool) => {
    setLoading((prev) => ({ ...prev, [tool]: true }));
    try {
      const connectionRequest = await composio.connectedAccounts.link(userId, AUTH_CONFIG_IDS[tool], {
        callbackUrl: CALLBACK_URL,
      });
      window.location.href = connectionRequest.redirectUrl;
    } catch (err) {
      alert('Failed to connect ' + tool + ': ' + err.message);
    } finally {
      setLoading((prev) => ({ ...prev, [tool]: false }));
    }
  };

  // Check connection status for each tool on mount (after redirect)
  useEffect(() => {
    async function fetchConnections() {
      if (!userId) return;
      try {
        const accounts = await composio.connectedAccounts.list(userId);
        const newConnected = { github: false, notion: false, gmail: false };
        accounts.forEach(acc => {
          if (acc.authConfigId === AUTH_CONFIG_IDS.github) newConnected.github = true;
          if (acc.authConfigId === AUTH_CONFIG_IDS.notion) newConnected.notion = true;
          if (acc.authConfigId === AUTH_CONFIG_IDS.gmail) newConnected.gmail = true;
        });
        setConnected(newConnected);
      } catch (err) {
        // Optionally log error
      }
    }
    fetchConnections();
  }, [userId]);

  const allConnected = Object.values(connected).every(Boolean);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <h2>Onboarding</h2>
      <p>Connect your tools:</p>
      <button style={{ margin: '8px' }} disabled={loading.github || connected.github} onClick={() => handleConnect('github')}>
        {connected.github ? 'Github Connected' : loading.github ? 'Connecting...' : 'Connect Github'}
      </button>
      <button style={{ margin: '8px' }} disabled={loading.notion || connected.notion} onClick={() => handleConnect('notion')}>
        {connected.notion ? 'Notion Connected' : loading.notion ? 'Connecting...' : 'Connect Notion'}
      </button>
      <button style={{ margin: '8px' }} disabled={loading.gmail || connected.gmail} onClick={() => handleConnect('gmail')}>
        {connected.gmail ? 'Gmail Connected' : loading.gmail ? 'Connecting...' : 'Connect Gmail'}
      </button>
      {/* TODO: After callback, update connected state for each tool */}
      <button style={{ marginTop: '24px', padding: '10px 20px' }} disabled={!allConnected} onClick={() => navigate('/dashboard')}>
        Continue
      </button>
    </div>
  );
}

export default OnboardingPage;
