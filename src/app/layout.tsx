import Layout from "@/components/Layout";
import "./globals.css"; // Global styles

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-gray-100">
        {/* Wrap the app in Layout component */}
        <Layout>{children}</Layout>
      </body>
    </html>
  );
}
