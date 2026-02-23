"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { getApiErrorMessage, getUser, updateUser } from "@/lib/api";
import type { User } from "@/lib/types";

export default function EditUserPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const userId = useMemo(() => {
    const parsed = Number(params?.id);
    return Number.isFinite(parsed) ? parsed : NaN;
  }, [params]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    badge_id: "",
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    role: "employee",
    department: "",
    clearance_level: 1,
    is_active: true,
  });

  useEffect(() => {
    const load = async () => {
      if (!Number.isFinite(userId)) {
        setError("Invalid user ID");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const user = await getUser(userId);
        setFormData({
          badge_id: user.badge_id,
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
          phone: user.phone ?? "",
          role: user.role,
          department: user.department ?? "",
          clearance_level: user.clearance_level,
          is_active: user.is_active,
        });
      } catch (err) {
        setError(getApiErrorMessage(err, "Failed to load user"));
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [userId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "checkbox"
          ? (e.target as HTMLInputElement).checked
          : name === "clearance_level"
          ? parseInt(value)
          : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!Number.isFinite(userId)) return;

    try {
      setSaving(true);
      setError(null);

      const payload: Partial<User> = {
        badge_id: formData.badge_id,
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        phone: formData.phone || null,
        role: formData.role as User["role"],
        department: formData.department || null,
        clearance_level: formData.clearance_level,
        is_active: formData.is_active,
      };

      await updateUser(userId, payload);
      router.push("/users");
      router.refresh();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to update user"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-white">Edit User</h1>
        <p className="text-slate-400">Loading user...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Edit User</h1>
          <p className="text-slate-400 text-sm mt-1">Update user details</p>
        </div>
        <Link href="/users" className="btn btn-secondary">
          Back
        </Link>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
        {error && (
          <div className="mb-4 p-3 bg-red-900 border border-red-700 rounded-lg text-red-200 text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-slate-300 mb-1">Badge ID *</label>
              <input name="badge_id" value={formData.badge_id} onChange={handleChange} required className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white" />
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-1">Role *</label>
              <select name="role" value={formData.role} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white">
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
                <option value="employee">Employee</option>
                <option value="security">Security</option>
                <option value="contractor">Contractor</option>
                <option value="visitor">Visitor</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-slate-300 mb-1">First Name *</label>
              <input name="first_name" value={formData.first_name} onChange={handleChange} required className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white" />
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-1">Last Name *</label>
              <input name="last_name" value={formData.last_name} onChange={handleChange} required className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white" />
            </div>
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-1">Email *</label>
            <input type="email" name="email" value={formData.email} onChange={handleChange} required className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-slate-300 mb-1">Phone</label>
              <input name="phone" value={formData.phone} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white" />
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-1">Clearance Level *</label>
              <select name="clearance_level" value={formData.clearance_level} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white">
                <option value={1}>1 - Basic</option>
                <option value={2}>2 - Standard</option>
                <option value={3}>3 - Elevated</option>
                <option value={4}>4 - High</option>
                <option value={5}>5 - Admin</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-1">Department</label>
            <input name="department" value={formData.department} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white" />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              name="is_active"
              checked={formData.is_active}
              onChange={handleChange}
              className="rounded border-slate-700 text-blue-600"
            />
            <label htmlFor="is_active" className="text-sm text-slate-300">
              Active User
            </label>
          </div>

          <div className="flex gap-3 pt-2">
            <Link href="/users" className="btn btn-secondary">Cancel</Link>
            <button type="submit" disabled={saving} className="btn btn-primary">
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
