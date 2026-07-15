import Sidebar from "@/components/Sidebar";
import Clock from "@/components/Clock";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <nav className="print:hidden fixed top-0 left-0 right-0 z-30 h-12 bg-white border-b border-gray-200 px-6 flex items-center justify-between">
        <span className="text-sm font-bold text-gray-800">Gray Cup Fast</span>
        <Clock />
        <div className="flex items-center gap-4">
          <a href="/" target="_blank" className="text-xs font-semibold bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded-lg transition-colors cursor-pointer">View Store</a>
          <form action="/api/auth/logout" method="POST">
            <button type="submit" className="text-xs font-semibold bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg transition-colors cursor-pointer">Sign out</button>
          </form>
        </div>
      </nav>
      <div className="flex pt-12 h-screen">
        <Sidebar />
        <main className="flex-1 overflow-hidden p-6 ml-56 print:ml-0 print:p-0 h-full">{children}</main>
      </div>
    </>
  );
}
