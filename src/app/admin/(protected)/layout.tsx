import { redirect } from "next/navigation";
import { isAdminAuthed } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Route-group guard for every /admin page EXCEPT /admin/login.
 */
export default async function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await isAdminAuthed())) redirect("/admin/login");
  return <>{children}</>;
}
