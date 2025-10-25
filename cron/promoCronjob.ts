import cron from "node-cron";
import mongoose from "mongoose";
import { PromoCodeModel } from "src/models/admin/promo-code-schema";

cron.schedule("0 0 * * *", async () => {
  console.log("🔔 Running promo code status check cron job...");

  try {
    const now = new Date();

    const expiredResult = await PromoCodeModel.updateMany(
      { expiryDate: { $lt: now }, status: "AVAILABLE" },
      { $set: { status: "EXPIRED" } }
    );

    const completedResult = await PromoCodeModel.updateMany(
      { $expr: { $gte: ["$promoUsed", "$totalUses"] }, status: "AVAILABLE" },
      { $set: { status: "COMPLETED" } }
    );

    console.log(
      `✅ Promo Code Cron Job Completed: ${expiredResult.modifiedCount} expired, ${completedResult.modifiedCount} completed`
    );
  } catch (err) {
    console.error("❌ Error running promo code cron job:", err);
  }
});
