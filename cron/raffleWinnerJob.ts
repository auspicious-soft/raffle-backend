import cron from "node-cron";
import { RaffleModel } from "src/models/admin/raffle-schema";
import { UserRaffleModel } from "src/models/user/user-raffle-schema";
import { RaffleWinnerModel } from "src/models/admin/raffle-winner-schema";
import { sendRaffleAnnouncementEmail } from "src/utils/helper";

cron.schedule("* * * * *", async () => {
  console.log("[CRON] 🕒 Checking for raffles that ended...");

  try {
    const now = new Date();

    const endedRaffles = await RaffleModel.find({
      endDate: { $lte: now },
      status: "COMPLETED",
      hasWinnerAnnounced: { $ne: true },
      isDeleted: false,
    }).lean();

    if (endedRaffles.length === 0) {
      console.log("[CRON] ✅ No raffles to process this cycle.");
      return;
    }

    for (const raffle of endedRaffles) {
      console.log(
        `[CRON] 🎯 Processing raffle: ${raffle.title} (${raffle._id})`
      );

      const participants = await UserRaffleModel.find({
        raffleId: raffle._id,
        status: "ACTIVE",
      })
        .populate<{ userId: { email: string } }>("userId", "email")
        .lean();
      if (participants.length === 0) {
        console.log(
          `[CRON] ⚠️ No participants found for raffle: ${raffle.title}`
        );
        await RaffleModel.findByIdAndUpdate(raffle._id, { status: "EXPIRED" });
        continue;
      }

      const randomIndex = Math.floor(Math.random() * participants.length);
      const winnerEntry = participants[randomIndex];
      const winnerUserId =
        typeof winnerEntry.userId === "object"
          ? (winnerEntry.userId as any)._id
          : winnerEntry.userId;

      const rewardType =
        raffle.rewards?.[0]?.rewardType &&
        ["DIGITAL", "PHYSICAL"].includes(raffle.rewards[0].rewardType)
          ? raffle.rewards[0].rewardType
          : "DIGITAL";

      const winnerStatus = rewardType === "DIGITAL" ? "GRANTED" : "PENDING";

      const existingWinner = await RaffleWinnerModel.findOne({
        raffleId: raffle._id,
      });
      if (!existingWinner) {
        await RaffleWinnerModel.create({
          raffleId: raffle._id,
          userId: winnerUserId,
          userRaffleId: winnerEntry._id,
          raffleType: rewardType,
          status: winnerStatus,
          awardedAt: new Date(),
        });
      } else {
        console.log(
          `[CRON] Winner record already exists for raffle ${raffle._id}.`
        );
      }

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

      const raffleDoc = await RaffleModel.findById(raffle._id);
      if (raffleDoc) {
        if (raffleDoc.rewards.length > 0) {
          raffleDoc.rewards[0].rewardStatus = winnerStatus;
        }

        raffleDoc.winnerId = winnerUserId;
        raffleDoc.hasWinnerAnnounced = true;

        await raffleDoc.save();
      }

      console.log(
        `[CRON] 🏆 Winner selected for raffle ${raffle.title}: ${winnerUserId.toString()}`
      );

      for (const participant of participants) {
        if (!participant.userId?.email) continue;

        await sendRaffleAnnouncementEmail({
          to: participant.userId.email,
          raffleTitle: raffle.title,
          endDate: raffle.endDate as unknown as Date,
          companyName: "Your Company",
        });
      }

      console.log(`[CRON] Announcement emails sent for raffle ${raffle._id}`);
    }

    console.log("[CRON] ✅ Raffle winner selection cycle completed.");
  } catch (error) {
    console.error("[CRON] ❌ Error while processing raffles:", error);
  }
});
