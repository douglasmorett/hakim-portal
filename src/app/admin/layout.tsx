import AdminSidebar from "@/components/AdminSidebar";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;

  if (!session || (role !== "ADMIN" && role !== "STAFF")) {
    redirect("/");
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "var(--bg-color)" }}>
      <AdminSidebar />
      <main className="admin-main" style={{ marginLeft: "250px", flex: 1, padding: "2rem" }}>
        {children}
      </main>
      <style>{`
        @media (max-width: 768px) {
          .mobile-topbar { display: flex !important; }
          #admin-sidebar { 
            transform: translateX(-100%); 
            top: 0; 
            padding-top: 60px; /* Mesma altura da topbar */
          }
          .admin-main { margin-left: 0 !important; padding: 5rem 1rem 2rem 1rem !important; }
          .sidebar-link { padding: 0.85rem 1rem !important; font-size: 1.1rem !important; }
        }
      `}</style>
    </div>
  );
}

