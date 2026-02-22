"use client";

import { useState } from "react";
import AddAccessPointForm from "@/components/forms/AddAccessPointForm";

const ACCESS_POINTS = [
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
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Access Points</h1>
          <p className="text-slate-400 text-sm mt-1">
            {ACCESS_POINTS.length} access points across all buildings
          </p>
        </div>
        <button 
          onClick={() => setShowForm(true)}
          className="btn btn-primary"
        >
          Add Device
        </button>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                {["Name", "Type", "Location", "Zone", "Status", "Clearance", "Restricted"].map((h) => (
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
              {ACCESS_POINTS.map((ap) => (
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <AddAccessPointForm 
          onSuccess={() => setShowForm(false)}
          onClose={() => setShowForm(false)} 
        />
      )}
    </div>
  );
}
