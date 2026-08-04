import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { CartProvider } from "@/lib/cart";
import { Analytics } from "@vercel/analytics/next";

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Gray Cup Fast",
  description: "Gray Cup sells tea and coffee. Shipped fast across India.",
  icons: { icon: "/favicon.png" },
  openGraph: {
    siteName: "Gray Cup Fast",
    images: [{ url: "/og.png" }],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${outfit.variable} h-full antialiased`}>
      <body
        style={{ fontFamily: "var(--font-outfit), sans-serif" }}
        className="bg-white text-gray-900 min-h-screen flex flex-col"
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "@id": "https://fast.graycup.in/#website",
              name: "Gray Cup Fast",
              alternateName: "Gray Cup",
              url: "https://fast.graycup.in",
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              "@id": "https://graycup.in/#organization",
              name: "Gray Cup",
              url: "https://graycup.in",
              logo: "https://graycup.in/logo.png",
              sameAs: [
                "https://www.instagram.com/thegraycup",
                "https://www.linkedin.com/company/gray-cup",
              ],
            }),
          }}
        />
        <CartProvider>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </CartProvider>
        <Analytics />
      </body>
    </html>
  );
}
