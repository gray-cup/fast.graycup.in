export default function TermsPage() {
  return (
    <div className="py-14 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-black text-gray-900 mb-1">Terms & Conditions</h1>
        <p className="text-sm text-gray-400 mb-10">Last updated: May 2026</p>

        <div className="space-y-10 text-gray-700">
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">About Us</h2>
            <p className="leading-relaxed">Gray Cup Fast is operated by Gray Cup Enterprises Private Limited, registered in India. By placing an order on this website, you agree to these terms.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">Orders & Payments</h2>
            <p className="leading-relaxed">All prices are in Indian Rupees (INR) and inclusive of GST. Payments are processed securely via Cashfree. We reserve the right to cancel any order due to stock unavailability or suspected fraud, with a full refund issued.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">Delivery</h2>
            <p className="leading-relaxed">We ship across India via Delhivery. Delivery timelines are estimates and may vary. We are not liable for delays caused by courier partners, natural events, or incorrect addresses provided at checkout.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">Product Description</h2>
            <p className="leading-relaxed">We make reasonable efforts to accurately describe our products. Slight variations in colour, taste, or aroma between batches are inherent to natural agricultural products and do not constitute grounds for return.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">Privacy</h2>
            <p className="leading-relaxed">We collect only the information necessary to process your order (name, phone, address, email). We do not sell or share your data with third parties except our shipping partner (Delhivery) and payment processor (Cashfree).</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">Governing Law</h2>
            <p className="leading-relaxed">These terms are governed by the laws of India. Any disputes shall be subject to the jurisdiction of courts in Sonipat, Haryana.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">Contact</h2>
            <p className="leading-relaxed">
              Gray Cup Enterprises Private Limited<br />
              FF122, Rodeo Drive Mall, GT Road, TDI City<br />
              Kundli, Sonipat, Haryana — 131030<br />
              <a href="mailto:arjun@graycup.in" className="text-amber-600 hover:underline cursor-pointer">arjun@graycup.in</a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
