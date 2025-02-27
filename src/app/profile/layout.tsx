import ProtectedRoute from "@/components/ProtectedRoute";



export default function ProfilePage ({
    children,
  }: {
    children: React.ReactNode;
  }) {
    return <ProtectedRoute>{children}</ProtectedRoute>;
  } 
