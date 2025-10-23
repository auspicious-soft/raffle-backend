import cron from "node-cron";
import mongoose from "mongoose";
import { RaffleModel } from "src/models/admin/raffle-schema";
import { UserRaffleModel } from "src/models/user/user-raffle-schema";
import { RaffleWinnerModel } from "src/models/admin/raffle-winner-schema";

cron.schedule("* * * * *", async () => {
  console.log("[CRON] 🕒 Checking for raffles that ended...");

  try {
    const now = new Date();

    // 1️⃣ Find raffles whose endDate has passed but are not yet completed
    const endedRaffles = await RaffleModel.find({
      endDate: { $lte: now },
      status: { $nin: ["COMPLETED", "EXPIRED"] },
      isDeleted: false,
    }).lean();

    if (endedRaffles.length === 0) {
      console.log("[CRON] ✅ No raffles to process this cycle.");
      return;
    }

    for (const raffle of endedRaffles) {
      console.log(`[CRON] 🎯 Processing raffle: ${raffle.title} (${raffle._id})`);

      // 2️⃣ Fetch all participants of this raffle
      const participants = await UserRaffleModel.find({
        raffleId: raffle._id,
        status: "ACTIVE",
      }).lean();

      if (participants.length === 0) {
        console.log(`[CRON] ⚠️ No participants found for raffle: ${raffle.title}`);
        await RaffleModel.findByIdAndUpdate(raffle._id, { status: "EXPIRED" });
        continue;
      }

      // 3️⃣ Pick a random participant as the winner
      const randomIndex = Math.floor(Math.random() * participants.length);
      const winnerEntry = participants[randomIndex];
      const winnerUserId = winnerEntry.userId;

      // 4️⃣ Detect reward type from the raffle details
      const rewardType =
        raffle.rewards?.[0]?.rewardType && ["DIGITAL", "PHYSICAL"].includes(raffle.rewards[0].rewardType)
          ? raffle.rewards[0].rewardType
          : "DIGITAL";

      // 5️⃣ Create or update winner record (avoid duplicates)
      const existingWinner = await RaffleWinnerModel.findOne({ raffleId: raffle._id });
      if (!existingWinner) {
        await RaffleWinnerModel.create({
          raffleId: raffle._id,
          userId: winnerUserId,
          userRaffleId: winnerEntry._id,
          raffleType: rewardType,
          status: "GRANTED",
          awardedAt: new Date(),
        });
      } else {
        console.log(`[CRON] Winner record already exists for raffle ${raffle._id}.`);
      }

      // 6️⃣ Update UserRaffle results
      await Promise.all([
        UserRaffleModel.updateOne(
          { _id: winnerEntry._id },
          { $set: { result: "WIN" } }
        ),
        UserRaffleModel.updateMany(
          { raffleId: raffle._id, _id: { $ne: winnerEntry._id } },
          { $set: { result: "LOSS" } }
        ),
      ]);

      // 7️⃣ Update Raffle status and winnerId
      await RaffleModel.findByIdAndUpdate(raffle._id, {
        status: "COMPLETED",
        winnerId: winnerUserId,
      });

      console.log(`[CRON] 🏆 Winner selected for raffle ${raffle.title}: ${winnerUserId.toString()}`);
    }

    console.log("[CRON] ✅ Raffle winner selection cycle completed.");
  } catch (error) {
    console.error("[CRON] ❌ Error while processing raffles:", error);
  }
});
