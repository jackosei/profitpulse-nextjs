import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import Layout from "@/components/Layout";

const RootLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <Layout>{children}</Layout>
        </AuthProvider>
      </body>
    </html>
  );
};

export default RootLayout;
