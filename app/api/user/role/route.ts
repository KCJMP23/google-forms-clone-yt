import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/rbac";

/**
 * GET /api/user/role
 * Returns current user's role and permissions
 */
export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get user role and permissions from RBAC system
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      userId: user.userId,
      role: user.role,
      permissions: user.permissions,
    });
  } catch (error) {
    console.error("Error fetching user role:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
