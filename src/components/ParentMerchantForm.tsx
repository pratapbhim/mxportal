"use client";
import { useState } from 'react';
import { parentMerchantSchema, ParentMerchantInput } from '@/lib/validation/parentMerchantSchema';

export default function ParentMerchantForm({ onSuccess }: { onSuccess: (data: any) => void }) {
  const [form, setForm] = useState<ParentMerchantInput>({
    parent_store_name: '',
    registered_phone: '',
    merchant_type: 'LOCAL',
    owner_name: '',
    owner_email: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const parsed = parentMerchantSchema.safeParse(form);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    const res = await fetch('/api/parent-merchant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || 'Failed to register.');
    } else {
      onSuccess(data);
    }
  };

  return (
    <form onSubmit={handleSubmit} autoComplete="off" className="space-y-4">
      <div className="flex flex-col gap-1">
        <label className="font-medium text-gray-700">Parent Store Name*</label>
        <input
          name="parent_store_name"
          value={form.parent_store_name}
          onChange={handleChange}
          required
          type="text"
          autoComplete="off"
          className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-900 bg-white"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="font-medium text-gray-700">Registered Phone*</label>
        <input
          name="registered_phone"
          value={form.registered_phone}
          onChange={handleChange}
          required
          type="tel"
          autoComplete="off"
          className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-900 bg-white"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="font-medium text-gray-700">Merchant Type*</label>
        <select
          name="merchant_type"
          value={form.merchant_type}
          onChange={handleChange}
          required
          className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-900 bg-white"
        >
          <option value="LOCAL">LOCAL</option>
          <option value="BRAND">BRAND</option>
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label className="font-medium text-gray-700">Owner Name</label>
        <input
          name="owner_name"
          value={form.owner_name}
          onChange={handleChange}
          type="text"
          autoComplete="off"
          className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-900 bg-white"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="font-medium text-gray-700">Owner Email</label>
        <input
          name="owner_email"
          value={form.owner_email}
          onChange={handleChange}
          type="email"
          autoComplete="off"
          className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-900 bg-white"
        />
      </div>
      {error && <div className="text-red-600 font-medium text-sm">{error}</div>}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-2 px-4 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        {loading ? 'Registering...' : 'Register'}
      </button>
    </form>
  );
}
