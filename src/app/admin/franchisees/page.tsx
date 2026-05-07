import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import FranchiseeForm, { DeleteFranchiseeButton, EditFranchiseeCity, ImpersonateButton } from "@/components/FranchiseeForm";

export default async function AdminFranchiseesPage() {
  const session = await getServerSession(authOptions);

  const franchisees = await prisma.user.findMany({
    where: { role: "FRANCHISEE" },
    orderBy: { createdAt: 'desc' }
  });

  const routes = await prisma.routeSchedule.findMany({
    select: { cityName: true },
    distinct: ['cityName']
  });
  
  const availableCities = routes.map(r => r.cityName);

  return (
    <div>
      <h1 className="font-bold mb-6" style={{ fontSize: "2rem" }}>Gestão de Franqueados</h1>
      
      {availableCities.length === 0 ? (
        <div className="card mb-8">
          <p className="text-warning font-bold">Atenção: Nenhuma Rota/Cidade cadastrada.</p>
          <p className="text-muted text-sm">Vá até o menu "Logística / Rotas" e cadastre as rotas antes de criar franqueados.</p>
        </div>
      ) : (
        <FranchiseeForm availableCities={availableCities} />
      )}

      <h2 className="font-bold text-xl mb-4">Franqueados Cadastrados</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {franchisees.length === 0 ? (
          <p className="text-muted">Nenhum franqueado cadastrado ainda.</p>
        ) : (
          franchisees.map(user => (
            <div key={user.id} className="card flex justify-between items-center" style={{ padding: "1.5rem" }}>
              <div>
                <h3 className="font-bold text-lg">{user.name}</h3>
                <p className="text-muted" style={{ fontSize: "0.9rem" }}>E-mail/Login: <strong>{user.email}</strong></p>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.5rem" }}>
                  <span className="text-muted" style={{ fontSize: "0.85rem", fontWeight: "bold" }}>Rota:</span>
                  <EditFranchiseeCity id={user.id} currentCity={user.city || ""} availableCities={availableCities} />
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <ImpersonateButton id={user.id} />
                <DeleteFranchiseeButton id={user.id} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
