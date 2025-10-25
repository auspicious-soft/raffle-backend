import mongoose, { Schema, Document } from "mongoose";

export interface IRewardRedemption extends Document {
  userId: mongoose.Types.ObjectId;
  raffleId: mongoose.Types.ObjectId;
  type: "REWARD" | "POINTS";
  redeemedAt: Date;
  pointsAwarded?: number;
  promoCodeId?: mongoose.Types.ObjectId | null;
  promoCode?: string;
}
const RewardRedemptionSchema = new Schema<IRewardRedemption>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    raffleId: { type: Schema.Types.ObjectId, ref: "Raffle", required: true },
    type: {
      type: String,
      enum: ["REWARD", "POINTS"],
      required: true,
    },
    redeemedAt: { type: Date, default: Date.now },
    pointsAwarded: { type: Number, default: 0 },
    promoCodeId: { type: Schema.Types.ObjectId, ref: "PromoCode", default: null },
    promoCode: { type: String, default: "" },
  },
  { timestamps: true }
);

RewardRedemptionSchema.index({ userId: 1, raffleId: 1 }, { unique: true });

export const RewardRedemptionModel = mongoose.model<IRewardRedemption>(
  "RewardRedemption",
  RewardRedemptionSchema
);
