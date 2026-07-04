import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";
import DemoBanner from "@/components/layout/DemoBanner";

/**
 * Authenticated app shell: full-width Navbar, Sidebar, scrollable main.
 * (The marketing landing page and auth screens have their own layouts.)
 */
const AppLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex flex-col h-screen">
      {/* Navbar — full width */}
      <Navbar />
      <DemoBanner />

      {/* Sidebar + Main Content */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-4 bg-dark-lighter pb-24 md:pb-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
