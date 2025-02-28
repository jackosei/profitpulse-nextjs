import "./globals.css";
import Providers from "@/context/Providers";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import { Toaster } from 'sonner';

const RootLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <html lang="en">
      <body className="bg-dark-darker">
        <Providers>
          <div className="flex h-screen">
            {/* Sidebar Navigation */}
            <Sidebar />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <Navbar />
              <main className="flex-1 overflow-y-auto p-6 bg-dark">
                {children}
              </main>
            </div>
          </div>
        </Providers>
        <Toaster 
          position="bottom-center" 
          theme="dark"
          closeButton
          richColors
        />
      </body>
    </html>
  );
};

export default RootLayout;
