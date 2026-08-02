import { getAllDeals } from "@/lib/data";
import { isMockMode } from "@/lib/mock";
import { AdminDashboard } from "@/components/admin/admin-dashboard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminPage() {
  const [deals, mockMode] = await Promise.all([getAllDeals(), Promise.resolve(isMockMode())]);
  return <AdminDashboard initialDeals={deals} mockMode={mockMode} />;
}
