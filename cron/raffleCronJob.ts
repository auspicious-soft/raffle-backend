import cron from "node-cron";
import mongoose from "mongoose";
import { RaffleModel } from "src/models/admin/raffle-schema";

cron.schedule("*/5 * * * *", async () => {
  try {
    const now = new Date();

    const updated = await RaffleModel.updateMany(
      {
        status: "INACTIVE",
        startDate: { $lte: now },
        endDate: { $gt: now },
        isDeleted: false,
      },
      {
        $set: { status: "ACTIVE" },
      }
    );

    if (updated.modifiedCount > 0) {
      console.log(`[${new Date().toISOString()}] ✅ Activated ${updated.modifiedCount} raffles.`);
    }
  } catch (err) {
    console.error("Error activating raffles:", err);
  }
});

cron.schedule("*/5 * * * *", async () => { 
  try {
    const now = new Date();

    const updated = await RaffleModel.updateMany(
      {
        status: { $in: ["ACTIVE", "INACTIVE"] },
        endDate: { $lte: now },
        isDeleted: false,
      },
      {
        $set: { status: "COMPLETED", hasWinnerAnnounced: false },
      }
    );

    if (updated.modifiedCount > 0) {
      console.log(`[${new Date().toISOString()}] 🏁 Completed ${updated.modifiedCount} raffles.`);
    }
  } catch (err) {
    console.error("Error completing raffles:", err);
  }
});
