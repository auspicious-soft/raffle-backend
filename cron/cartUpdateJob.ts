import cron from "node-cron";
import mongoose from "mongoose";
import { CartQueueModel, ICartQueue } from "src/models/user/cart_queue-schema";
import { RaffleModel } from "src/models/admin/raffle-schema";
import { CartModel } from "src/models/user/cart-schema";
import { io as globalIo } from "../src/app";

// Run every minute to check expired carts
cron.schedule("* * * * *", async () => {
  try {
    console.log("[CRON] Cart expiration job running...");
    const now = new Date();

    const expiredQueues = (await CartQueueModel.find({
      expiresAt: { $lte: now },
    }).lean()) as ICartQueue[];

    for (const queue of expiredQueues) {
      const session = await mongoose.startSession();
      session.startTransaction();
      try {
        await RaffleModel.updateMany(
          { _id: { $in: queue.items }, bookedSlots: { $gt: 0 } },
          { $inc: { bookedSlots: -1 } },
          { session }
        );
       
        await CartModel.deleteOne({ userId: queue.userId }, { session });

        await CartQueueModel.deleteOne({ _id: queue._id }, { session });

        await session.commitTransaction();
        session.endSession();
        console.log(`[CRON] Cart expired for user: ${queue.userId}`);

         const updatedRaffles = await RaffleModel.find({
          _id: { $in: queue.items },
        }).lean();
        if (globalIo) {
          updatedRaffles.forEach((raffle) => {
            globalIo.emit("raffle:update", {
              raffleId: raffle._id,
              bookedSlots: raffle.bookedSlots,
              totalSlots: raffle.totalSlots,
            });
          });
        }
        
      } catch (err) {
        await session.abortTransaction();
        session.endSession();
        console.error("[CRON] Error handling cart expiration:", err);
      }
    }
  } catch (err) {
    console.error("[CRON] Error fetching expired cart queues:", err);
  }
});
