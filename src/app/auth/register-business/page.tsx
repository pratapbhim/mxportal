
"use client";
import ParentMerchantForm from '@/components/ParentMerchantForm';

export default function RegisterBusinessPage() {
  return (
    <div>
      <h1>Register Business / Brand</h1>
      <ParentMerchantForm onSuccess={(data) => {
        // Optionally redirect or show next step
        alert('Merchant registered! ID: ' + data.parent_merchant_id);
      }} />
    </div>
  );
}
