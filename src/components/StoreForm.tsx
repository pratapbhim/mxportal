"use client";
import { useState } from 'react';
import { storeSchema, StoreInput } from '@/lib/validation/storeSchema';

const initial: StoreInput = {
  parent_id: 0,
  store_name: '',
  cuisine_type: [],
  store_description: '',
  store_email: '',
  store_phones: [],
  store_banner_url: '',
  ads_images: [],
  full_address: '',
  city: '',
  state: '',
  landmark: '',
  postal_code: '',
  latitude: undefined,
  longitude: undefined,
  pan_number: '',
  pan_image_url: '',
  aadhar_number: '',
  aadhar_image_url: '',
  gst_number: '',
  gst_image_url: '',
  fssai_number: '',
  fssai_image_url: '',
  bank_account_holder: '',
  bank_account_number: '',
  bank_ifsc: '',
  bank_name: '',
  opening_time: '',
  closing_time: '',
  closed_days: [],
  avg_delivery_time_minutes: undefined,
  min_order_amount: undefined,
  has_area_manager: false,
  am_name: '',
  am_mobile: '',
  am_email: '',
};

export default function StoreForm({ parentId, onSuccess }: { parentId: number; onSuccess: (data: any) => void }) {
  const [form, setForm] = useState<StoreInput>({ ...initial, parent_id: parentId });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // TODO: Add R2 upload logic for images and set signed URLs in form state

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleArrayChange = (name: keyof StoreInput, value: string[]) => {
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const parsed = storeSchema.safeParse(form);
    if (!parsed.success) {
      setError(parsed.error.errors[0].message);
      return;
    }
    setLoading(true);
    const res = await fetch('/api/store', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || 'Failed to add store.');
    } else {
      onSuccess(data);
    }
  };

  // TODO: Render multi-section form (basic, location, compliance, bank, operations)
  // TODO: Conditional Area Manager fields

  return (
    <form onSubmit={handleSubmit}>
      {/* Render all form sections here */}
      {error && <div style={{ color: 'red' }}>{error}</div>}
      <button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Add Store'}</button>
    </form>
  );
}
