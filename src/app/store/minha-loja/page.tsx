import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import StoreSettingsForm from "@/components/customer/StoreSettingsForm";
import LoyaltyConfigForm from "@/components/LoyaltyConfigForm";

export default async function StoreSettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/");
  const user = await prisma.user.findUnique({ where: { email: session.user?.email || "" } });
  if (!user) redirect("/");

  async function saveLoyalty(config: any) {
    "use server";
    await prisma.user.update({
      where: { email: session!.user!.email || "" },
      data: { storeLoyalty: config }
    });
  }

  return (
    <div className="container">
      <h1 className="font-bold" style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>⚙️ Minha Loja</h1>
      <p className="text-muted mb-4">Configure as informações da sua loja que aparecem para os clientes.</p>
      <StoreSettingsForm user={{
        id: user.id, slug: user.slug || "", storeName: user.storeName || "",
        storePhone: user.storePhone || "", storeAddress: user.storeAddress || "",
        storeBanner: user.storeBanner || "", storeLogo: user.storeLogo || "",
        storeHours: user.storeHours || null,
        storePause: (user as any).storePause || null,
        storeCoupons: (user as any).storeCoupons || [],
        paymentFees: user.paymentFees || null,
        deliveryZoneType: user.deliveryZoneType || null,
        deliveryZones: user.deliveryZones || null,
        storeLatLng: user.storeLatLng || null,
      }} />

      {/* Programa de Fidelidade */}
      <div style={{ marginTop: "2rem" }}>
        <LoyaltyConfigForm
          initialConfig={(user.storeLoyalty as any) || {}}
          onSave={saveLoyalty}
        />
      </div>
    </div>
  );
}
