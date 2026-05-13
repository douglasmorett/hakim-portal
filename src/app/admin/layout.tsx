import AdminSidebar from "@/components/AdminSidebar";
import MultiStoreSelector from "@/components/MultiStoreSelector";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;

  if (!session || (role !== "ADMIN" && role !== "STAFF" && role !== "FRANCHISEE")) {
    redirect("/");
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "var(--bg-color)" }}>
      <AdminSidebar />
      <main className="admin-main" style={{ marginLeft: "250px", flex: 1, display: "flex", flexDirection: "column" }}>
        {/* Top bar com Multilojas */}
        <div style={{
          padding: "12px 2rem",
          borderBottom: "1px solid var(--border-color)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "var(--surface)",
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}>
          <MultiStoreSelector />
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              padding: "6px 14px",
              borderRadius: 20,
              background: "linear-gradient(135deg, rgba(34,197,94,0.1), rgba(34,197,94,0.05))",
              border: "1px solid rgba(34,197,94,0.2)",
              fontSize: ".75rem",
              fontWeight: 600,
              color: "#22C55E",
            }}>
              ● Online
            </div>
            <div style={{
              width: 36, height: 36,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #EF4444, #DC2626)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", fontWeight: 800, fontSize: ".85rem",
            }}>
              {session?.user?.name?.charAt(0)?.toUpperCase() || "U"}
            </div>
          </div>
        </div>

        {/* Page content */}
        <div style={{ padding: "2rem", flex: 1 }}>
          {children}
        </div>
      </main>
      <style>{`
        @media (max-width: 768px) {
          .mobile-topbar { display: flex !important; }
          #admin-sidebar { 
            transform: translateX(-100%); 
            top: 0; 
            padding-top: 60px;
          }
          .admin-main { margin-left: 0 !important; padding: 5rem 1rem 2rem 1rem !important; }
          .sidebar-link { padding: 0.85rem 1rem !important; font-size: 1.1rem !important; }
        }
      `}</style>
    </div>
  );
}
