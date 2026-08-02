import { redirect } from "next/navigation";
import { isAdminAuthed } from "@/lib/auth";
import { AdminLoginForm } from "@/components/admin/admin-login-form";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  if (await isAdminAuthed()) redirect("/admin");
  return <AdminLoginForm />;
}
