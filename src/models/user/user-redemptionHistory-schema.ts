import mongoose, { Document, Schema } from "mongoose";

export interface IUserRedemption extends Document {
  userId: mongoose.Types.ObjectId;
  ladderId: mongoose.Types.ObjectId;
  categoryId: mongoose.Types.ObjectId;
  giftCardId: mongoose.Types.ObjectId;
  redemptionCode: string;
  pointsUsed: number;
  status: "GRANTED";
  redeemedAt: Date;
  expiryDate: Date;
}

const userRedemptionSchema = new Schema<IUserRedemption>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    ladderId: {
      type: Schema.Types.ObjectId,
      ref: "redemptionLadder",
      required: true,
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: "giftCategories",
      required: true,
    },
    giftCardId: {
      type: Schema.Types.ObjectId,
      ref: "giftcards",
      required: true,
    },
    redemptionCode: {
      type: String,
      required: true,
    },
    pointsUsed: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      default: "GRANTED",
    },
    redeemedAt: {
      type: Date,
      default: Date.now,
    },
    expiryDate: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

export const UserRedemptionModel = mongoose.model<IUserRedemption>(
  "userRedemptions",
  userRedemptionSchema
);
