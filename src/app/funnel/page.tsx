import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/**
 * Public sales funnel (standalone static pages served from /funnel/*).
 * Redirect the bare /funnel path to the funnel's landing page.
 */
export default function FunnelIndex() {
  redirect("/funnel/index.html");
}
