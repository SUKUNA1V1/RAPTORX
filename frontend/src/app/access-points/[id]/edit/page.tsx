"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { getAccessPoint, getApiErrorMessage, updateAccessPoint } from "@/lib/api";
import type { AccessPoint } from "@/lib/types";

export default function EditAccessPointPage() {
  const router = useRouter();
  const params = useParams();
  const accessPointId = useMemo(() => {
    const value = Array.isArray(params.id) ? params.id[0] : params.id;
    return value ? Number(value) : NaN;
  }, [params.id]);

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    type: "door",
    building: "",
    floor: "",
    room: "",
    zone: "lobby",
    status: "active",
    required_clearance: 1,
    is_restricted: false,
    ip_address: "",
    description: "",
  });

  useEffect(() => {
    if (!Number.isFinite(accessPointId)) {
      setError("Invalid access point id");
      setLoadingData(false);
      return;
    }

    let isMounted = true;
    const loadAccessPoint = async () => {
      try {
        setLoadingData(true);
        setError(null);
        const accessPoint = await getAccessPoint(accessPointId);
        if (!isMounted) return;
        setFormData({
          name: accessPoint.name ?? "",
          type: accessPoint.type ?? "door",
          building: accessPoint.building ?? "",
          floor: accessPoint.floor ?? "",
          room: accessPoint.room ?? "",
          zone: accessPoint.zone ?? "lobby",
          status: accessPoint.status ?? "active",
          required_clearance: accessPoint.required_clearance ?? 1,
          is_restricted: accessPoint.is_restricted ?? false,
          ip_address: accessPoint.ip_address ?? "",
          description: accessPoint.description ?? "",
        });
      } catch (err) {
        if (isMounted) {
          setError(getApiErrorMessage(err, "Failed to load access point"));
        }
      } finally {
        if (isMounted) {
          setLoadingData(false);
        }
      }
    };

    loadAccessPoint();

    return () => {
      isMounted = false;
    };
  }, [accessPointId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "checkbox" ? (e.target as HTMLInputElement).checked : name === "required_clearance" ? parseInt(value) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!Number.isFinite(accessPointId)) {
      setError("Invalid access point id");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const building = formData.building.trim();
      if (!building) {
        setError("Building is required");
        setLoading(false);
        return;
      }

      const payload: Partial<AccessPoint> = {
        ...formData,
        status: formData.status as AccessPoint["status"],
        name: formData.name.trim(),
        type: formData.type.trim(),
        building,
        floor: formData.floor.trim() || null,
        room: formData.room.trim() || null,
        zone: formData.zone.trim() || null,
        ip_address: formData.ip_address.trim() || null,
        description: formData.description.trim() || null,
      };

      await updateAccessPoint(accessPointId, payload);
      router.push("/access-points");
      router.refresh();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to update access point"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Edit Access Point</h1>
          <p className="text-slate-400 text-sm mt-1">Update device details and access controls</p>
        </div>
        <Link href="/access-points" className="btn btn-secondary">
          Back
        </Link>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
        {error && (
          <div className="mb-4 p-3 bg-red-900 border border-red-700 rounded-lg text-red-200 text-sm">{error}</div>
        )}

        {loadingData ? (
          <div className="text-slate-300">Loading access point...</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-slate-300 mb-1">Name *</label>
              <input
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-slate-300 mb-1">Type *</label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                >
                  <option value="door">Door</option>
                  <option value="turnstile">Turnstile</option>
                  <option value="gate">Gate</option>
                  <option value="elevator">Elevator</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">Zone *</label>
                <select
                  name="zone"
                  value={formData.zone}
                  onChange={handleChange}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                >
                  <option value="lobby">Lobby</option>
                  <option value="engineering">Engineering</option>
                  <option value="server-room">Server Room</option>
                  <option value="finance">Finance</option>
                  <option value="hr">HR</option>
                  <option value="parking">Parking</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-slate-300 mb-1">Building *</label>
                <input
                  name="building"
                  value={formData.building}
                  onChange={handleChange}
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">Floor</label>
                <input
                  name="floor"
                  value={formData.floor}
                  onChange={handleChange}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-slate-300 mb-1">Room</label>
                <input
                  name="room"
                  value={formData.room}
                  onChange={handleChange}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">Required Clearance</label>
                <select
                  name="required_clearance"
                  value={formData.required_clearance}
                  onChange={handleChange}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                >
                  <option value="1">1 - Basic</option>
                  <option value="2">2 - Standard</option>
                  <option value="3">3 - Elevated</option>
                  <option value="4">4 - High</option>
                  <option value="5">5 - Admin</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-slate-300 mb-1">Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                >
                  <option value="active">Active</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="disabled">Disabled</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">IP Address</label>
                <input
                  name="ip_address"
                  value={formData.ip_address}
                  onChange={handleChange}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-slate-300 mb-1">Description</label>
              <input
                name="description"
                value={formData.description}
                onChange={handleChange}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                name="is_restricted"
                id="is_restricted"
                checked={formData.is_restricted}
                onChange={(e) => setFormData((prev) => ({ ...prev, is_restricted: e.target.checked }))}
                className="rounded border-slate-700 text-blue-600"
              />
              <label htmlFor="is_restricted" className="text-sm text-slate-300">
                Restricted Area
              </label>
            </div>

            <div className="flex gap-3 pt-2">
              <Link href="/access-points" className="btn btn-secondary">Cancel</Link>
              <button type="submit" disabled={loading} className="btn btn-primary">
                {loading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
