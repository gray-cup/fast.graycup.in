export default function Footer() {
  return (
    <footer className="bg-blue-500 text-white mt-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-8">
          {/* Brand */}
          <div>
            <p className="text-xl font-black mb-2">
              Gray Cup <span className="text-amber-300">(Fast)</span>
            </p>
          </div>

          {/* Policies */}
          <div>
            <p className="font-bold text-sm uppercase tracking-widest text-blue-200 mb-3">Policies</p>
            <ul className="space-y-2 text-base text-blue-100">
              <li><a href="/policies/refund-returns" className="hover:text-white transition-colors cursor-pointer">Refunds & Cancellations</a></li>
              <li><a href="/policies/terms" className="hover:text-white transition-colors cursor-pointer">Terms & Conditions</a></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <p className="font-bold text-sm uppercase tracking-widest text-blue-200 mb-3">Contact</p>
            <ul className="space-y-2 text-base text-blue-100">
              <li><a href="/contact" className="hover:text-white transition-colors cursor-pointer">Contact Us</a></li>
              <li><a href="mailto:arjun@graycup.in" className="hover:text-white transition-colors cursor-pointer">arjun@graycup.in</a></li>
              <li><a href="tel:+918527914317" className="hover:text-white transition-colors cursor-pointer">+91 85279 14317</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-blue-500 pt-6 text-sm text-blue-200 flex flex-col sm:flex-row justify-between gap-2">
          <span>© {new Date().getFullYear()} Gray Cup Enterprises Private Limited. All rights reserved.</span>
          <span>Payments by Cashfree</span>
        </div>
      </div>
    </footer>
  );
}
