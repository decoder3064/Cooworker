import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Composio } from '@composio/core';

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
  const [initialLoading, setInitialLoading] = useState(true);

  // Use Firebase Auth UID as userId
  const userId = localStorage.getItem('user_id');
  console.log("Onboarding for userId:", userId);

  // Fetch connection status for all tools
  const fetchConnections = async () => {
    console.log('[Onboarding] fetchConnections called');
    console.log('[Onboarding] userId:', userId);
    if (!userId) {
      setInitialLoading(false);
      return;
    }
    try {
      const accountsResponse = await composio.connectedAccounts.list({'userId':userId});
      console.log('[Onboarding] composio.connectedAccounts.list result:', accountsResponse);
      const accounts = Array.isArray(accountsResponse.items) ? accountsResponse.items : [];
      const newConnected = { github: false, notion: false, gmail: false };
      accounts.forEach(acc => {
        console.log('[Onboarding] Account:', acc);
        console.log(acc.userId);
        // Mark as connected if the account's authConfig matches and is ACTIVE
        if (acc.authConfig?.id === AUTH_CONFIG_IDS.github && acc.status === 'ACTIVE') newConnected.github = true;
        if (acc.authConfig?.id === AUTH_CONFIG_IDS.notion && acc.status === 'ACTIVE') newConnected.notion = true;
        if (acc.authConfig?.id === AUTH_CONFIG_IDS.gmail && acc.status === 'ACTIVE') newConnected.gmail = true;
      });
      setConnected(newConnected);
      console.log('[Onboarding] newConnected state:', newConnected);
    } catch (err) {
      console.error('[Onboarding] Error fetching connections:', err);
    } finally {
      setInitialLoading(false);
    }
  };

  // Run connection check on mount and after linking
  useEffect(() => {
    fetchConnections();
    // Optionally, you can listen for changes in location or add a manual refresh
    // window.addEventListener('focus', fetchConnections);
    // return () => window.removeEventListener('focus', fetchConnections);
  }, [userId]);

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
      // After redirect, fetchConnections will run again
    }
  };

  return (
    <div className="onboarding-page-container">
      <h2 className="onboarding-title">Onboarding</h2>
      <p className="onboarding-subtitle">Connect your tools:</p>
      {initialLoading ? (
        <div className="onboarding-loading">Checking connections...</div>
      ) : (
        <>
          <button className="tool-connect-btn" disabled={loading.github || connected.github} onClick={() => handleConnect('github')}>
            {connected.github ? 'Github Connected' : loading.github ? 'Connecting...' : 'Connect Github'}
          </button>
          <button className="tool-connect-btn" disabled={loading.notion || connected.notion} onClick={() => handleConnect('notion')}>
            {connected.notion ? 'Notion Connected' : loading.notion ? 'Connecting...' : 'Connect Notion'}
          </button>
          <button className="tool-connect-btn" disabled={loading.gmail || connected.gmail} onClick={() => handleConnect('gmail')}>
            {connected.gmail ? 'Gmail Connected' : loading.gmail ? 'Connecting...' : 'Connect Gmail'}
          </button>
          <button className="continue-btn" onClick={() => navigate('/dashboard')}>
            Continue
          </button>
        </>
      )}
    </div>
  );
}

export default OnboardingPage;
