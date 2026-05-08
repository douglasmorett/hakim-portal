import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Icebox Congelados - Catálogo",
  description: "Congelados, resfriados e insumos para seu negócio. Entrega em toda região.",
  icons: { icon: "/icebox-icon.png" }
};

export default function IceboxLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      {children}
    </div>
  );
}
