import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { logout } from "../services/auth";

export default function Home() {
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/test")
      .then((res) => setData(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-5 text-center">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">
            {{PROJECT_NAME}}
          </h1>

          <p className="text-sm text-gray-400 flex items-center justify-center gap-1">
            <span>⚡</span>
            <span>QuickStack · Full-Stack Template</span>
          </p>

          <button
            onClick={handleLogout}
            className="mt-2 px-3 py-1 text-xs font-medium rounded-md border border-gray-700 text-gray-300 hover:bg-gray-800 transition"
          >
            Logout
          </button>
        </div>

        {/* Box */}
        <div className="w-full rounded-2xl border border-gray-800 bg-gray-900 p-5 space-y-4 shadow-sm text-left">
          {/* Top Row */}
          <div className="flex items-center justify-between">
            <p className="text-xs font-mono text-gray-500">GET /api/test</p>
            <span className="text-[10px] px-2 py-0.5 rounded bg-gray-800 text-gray-400">
              API
            </span>
          </div>

          {/* Loading */}
          {loading && (
            <div className="flex items-center gap-2 text-yellow-400 text-sm">
              <span className="h-2 w-2 rounded-full bg-yellow-400 animate-pulse" />
              Connecting...
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="rounded-xl border border-red-800 bg-red-950/60 p-3 space-y-1">
              <p className="text-sm font-semibold text-red-400">
                Connection failed
              </p>
              <p className="text-xs font-mono text-red-300">{error}</p>
            </div>
          )}

          {/* Success */}
          {data && (
            <div className="rounded-xl border border-green-800 bg-green-950/60 p-3 space-y-1">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                <p className="text-sm font-semibold text-green-300">
                  {data.message}
                </p>
              </div>
              <p className="text-xs font-mono text-gray-500">
                {data.timestamp}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
