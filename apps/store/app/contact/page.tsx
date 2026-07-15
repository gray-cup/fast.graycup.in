export default function ContactPage() {
  return (
    <div className="py-14 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-black text-gray-900 mb-1">Contact Us</h1>
        <p className="text-sm text-gray-400 mb-10">We're available Mon–Sat, 10am–6pm IST</p>

        <div className="space-y-6">
          <div className="flex flex-col gap-3">
            <a
              href="mailto:arjun@graycup.in"
              className="flex items-center gap-4 p-5 bg-white border border-gray-200 rounded-2xl hover:border-amber-300 transition-colors group cursor-pointer"
            >
              <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5">Email</p>
                <p className="font-bold text-gray-900 group-hover:text-amber-600 transition-colors">arjun@graycup.in</p>
              </div>
            </a>
            <a
              href="mailto:office@graycup.org"
              className="flex items-center gap-4 p-5 bg-white border border-gray-200 rounded-2xl hover:border-amber-300 transition-colors group cursor-pointer"
            >
              <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5">Office</p>
                <p className="font-bold text-gray-900 group-hover:text-amber-600 transition-colors">office@graycup.org</p>
              </div>
            </a>
          </div>

          <a
            href="tel:+918527914317"
            className="flex items-center gap-4 p-5 bg-white border border-gray-200 rounded-2xl hover:border-amber-300 transition-colors group cursor-pointer"
          >
            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5">Phone</p>
              <p className="font-bold text-gray-900 group-hover:text-amber-600 transition-colors">+91 85279 14317</p>
            </div>
          </a>

          <div className="flex items-start gap-4 p-5 bg-white border border-gray-200 rounded-2xl">
            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5">Address</p>
              <p className="font-bold text-gray-900">Gray Cup Enterprises Private Limited</p>
              <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">FF122, Rodeo Drive Mall, GT Road, TDI City<br />Kundli, Sonipat, Haryana — 131030</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
