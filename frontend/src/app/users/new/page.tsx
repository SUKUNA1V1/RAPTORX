"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createUser, getApiErrorMessage } from "@/lib/api";
import type { User } from "@/lib/types";

export default function NewUserPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
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
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "clearance_level" ? parseInt(value) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload: Partial<User> = {
        ...formData,
        phone: formData.phone || null,
        department: formData.department || null,
        role: formData.role as User["role"],
      };
      await createUser(payload);
      router.push("/users");
      router.refresh();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to create user"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Add User</h1>
          <p className="text-slate-400 text-sm mt-1">Create a new user account</p>
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
                <option value="1">1 - Basic</option>
                <option value="2">2 - Standard</option>
                <option value="3">3 - Elevated</option>
                <option value="4">4 - High</option>
                <option value="5">5 - Admin</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-1">Department</label>
            <input name="department" value={formData.department} onChange={handleChange} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white" />
          </div>

          <div className="flex gap-3 pt-2">
            <Link href="/users" className="btn btn-secondary">Cancel</Link>
            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? "Creating..." : "Create User"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
