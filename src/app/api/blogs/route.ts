import { NextRequest, NextResponse } from "next/server";
import { getPublishedBlogPosts } from "@/lib/data";

export const dynamic = "force-dynamic";

/**
 * GET /api/blogs
 * Public — published SEO blog posts, newest first. Optional `deal_id` filter
 * (used by the admin to link a deal to its generated article).
 */
export async function GET(request: NextRequest) {
  const dealId = request.nextUrl.searchParams.get("deal_id");
  const posts = await getPublishedBlogPosts();

  if (dealId) {
    return NextResponse.json(posts.filter((p) => p.deal_id === dealId));
  }
  return NextResponse.json(posts);
}

/**
 * POST /api/blogs (admin)
 * Regenerate + persist the blog post for an existing deal — used to backfill
 * articles or refresh content after edits without touching the deal.
 */
export async function POST(request: NextRequest) {
  const { isAdminAuthed } = await import("@/lib/auth");
  if (!(await isAdminAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body?.dealId) {
    return NextResponse.json(
      { error: "dealId is required" },
      { status: 400 }
    );
  }

  const { getDealById, syncBlogForDeal } = await import("@/lib/data");
  const deal = await getDealById(body.dealId);
  if (!deal) {
    return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  }

  try {
    const post = await syncBlogForDeal(deal);
    return NextResponse.json(post, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate blog" },
      { status: 500 }
    );
  }
}
