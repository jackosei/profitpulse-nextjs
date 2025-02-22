import useProtectedRoute from "@/hooks/useProtectedRoute";

export default function Dashboard() {
  const { user, loading } = useProtectedRoute();

  if (loading) return <p>Loading...</p>;

  return <div className="p-6">Welcome {user?.email} to your Dashboard!</div>;
}
