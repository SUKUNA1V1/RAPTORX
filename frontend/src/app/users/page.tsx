"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { getUsers } from "@/lib/api";
import { MOCK_USERS, ROLE_COLORS } from "@/lib/constants";
import ApiStatus from "@/components/ui/ApiStatus";
import type { User } from "@/lib/types";

const ROLE_HEX: Record<string, string> = {
  admin: "#7c3aed",
  manager: "#2563eb",
  employee: "#16a34a",
  security: "#ea580c",
  contractor: "#ca8a04",
  visitor: "#64748b",
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>(MOCK_USERS as User[]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("all");

  const fetch = useCallback(async (background = false) => {
    try {
      if (!background) {
        setLoading(true);
      }
      setError(null);
      const data = await getUsers({
        role: role !== "all" ? role : undefined,
        limit: 100,
      });
      setUsers(data.length ? data : (MOCK_USERS as User[]));
    } catch {
      setError("Cannot connect to server - showing demo data");
      setUsers(MOCK_USERS as User[]);
    } finally {
      if (!background) {
        setLoading(false);
      }
    }
  }, [role]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  useEffect(() => {
    const id = setInterval(() => fetch(true), 60000);
    return () => clearInterval(id);
  }, [fetch]);

  const filtered = users.filter((u) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      u.first_name.toLowerCase().includes(q) ||
      u.last_name.toLowerCase().includes(q) ||
      u.badge_id.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Users Management</h1>
          <p className="text-slate-400 text-sm mt-1">{filtered.length} users</p>
        </div>
        <Link href="/users/new" className="btn btn-primary">
          Add User
        </Link>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
        <div className="flex flex-wrap gap-3 mb-5">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users..."
            className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm text-slate-200 outline-none focus:border-blue-500 min-w-[220px]"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm text-slate-200 outline-none focus:border-blue-500"
          >
            <option value="all">All Roles</option>
            {["admin", "manager", "employee", "security", "contractor", "visitor"].map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <button onClick={() => fetch(true)} className="btn btn-secondary">
            Refresh
          </button>
        </div>

        {(loading || error) && <ApiStatus loading={loading} error={error} onRetry={fetch} />}

        {!loading && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  {["User", "Badge ID", "Role", "Department", "Clearance", "Status", "Last Seen", "Actions"].map((h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => {
                  const initials = u.first_name[0] + u.last_name[0];
                  return (
                    <tr
                      key={u.id}
                      className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                            style={{ background: ROLE_HEX[u.role] }}
                          >
                            {initials}
                          </div>
                          <div>
                            <div className="text-slate-200 text-sm font-medium">
                              {u.first_name} {u.last_name}
                            </div>
                            <div className="text-slate-500 text-xs">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <code className="text-blue-400 text-sm">{u.badge_id}</code>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2.5 py-0.5 rounded-md text-xs font-medium border capitalize ${ROLE_COLORS[u.role]}`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-sm">{u.department || "-"}</td>
                      <td className="px-4 py-3 text-amber-400 text-sm">
                        {"*".repeat(u.clearance_level)}
                        {".".repeat(5 - u.clearance_level)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2.5 py-0.5 rounded-md text-xs font-medium border
                                          ${
                                            u.is_active
                                              ? "bg-green-500/20 text-green-400 border-green-500/30"
                                              : "bg-slate-500/20 text-slate-400 border-slate-500/30"
                                          }`}
                        >
                          {u.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {u.last_seen_at ? new Date(u.last_seen_at).toLocaleDateString() : "-"}
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/users/${u.id}/edit`} className="btn btn-secondary btn-sm">
                          Edit
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
