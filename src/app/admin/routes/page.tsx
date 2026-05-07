import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import RouteForm, { DeleteRouteButton } from "@/components/RouteForm";

const DIAS_SEMANA = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];

export default async function AdminRoutesPage() {
  const session = await getServerSession(authOptions);

  // Buscar todas as rotas e agrupar por cidade
  const schedules = await prisma.routeSchedule.findMany({
    orderBy: { cityName: 'asc' }
  });

  const cityMap = new Map<string, number[]>();
  schedules.forEach(schedule => {
    if (!cityMap.has(schedule.cityName)) {
      cityMap.set(schedule.cityName, []);
    }
    cityMap.get(schedule.cityName)!.push(schedule.deliveryDay);
  });

  const cities = Array.from(cityMap.entries()).map(([cityName, days]) => ({
    cityName,
    days: days.sort()
  }));

  return (
    <div>
      <h1 className="font-bold mb-6" style={{ fontSize: "2rem" }}>Logística de Entregas</h1>
      
      <RouteForm />

      <h2 className="font-bold text-xl mb-4">Cidades Atendidas</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {cities.length === 0 ? (
          <p className="text-muted">Nenhuma rota cadastrada ainda.</p>
        ) : (
          cities.map(city => (
            <div key={city.cityName} className="card flex justify-between items-center" style={{ padding: "1.5rem" }}>
              <div>
                <h3 className="font-bold text-lg mb-2">{city.cityName}</h3>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: "0.9rem" }}>
                  {city.days.map(day => (
                    <li key={day} style={{ marginBottom: "0.25rem" }}>
                      <span className="font-bold" style={{ color: "var(--primary)" }}>Entrega:</span> {DIAS_SEMANA[day]} <br/>
                      <span className="text-muted" style={{ fontSize: "0.8rem" }}>
                        (Limite: {DIAS_SEMANA[(day - 2 + 7) % 7]} às 16:00)
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <DeleteRouteButton cityName={city.cityName} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
