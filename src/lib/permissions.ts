// Todos os módulos disponíveis no sistema
export const ALL_PERMISSIONS = [
  { key: "dashboard",    label: "Dashboard" },
  { key: "products",     label: "Produtos (preço e cadastro)" },
  { key: "franchisees",  label: "Franqueados" },
  { key: "orders",       label: "Pedidos" },
  { key: "routes",       label: "Logística / Rotas" },
  { key: "finance",      label: "Financeiro (completo)" },
  { key: "payables",     label: "Contas a Pagar (lançar boletos)" },
  { key: "invoices",     label: "Notas de Compras" },
];

export function hasPermission(userPermissions: string, key: string, role: string): boolean {
  if (role === "ADMIN") return true; // Dono vê tudo
  if (!userPermissions) return false;
  return userPermissions.split(",").includes(key);
}
