import cron from "node-cron";
import { GiftCardModel } from "src/models/admin/gift-card-schema";

// Run every night at midnight (server time)
cron.schedule("0 0 * * *", async () => {
  try {
    console.log("[CRON] Test job running...");
    const now = new Date();
    const result = await GiftCardModel.updateMany(
      { expiryDate: { $lte: now }, status: { $ne: "EXPIRED" } },
      { $set: { status: "EXPIRED" } }
    );

    console.log(`[CRON] Expired gift cards updated: ${result.modifiedCount}`);
  } catch (err) {
    console.error("[CRON] Error updating expired gift cards:", err);
  }
});
