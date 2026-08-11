import { getPublishedDeals, getLicenseState } from "@/lib/data";
import { getCurrentTenant } from "@/lib/tenant";
import { DealStream } from "@/components/deal-stream";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function HomePage() {
  const tenant = await getCurrentTenant();
  const [deals, state] = await Promise.all([
    getPublishedDeals(tenant.id),
    getLicenseState(tenant.id),
  ]);
  return (
    <DealStream
      initialDeals={deals}
      exitIntent={state.features.has("exit-intent")}
      features={[...state.features]}
    />
  );
}
