export default function RefundReturnsPage() {
  return (
    <div className="py-14 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-black text-gray-900 mb-1">Refunds & Cancellations</h1>
        <p className="text-sm text-gray-400 mb-10">Last updated: May 2026</p>

        <div className="space-y-10 text-gray-700">
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">Cancellations</h2>
            <p className="leading-relaxed">Orders can be cancelled within 12 hours of placing them by contacting us at <a href="mailto:arjun@graycup.in" className="text-amber-600 hover:underline">arjun@graycup.in</a> or calling <a href="tel:+918527914317" className="text-amber-600 hover:underline">+91 85279 14317</a>. Once the order has been dispatched, cancellation is not possible.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">Returns</h2>
            <p className="leading-relaxed">We do not accept returns. However, if the contents inside your package arrive damaged, please reach out to us and we will do our best to make it right.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">Damaged Items</h2>
            <p className="leading-relaxed">If the tea inside your package is damaged on arrival, contact us within 48 hours of delivery with a photo and your order details. Email us at <a href="mailto:arjun@graycup.in" className="text-amber-600 hover:underline">arjun@graycup.in</a> or call <a href="tel:+918527914317" className="text-amber-600 hover:underline">+91 85279 14317</a> and we will do our best to assist you.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">Shipping</h2>
            <p className="leading-relaxed">We ship via Delhivery across India. Tracking details are shared once your order is dispatched. Delivery typically takes 3–7 business days depending on location.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">Contact</h2>
            <p className="leading-relaxed">
              Email: <a href="mailto:arjun@graycup.in" className="text-amber-600 hover:underline">arjun@graycup.in</a><br />
              Phone: <a href="tel:+918527914317" className="text-amber-600 hover:underline">+91 85279 14317</a><br />
              Mon–Sat, 10am–6pm IST
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
