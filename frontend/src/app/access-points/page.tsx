"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import ApiStatus from "@/components/ui/ApiStatus";
import { getAccessPointsList } from "@/lib/api";
import type { AccessPoint } from "@/lib/types";

const ACCESS_POINTS: AccessPoint[] = [
  {
    id: 1,
    name: "Main Entrance - Building A",
    type: "turnstile",
    building: "Building A",
    floor: "Ground",
    room: "Lobby-A",
    zone: "lobby",
    status: "active",
    required_clearance: 1,
    is_restricted: false,
    ip_address: null,
  },
  {
    id: 2,
    name: "Side Entrance - Building A",
    type: "door",
    building: "Building A",
    floor: "Ground",
    room: "Side-A",
    zone: "lobby",
    status: "active",
    required_clearance: 1,
    is_restricted: false,
    ip_address: null,
  },
  {
    id: 3,
    name: "Engineering Office - A2",
    type: "door",
    building: "Building A",
    floor: "2nd",
    room: "Room-201",
    zone: "engineering",
    status: "active",
    required_clearance: 2,
    is_restricted: false,
    ip_address: null,
  },
  {
    id: 4,
    name: "Server Room - A3",
    type: "door",
    building: "Building A",
    floor: "3rd",
    room: "Room-301",
    zone: "server-room",
    status: "active",
    required_clearance: 5,
    is_restricted: true,
    ip_address: null,
  },
  {
    id: 5,
    name: "Finance Office - A2",
    type: "door",
    building: "Building A",
    floor: "2nd",
    room: "Room-202",
    zone: "finance",
    status: "active",
    required_clearance: 3,
    is_restricted: false,
    ip_address: null,
  },
  {
    id: 6,
    name: "Main Entrance - Building B",
    type: "turnstile",
    building: "Building B",
    floor: "Ground",
    room: "Lobby-B",
    zone: "lobby",
    status: "active",
    required_clearance: 1,
    is_restricted: false,
    ip_address: null,
  },
  {
    id: 7,
    name: "HR Office - B1",
    type: "door",
    building: "Building B",
    floor: "1st",
    room: "Room-101",
    zone: "hr",
    status: "active",
    required_clearance: 2,
    is_restricted: false,
    ip_address: null,
  },
  {
    id: 8,
    name: "Executive Floor - B4",
    type: "elevator",
    building: "Building B",
    floor: "4th",
    room: "Exec-Floor",
    zone: "executive",
    status: "active",
    required_clearance: 4,
    is_restricted: true,
    ip_address: null,
  },
  {
    id: 9,
    name: "Parking Gate A",
    type: "gate",
    building: "Building A",
    floor: "P0",
    room: "Parking-A",
    zone: "parking",
    status: "active",
    required_clearance: 1,
    is_restricted: false,
    ip_address: null,
  },
  {
    id: 10,
    name: "Parking Gate B",
    type: "gate",
    building: "Building B",
    floor: "P0",
    room: "Parking-B",
    zone: "parking",
    status: "maintenance",
    required_clearance: 1,
    is_restricted: false,
    ip_address: null,
  },
];

const TYPE_LABELS: Record<string, string> = {
  door: "Door",
  gate: "Gate",
  turnstile: "Turnstile",
  elevator: "Elevator",
  server_room: "Server Room",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-500/20 text-green-400 border-green-500/30",
  maintenance: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  disabled: "bg-red-500/20 text-red-400 border-red-500/30",
};

export default function AccessPointsPage() {
  const [accessPoints, setAccessPoints] = useState<AccessPoint[]>(ACCESS_POINTS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAccessPoints = useCallback(async (background = false) => {
    try {
      if (!background) {
        setLoading(true);
      }
      setError(null);
      const data = await getAccessPointsList();
      setAccessPoints(data.length ? data : ACCESS_POINTS);
    } catch {
      setError("Cannot connect to server - showing demo data");
      setAccessPoints(ACCESS_POINTS);
    } finally {
      if (!background) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchAccessPoints();
  }, [fetchAccessPoints]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Access Points</h1>
          <p className="text-slate-400 text-sm mt-1">
            {accessPoints.length} access points across all buildings
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => fetchAccessPoints()} className="btn btn-secondary">
            Refresh
          </button>
          <Link href="/access-points/new" className="btn btn-primary">
            Add Device
          </Link>
        </div>
      </div>

      {(loading || error) && <ApiStatus loading={loading} error={error} onRetry={() => fetchAccessPoints()} />}

      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                {["Name", "Type", "Location", "Zone", "Status", "Clearance", "Restricted", "Actions"].map((h) => (
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
              {accessPoints.map((ap) => (
                <tr
                  key={ap.id}
                  className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="text-slate-200 text-sm font-medium">{ap.name}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-sm capitalize">
                    {TYPE_LABELS[ap.type] || "Door"} {ap.type}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-slate-200 text-sm">{ap.building}</div>
                    <div className="text-slate-500 text-xs">
                      {ap.floor} - {ap.room}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-slate-400 text-xs bg-slate-700 px-2 py-1 rounded capitalize">
                      {ap.zone}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2.5 py-0.5 rounded-md text-xs font-medium border capitalize ${
                        STATUS_COLORS[ap.status]
                      }`}
                    >
                      {ap.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-amber-400 text-sm">
                    {"*".repeat(ap.required_clearance)}
                    {".".repeat(5 - ap.required_clearance)}
                  </td>
                  <td className="px-4 py-3">
                    {ap.is_restricted ? (
                      <span className="text-red-400 text-sm">Yes</span>
                    ) : (
                      <span className="text-slate-500 text-sm">No</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/access-points/${ap.id}/edit`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 rounded text-xs font-medium transition-colors"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
