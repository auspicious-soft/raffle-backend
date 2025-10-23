import mongoose, { Document, Schema } from "mongoose";


export interface IRaffleWinner extends Document {
  raffleId: mongoose.Types.ObjectId; 
  userId: mongoose.Types.ObjectId;
  userRaffleId?: mongoose.Types.ObjectId;
  raffleType:string;
  status: string;
  awardedAt: Date;
  trackingLink?: string;
  createdAt: Date;
  updatedAt: Date
  
}
const raffleWinnerSchema = new Schema<IRaffleWinner>(
  {
    raffleId: {
      type: Schema.Types.ObjectId,
      ref: "raffles",
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "user",
      required: true,
      index: true,
    },
    userRaffleId: {
      type: Schema.Types.ObjectId,
      ref: "userRaffles",
    },
    raffleType: {
      type: String,
      enum: ["DIGITAL", "PHYSICAL"],
      required: true,
    },
    status: {
      type: String,
      enum: [
        "GRANTED",
        "CLAIMED",
        "PENDING",
        "PROCESSING",
        "SHIPPED",
        "DELIVERED",
        "CANCELED",
        "FAILED",
      ],
      default: "GRANTED",
      index: true,
    },
    awardedAt: { type: Date, default: Date.now },
    trackingLink: String,
  },
  { timestamps: true }
);

raffleWinnerSchema.index({ raffleId: 1, status: 1 });
raffleWinnerSchema.index({ userId: 1 });
raffleWinnerSchema.index({ createdAt: -1 });

export const RaffleWinnerModel = mongoose.model<IRaffleWinner>(
  "raffleWinners",
  raffleWinnerSchema
);