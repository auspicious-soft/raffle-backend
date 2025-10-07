import mongoose, { Document, Schema } from "mongoose";

export interface IUserRaffle extends Document {
  userId: mongoose.Types.ObjectId;
  raffleId: mongoose.Types.ObjectId;
  orderId: mongoose.Types.ObjectId;
  slotNumber: number;
  status: "ACTIVE" | "CANCELED" | "REFUNDED" | "EXPIRED";
  pointsSpent: number;
  createdAt: Date;
  updatedAt: Date;
}

const userRaffleSchema = new Schema<IUserRaffle>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    raffleId: {
      type: Schema.Types.ObjectId,
      ref: "raffles",
      required: true,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "orders",
      required: true,
    },
    slotNumber: {
      type: Number,
    },
    status: {
      type: String,
      enum: ["ACTIVE", "CANCELED", "REFUNDED", "EXPIRED"],
      default: "ACTIVE",
    },
    pointsSpent: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true }
);

userRaffleSchema.index({ userId: 1, raffleId: 1 }, { unique: true });
userRaffleSchema.index({ orderId: 1 });
userRaffleSchema.index({ raffleId: 1 });

export const UserRaffleModel = mongoose.model<IUserRaffle>(
  "userRaffles",
  userRaffleSchema
);
