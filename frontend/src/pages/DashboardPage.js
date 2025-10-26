import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, get_workspaces } from "../firebase";
import { signOut } from "firebase/auth";

function DashboardPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const username = useMemo(
    () => localStorage.getItem("display_name") || "Username",
    []
  );

  useEffect(() => {
    const userUUID = localStorage.getItem("user_id");
    console.log("DashboardPage mounted for user:", userUUID);
    if (!userUUID) {
      setError("You must be logged in to view your dashboard.");
      setLoading(false);
      return;
    }

    let isMounted = true;

    const fetchWorkspaces = async () => {
      try {
        const data = await get_workspaces(userUUID);
        if (isMounted) {
          setWorkspaces(data);
        }
      } catch (err) {
        console.error("Failed to fetch workspaces", err);
        if (isMounted) {
          setError("Failed to load workspaces. Please try again later.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchWorkspaces();

    return () => {
      isMounted = false;
    };
  }, []);

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
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "16px",
          borderBottom: "1px solid #eee",
        }}
      >
        <div style={{ fontWeight: "bold", fontSize: "20px" }}>
          Mention Dashboard
        </div>
        <div>
          <span style={{ marginRight: "16px" }}>{username}</span>
          <button onClick={handleLogout}>Logout</button>
        </div>
      </header>
      <main style={{ flex: 1, padding: "32px" }}>
        <h3>Your Workspaces</h3>
        {loading && <p>Loading workspaces...</p>}
        {!loading && error && (
          <div
            style={{
              marginTop: 16,
              padding: 16,
              borderRadius: 8,
              backgroundColor: "#fdecea",
              color: "#611a15",
            }}
          >
            {error}
          </div>
        )}
        {!loading && !error && workspaces.length === 0 && (
          <p>No workspaces yet.</p>
        )}
        {!loading && !error && workspaces.length > 0 && (
          <div
            style={{
              marginTop: 24,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 20,
            }}
          >
            {workspaces.map((workspace) => {
              const createdAt = workspace.createdAt;
              let createdAtDisplay = "—";

              if (createdAt?.toDate) {
                createdAtDisplay = createdAt.toDate().toLocaleString();
              } else if (createdAt instanceof Date) {
                createdAtDisplay = createdAt.toLocaleString();
              }

              return (
                <div
                  key={workspace.id}
                  style={{
                    backgroundColor: "#ffffff",
                    borderRadius: 12,
                    padding: 20,
                    boxShadow: "0 8px 16px rgba(0,0,0,0.08)",
                    border: "1px solid #ebebeb",
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                    cursor: "pointer",
                  }}
                  onClick={() => navigate(`/workspace/${workspace.id}`)}
                >
                  <div>
                    <h4 style={{ margin: 0 }}>{workspace.name}</h4>
                    <p style={{ margin: "4px 0 0", color: "#666" }}>
                      Hosted by {workspace.hostName}
                    </p>
                  </div>
                  <div style={{ fontSize: 14, color: "#555" }}>
                    <p style={{ margin: "0 0 4px" }}>
                      Members:{" "}
                      <strong>{workspace.participantCount ?? 0}</strong>
                    </p>
                    <p style={{ margin: "0 0 4px" }}>
                      Role:{" "}
                      <strong>{workspace.currentUserRole ?? "member"}</strong>
                    </p>
                    <p style={{ margin: 0 }}>Created: {createdAtDisplay}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
      {/* Floating Action Button */}
      <div style={{ position: "fixed", bottom: 32, right: 32 }}>
        <button
          style={{
            borderRadius: "50%",
            width: 56,
            height: 56,
            fontSize: 32,
            background: "#1976d2",
            color: "white",
            border: "none",
            boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
          }}
          onClick={() => {}}
        >
          +
        </button>
        {/* Dropdown menu */}
        <div style={{ marginTop: 8 }}>
          <button onClick={() => setShowCreateModal(true)}>
            Create Workspace
          </button>
          <button onClick={() => setShowJoinModal(true)}>Join Workspace</button>
        </div>
      </div>
      {/* Create Workspace Modal */}
      {showCreateModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0,0,0,0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{ background: "white", padding: 32, borderRadius: 8 }}>
            <h4>Create Workspace</h4>
            <p>
              Workspace ID: <span style={{ fontWeight: "bold" }}>TODO</span>
            </p>
            <button>Copy Code</button>
            <button style={{ marginLeft: 16 }}>Create Workspace</button>
            <button
              style={{ marginLeft: 16 }}
              onClick={() => setShowCreateModal(false)}
            >
              Close
            </button>
            {/* TODO: Logic to create workspace */}
          </div>
        </div>
      )}
      {/* Join Workspace Modal */}
      {showJoinModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0,0,0,0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{ background: "white", padding: 32, borderRadius: 8 }}>
            <h4>Join Workspace</h4>
            <input
              type="text"
              placeholder="Paste Workspace ID"
              style={{ width: "100%", marginBottom: 16 }}
            />
            <button>Join Workspace</button>
            <button
              style={{ marginLeft: 16 }}
              onClick={() => setShowJoinModal(false)}
            >
              Close
            </button>
            {/* TODO: Logic to join workspace */}
          </div>
        </div>
      )}
    </div>
  );
}

export default DashboardPage;
