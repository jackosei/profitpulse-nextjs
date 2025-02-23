import "./globals.css";
import Providers from "@/context/Providers";
// import Layout from "@/components/Layout";
// import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";

const RootLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <html lang="en">
      <body>
        <Providers>
          <div className="flex h-screen bg-gray-100">
            {/* Sidebar Navigation */}
            {/* <Sidebar /> */}

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col">
              <Navbar />
              {children}
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
};

export default RootLayout;
