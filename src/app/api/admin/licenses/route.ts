import { NextResponse } from "next/server";
import { getLicenseKeys, setLicenseKeys, getLicenseState } from "@/lib/data";
import { isAdminAuthed } from "@/lib/auth";
import { getCurrentTenant } from "@/lib/tenant";
import { resolveLicense } from "@/lib/licensing";

export const dynamic = "force-dynamic";

/**
 * /api/admin/licenses — manage activated RSA-signed license keys for the
 * current tenant.
 *
 * The private key never touches this app. Buyers paste a key (minted by the
 * seller with `license-private.pem`) into the admin "Licenses" tab; keys are
 * verified offline here and stored so every deployment unlock state derives
 * from the same list.
 */
export async function GET() {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const tenant = await getCurrentTenant();
  const keys = await getLicenseKeys(tenant.id);
  const state = resolveLicense(keys);
  return NextResponse.json({ keys, state });
}

export async function POST(req: Request) {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const tenant = await getCurrentTenant();
  const { key } = await req.json().catch(() => ({ key: "" }));
  if (typeof key !== "string" || !key.trim()) {
    return NextResponse.json({ error: "Enter a license key" }, { status: 400 });
  }

  const state = resolveLicense([key]);
  if (!state.activeKeys.length) {
    return NextResponse.json(
      { error: state.invalidKeys[0] ?? "Invalid license key" },
      { status: 400 }
    );
  }

  const current = await getLicenseKeys(tenant.id);
  if (!current.includes(key)) {
    await setLicenseKeys(tenant.id, [...current, key]);
  }
  return NextResponse.json({
    keys: await getLicenseKeys(tenant.id),
    state: await getLicenseState(tenant.id),
  });
}

export async function DELETE(req: Request) {
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const tenant = await getCurrentTenant();
  const { key } = await req.json().catch(() => ({ key: "" }));
  const current = await getLicenseKeys(tenant.id);
  await setLicenseKeys(
    tenant.id,
    current.filter((k) => k !== key)
  );
  return NextResponse.json({
    keys: await getLicenseKeys(tenant.id),
    state: await getLicenseState(tenant.id),
  });
}
