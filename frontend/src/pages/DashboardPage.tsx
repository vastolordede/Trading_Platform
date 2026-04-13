import { useAuth } from "../hooks/useAuth";

export default function DashboardPage() {
  const { user, logout } = useAuth();

  return (
    <div style={{ padding: 24 }}>
      <h1>Dashboard</h1>
      <p>Welcome, {user?.fullName}</p>
      <p>Email: {user?.email}</p>
      <p>Demo Balance: {user?.demoBalance} USDT</p>

      <button onClick={logout}>Logout</button>
    </div>
  );
}