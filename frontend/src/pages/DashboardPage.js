import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  auth,
  create_workspace,
  get_workspaces,
  join_workspace,
} from "../firebase";
import { signOut } from "firebase/auth";

function DashboardPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showFabMenu, setShowFabMenu] = useState(false);
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [createError, setCreateError] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [joinWorkspaceId, setJoinWorkspaceId] = useState("");
  const [joinError, setJoinError] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [userUUID] = useState(() => localStorage.getItem("user_id") || "");
  const navigate = useNavigate();

  // Resolve backend URL from env and normalize (remove trailing slash)
  const backendUrl = process.env.REACT_APP_BACKEND_URL || "";

  // Get username from Firebase auth
  const username =
    auth.currentUser?.displayName ||
    auth.currentUser?.email?.split("@")[0] ||
    "User";

  const fetchWorkspaces = useCallback(async () => {
    if (!userUUID) {
      return [];
    }
    return get_workspaces(userUUID);
  }, [userUUID]);

  useEffect(() => {
    if (!userUUID) {
      setError("You must be logged in to view your dashboard.");
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError("");

    fetchWorkspaces()
      .then((data) => {
        if (isMounted) {
          setWorkspaces(data);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch workspaces", err);
        if (isMounted) {
          setError("Failed to load workspaces. Please try again later.");
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [fetchWorkspaces, userUUID]);

  const refreshWorkspaces = useCallback(async () => {
    try {
      const data = await fetchWorkspaces();
      setError("");
      setWorkspaces(data);
      return true;
    } catch (err) {
      console.error("Failed to refresh workspaces", err);
      setError("Failed to load workspaces. Please try again later.");
      return false;
    }
  }, [fetchWorkspaces]);

  const handleOpenCreateModal = () => {
    setShowCreateModal(true);
    setNewWorkspaceName("");
    setCreateError("");
  };

  const handleCloseCreateModal = () => {
    setShowCreateModal(false);
    setNewWorkspaceName("");
    setCreateError("");
  };

  const handleOpenJoinModal = () => {
    setShowJoinModal(true);
    setJoinWorkspaceId("");
    setJoinError("");
  };

  const handleCloseJoinModal = () => {
    setShowJoinModal(false);
    setJoinWorkspaceId("");
    setJoinError("");
  };

  const handleCreateWorkspace = async () => {
    const trimmedName = newWorkspaceName.trim();
    if (!trimmedName) {
      setCreateError("Workspace name is required.");
      return;
    }

    if (!userUUID) {
      setCreateError("You must be logged in to create a workspace.");
      return;
    }

    setIsCreating(true);
    setCreateError("");
    setError("");

    try {
      // Create the workspace and try to get its ID
      const created = await create_workspace(userUUID, trimmedName);
      let newWorkspaceId = null;
      if (typeof created === "string") {
        newWorkspaceId = created;
      } else if (created && (created.workspaceId || created.id)) {
        newWorkspaceId = created.workspaceId || created.id;
      }

      // POST to backend /joinWorkspace with CORS-friendly options
      if (backendUrl && newWorkspaceId) {
        try {
          const base = backendUrl.replace(/\/$/, "");
          const url = `${base}/joinWorkspace?user_id=${encodeURIComponent(
            userUUID
          )}&workspace_id=${encodeURIComponent(newWorkspaceId)}`;

          const res = await fetch(url, {
            method: "POST", // change to "GET" if your backend route is GET
            mode: "cors",
            headers: {
              Accept: "application/json",
            },
          });
          if (!res.ok) {
            const text = await res.text().catch(() => "");
            console.error("joinWorkspace failed:", res.status, text);
          }
        } catch (e) {
          console.error("Failed to call backend /joinWorkspace:", e);
        }
      } else {
        console.warn(
          "Skipping backend /joinWorkspace call; missing BACKEND_URL or workspace ID"
        );
      }

      setLoading(true);
      const refreshed = await refreshWorkspaces();
      if (refreshed) {
        handleCloseCreateModal();
      } else {
        setCreateError(
          "Workspace created, but we couldn't refresh your list. Please reload."
        );
      }
    } catch (err) {
      console.error("Failed to create workspace", err);
      setCreateError("Failed to create workspace. Please try again.");
    } finally {
      setIsCreating(false);
      setLoading(false);
    }
  };

  const handleJoinWorkspace = async () => {
    const trimmedWorkspaceId = joinWorkspaceId.trim();

    if (!trimmedWorkspaceId) {
      setJoinError("Workspace ID is required.");
      return;
    }

    if (!userUUID) {
      setJoinError("You must be logged in to join a workspace.");
      return;
    }

    setIsJoining(true);
    setJoinError("");
    setError("");

    try {
      const joined = await join_workspace(userUUID, trimmedWorkspaceId);
      if (!joined) {
        setJoinError("Workspace not found. Double-check the ID and try again.");
        return;
      }

      setLoading(true);
      const refreshed = await refreshWorkspaces();
      if (refreshed) {
        handleCloseJoinModal();
      } else {
        setJoinError(
          "Joined workspace, but we couldn't refresh your list. Please reload."
        );
      }
    } catch (err) {
      console.error("Failed to join workspace", err);
      setJoinError("Failed to join workspace. Please try again.");
    } finally {
      setIsJoining(false);
      setLoading(false);
    }
  };

  // Logout handler
  const handleLogout = async () => {
    try {
      await signOut(auth);
      // Remove user token from localStorage or env
      localStorage.removeItem("userToken");
      localStorage.removeItem("user_id");
      localStorage.removeItem("display_name");
      navigate("/");
    } catch (error) {
      alert("Logout failed: " + error.message);
    }
  };

  return (
    <div className="dashboard-page-container">
      <header className="dashboard-header">
        <div className="dashboard-logo">Dashboard</div>
        <div className="dashboard-user-section">
          <span className="dashboard-username">{username}</span>
          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>
      <main className="dashboard-main">
        <h3 className="workspaces-title">Your Workspaces</h3>
        {loading && (
          <p className="no-workspaces-message">Loading workspaces...</p>
        )}
        {!loading && error && <div className="error-message">{error}</div>}
        {!loading && !error && workspaces.length === 0 && (
          <p className="no-workspaces-message">No workspaces yet.</p>
        )}
        {!loading && !error && workspaces.length > 0 && (
          <ul className="workspaces-list">
            {workspaces.map((workspace) => {
              const createdAt = workspace.createdAt;
              let createdAtDisplay = "—";

              if (createdAt?.toDate) {
                createdAtDisplay = createdAt.toDate().toLocaleString();
              } else if (createdAt instanceof Date) {
                createdAtDisplay = createdAt.toLocaleString();
              }

              const workspaceIdToUse = workspace.workspaceId || workspace.id;

              return (
                <li
                  key={workspaceIdToUse}
                  className="workspace-list-item"
                  onClick={() => navigate(`/workspace/${workspaceIdToUse}`)}
                >
                  <h4 className="workspace-name">{workspace.name}</h4>
                  <p className="workspace-host">
                    Hosted by {workspace.hostName}
                  </p>
                  <p className="workspace-id">ID: {workspaceIdToUse}</p>
                  <div className="workspace-details">
                    <p className="workspace-stat">
                      Members:{" "}
                      <strong>{workspace.participantCount ?? 0}</strong>
                    </p>
                    <p className="workspace-stat">
                      Role:{" "}
                      <strong>{workspace.currentUserRole ?? "member"}</strong>
                    </p>
                    <p className="workspace-created">
                      Created: {createdAtDisplay}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>
      {/* Floating Action Button */}
      <div
        className="fab-container"
        onMouseEnter={() => {
          console.log("Mouse entered FAB container");
          setShowFabMenu(true);
        }}
        onMouseLeave={() => {
          console.log("Mouse left FAB container");
          setShowFabMenu(false);
        }}
      >
        <button
          className="fab-button"
          onClick={() => {
            console.log("FAB clicked, toggling menu");
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
              console.log("Mouse entered dropdown");
              setShowFabMenu(true);
            }}
          >
            <button
              className="fab-action-btn"
              onClick={() => {
                console.log("Create Workspace clicked");
                handleOpenCreateModal();
                setShowFabMenu(false);
              }}
            >
              Create Workspace
            </button>
            <button
              className="fab-action-btn"
              onClick={() => {
                console.log("Join Workspace clicked");
                handleOpenJoinModal();
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
        <div className="modal-overlay" onClick={handleCloseCreateModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h4 className="modal-title">Create Workspace</h4>
            <label htmlFor="workspace-name-input" className="modal-label">
              Workspace Name
            </label>
            <input
              id="workspace-name-input"
              type="text"
              value={newWorkspaceName}
              onChange={(event) => setNewWorkspaceName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !isCreating) {
                  event.preventDefault();
                  handleCreateWorkspace();
                }
              }}
              placeholder="Enter a workspace name"
              className="modal-input"
            />
            {createError && <p className="modal-error">{createError}</p>}
            <button
              className="modal-btn modal-btn-primary"
              onClick={handleCreateWorkspace}
              disabled={isCreating}
            >
              {isCreating ? "Creating..." : "Create Workspace"}
            </button>
            <button
              className="modal-btn"
              onClick={handleCloseCreateModal}
              disabled={isCreating}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {/* Join Workspace Modal */}
      {showJoinModal && (
        <div className="modal-overlay" onClick={handleCloseJoinModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h4 className="modal-title">Join Workspace</h4>
            <input
              type="text"
              placeholder="Paste Workspace ID"
              value={joinWorkspaceId}
              onChange={(event) => setJoinWorkspaceId(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !isJoining) {
                  event.preventDefault();
                  handleJoinWorkspace();
                }
              }}
              className="modal-input"
            />
            {joinError && <p className="modal-error">{joinError}</p>}
            <button
              className="modal-btn modal-btn-primary"
              onClick={handleJoinWorkspace}
              disabled={isJoining}
            >
              {isJoining ? "Joining..." : "Join Workspace"}
            </button>
            <button
              className="modal-btn"
              onClick={handleCloseJoinModal}
              disabled={isJoining}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DashboardPage;
