"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/lib/cart";
import CartDrawer from "@/components/CartDrawer";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const { totalItems } = useCart();

  return (
    <>
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* Logo */}
            <Link href="/" className="flex items-center">
              <span className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
                Gray Cup<span className="text-amber-500"> (Fast)</span>
              </span>
            </Link>

            {/* Right side: track + cart + hamburger */}
            <div className="flex items-center gap-3">
              <Link
                href="/track"
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                Track Order
              </Link>

              <Link
                href="/account"
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                My Account
              </Link>

              {/* Cart icon */}
              <button
                onClick={() => setCartOpen(true)}
                className="relative p-2 text-gray-700 hover:text-gray-900 transition-colors cursor-pointer"
                aria-label="Open cart"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                {totalItems > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-amber-500 text-white text-xs font-black rounded-full flex items-center justify-center">
                    {totalItems > 99 ? "99+" : totalItems}
                  </span>
                )}
              </button>

              {/* Mobile hamburger */}
              <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden flex flex-col gap-1.5 p-2 cursor-pointer" aria-label="Toggle menu">
                <span className={`block w-6 h-0.5 bg-gray-800 transition-all duration-300 ${menuOpen ? "rotate-45 translate-y-2" : ""}`} />
                <span className={`block w-6 h-0.5 bg-gray-800 transition-all duration-300 ${menuOpen ? "opacity-0" : ""}`} />
                <span className={`block w-6 h-0.5 bg-gray-800 transition-all duration-300 ${menuOpen ? "-rotate-45 -translate-y-2" : ""}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white px-4 pb-5 pt-3 flex flex-col gap-4">
            <Link href="/track" onClick={() => setMenuOpen(false)} className="text-lg font-bold text-gray-800">Track Order</Link>
            <Link href="/account" onClick={() => setMenuOpen(false)} className="text-lg font-bold text-gray-800">My Account</Link>
            <Link href="/#tea" onClick={() => setMenuOpen(false)} className="text-lg font-bold text-gray-800">CTC Tea</Link>
            <Link href="/#coffee" onClick={() => setMenuOpen(false)} className="text-lg font-bold text-gray-800">Coffee Beans</Link>
            <div className="flex gap-3 pt-1">
              <Link href="/#tea" onClick={() => setMenuOpen(false)} className="flex-1 bg-amber-500 text-center text-white font-bold py-3 rounded-lg">Shop Tea</Link>
              <Link href="/#coffee" onClick={() => setMenuOpen(false)} className="flex-1 bg-stone-900 text-center text-white font-bold py-3 rounded-lg">Shop Coffee</Link>
            </div>
          </div>
        )}
      </header>

      {cartOpen && <CartDrawer onClose={() => setCartOpen(false)} />}
    </>
  );
}
