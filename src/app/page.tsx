import { getPublishedDeals, getLicenseState } from "@/lib/data";
import { DealStream } from "@/components/deal-stream";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function HomePage() {
  const [deals, state] = await Promise.all([
    getPublishedDeals(),
    getLicenseState(),
  ]);
  return (
    <DealStream
      initialDeals={deals}
      exitIntent={state.features.has("exit-intent")}
      features={[...state.features]}
    />
  );
}
