
import { NextResponse } from "next/server";
import { ACUService } from "@/server/services/acu-service";
import { ACU_PACKAGES } from "@/data/acu-packages";
import { HttpsError } from "@/server/lib/errors";

export async function POST(req: Request) {
  try {
    const { userId, packageCode } = await req.json();

    const pack = ACU_PACKAGES[packageCode as keyof typeof ACU_PACKAGES];

    if (!pack) {
      return NextResponse.json(
        { error: "INVALID_ACU_PACKAGE" },
        { status: 400 }
      );
    }
    if (!userId) {
        return NextResponse.json({ error: "USER_ID_REQUIRED" }, { status: 400 });
    }

    await ACUService.creditACUs({
      userId,
      amount: pack.baseACUs,
      type: "PURCHASE",
      description: `${pack.label} ACU purchase`
    });

    if (pack.bonusACUs > 0) {
      await ACUService.creditACUs({
        userId,
        amount: pack.bonusACUs,
        type: "BONUS",
        description: `${pack.label} bonus ACUs`
      });
    }

    return NextResponse.json({
      success: true,
      package: pack,
      totalCredited: pack.totalACUs
    });
  } catch (error: any) {
    console.error("Error in ACU top-up route:", error);
    if (error instanceof HttpsError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "An internal server error occurred." }, { status: 500 });
  }
}
