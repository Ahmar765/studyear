
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin-app";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "USER_ID_REQUIRED" }, { status: 400 });
    }

    const walletRef = adminDb.collection("acuWallets").doc(userId);
    const transactionsRef = adminDb.collection("acuTransactions").where("userId", "==", userId).orderBy("createdAt", "desc").limit(50);
    
    const [walletDoc, transactionsSnapshot] = await Promise.all([
        walletRef.get(),
        transactionsRef.get()
    ]);
    
    let walletData = null;
    if (walletDoc.exists) {
        walletData = walletDoc.data();
    } else {
         // Return a default wallet structure if one doesn't exist yet
        walletData = {
            userId,
            balance: 0,
            transactions: []
        };
    }

    const transactions = transactionsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
            ...data,
            createdAt: data.createdAt.toDate().toISOString()
        }
    });

    return NextResponse.json({
      success: true,
      wallet: {
          ...walletData,
          transactions
      }
    });
  } catch (error: any) {
      console.error("Error fetching wallet data:", error);
      return NextResponse.json({ error: "An internal server error occurred." }, { status: 500 });
  }
}
