import { getAllDeals } from "@/lib/data";
import { getCurrentTenant } from "@/lib/tenant";
import { isMockMode } from "@/lib/mock";
import { AdminDashboard } from "@/components/admin/admin-dashboard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminPage() {
  const tenant = await getCurrentTenant();
  const [deals, mockMode] = await Promise.all([getAllDeals(tenant.id), Promise.resolve(isMockMode())]);
  return <AdminDashboard initialDeals={deals} mockMode={mockMode} />;
}
