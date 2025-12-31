"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function RegisterParent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phone = searchParams?.get("phone") || "";
  const [form, setForm] = useState({
    parent_store_name: "",
    merchant_type: "LOCAL",
    owner_name: "",
    owner_email: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!phone) {
      router.replace("/auth/register-phone");
    }
  }, [phone, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/parent-merchant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, registered_phone: phone }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Failed to register.");
    } else {
      router.push(`/auth/register-store?parent_id=${data.parent_merchant_id || ""}`);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 px-1 py-2">
      <div className="w-full max-w-md p-4 rounded-2xl shadow-xl bg-white/98 border border-blue-100 backdrop-blur-lg flex flex-col gap-4" style={{maxHeight:'98vh'}}>
        <div className="flex flex-col items-center gap-1 mb-2">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-2 rounded-full shadow mb-1">
            <svg xmlns='http://www.w3.org/2000/svg' className='h-8 w-8 text-white' fill='none' viewBox='0 0 24 24' stroke='currentColor'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M16 7a4 4 0 01-8 0M12 3v4m0 0a4 4 0 01-4 4m4-4a4 4 0 014 4m-4 4v4m0 0a4 4 0 01-4 4m4-4a4 4 0 014 4' /></svg>
          </div>
          <h2 className="text-2xl font-extrabold text-gray-800 text-center leading-tight">Register Business / Brand</h2>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <div className="flex flex-col gap-0.5">
            <label className="block text-gray-700 font-medium text-sm">Registered Phone<span className='text-red-500'>*</span></label>
            <input
              name="registered_phone"
              value={phone}
              readOnly
              className="w-full border border-blue-200 bg-gray-100 rounded px-3 py-2 text-base shadow-sm cursor-not-allowed focus:outline-none"
            />
          </div>
          <div className="flex flex-col gap-0.5">
            <label className="block text-gray-700 font-medium text-sm">Parent Store Name<span className='text-red-500'>*</span></label>
            <input
              name="parent_store_name"
              value={form.parent_store_name}
              onChange={handleChange}
              required
              className="w-full border border-blue-200 rounded px-3 py-2 text-base shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-100"
            />
          </div>
          <div className="flex flex-col gap-0.5">
            <label className="block text-gray-700 font-medium text-sm">Merchant Type<span className='text-red-500'>*</span></label>
            <select
              name="merchant_type"
              value={form.merchant_type}
              onChange={handleChange}
              required
              className="w-full border border-blue-200 rounded px-3 py-2 text-base shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-100"
            >
              <option value="LOCAL">LOCAL</option>
              <option value="BRAND">BRAND</option>
            </select>
          </div>
          <div className="flex flex-col gap-0.5">
            <label className="block text-gray-700 font-medium text-sm">Owner Name</label>
            <input
              name="owner_name"
              value={form.owner_name}
              onChange={handleChange}
              className="w-full border border-blue-200 rounded px-3 py-2 text-base shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-100"
            />
          </div>
          <div className="flex flex-col gap-0.5">
            <label className="block text-gray-700 font-medium text-sm">Owner Email</label>
            <input
              name="owner_email"
              value={form.owner_email}
              onChange={handleChange}
              type="email"
              autoComplete="off"
              className="w-full border border-blue-200 rounded px-3 py-2 text-base shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-100"
            />
          </div>
          {error && <div className="text-red-600 text-xs font-medium text-center">{error}</div>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 rounded bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 font-semibold text-white text-base shadow-md transition-all disabled:opacity-50"
          >
            {loading ? "Registering..." : "Register"}
          </button>
        </form>
      </div>
    </div>
  );
}
