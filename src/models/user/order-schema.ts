import mongoose, { Document, Schema } from "mongoose";

export interface IOrder extends Document {
  userId: mongoose.Types.ObjectId;
  transactionId: mongoose.Types.ObjectId;
  raffleId: mongoose.Types.ObjectId;
  slotsBooked: number;
  pointsSpent: number;
  status: "PENDING" | "CONFIRMED" | "CANCELED" | "REFUNDED";
  createdAt: Date;
  updatedAt: Date;
  raffleSnapshot: {
    title: string;
    price: number;
    totalSlots: number;
  };
}

const orderSchema = new Schema<IOrder>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    transactionId: {
      type: Schema.Types.ObjectId,
      ref: "transactions",
      required: true,
    },
    raffleId: {
      type: Schema.Types.ObjectId,
      ref: "raffles",
      required: true,
    },
    slotsBooked: {
      type: Number,
      default: 1,
    },
    pointsSpent: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["PENDING", "CONFIRMED", "CANCELED", "REFUNDED"],
      default: "PENDING",
    },
    raffleSnapshot: {
      title: {
        type: String,
        required: true,
      },
      price: {
        type: Number,
        required: true,
      },
      totalSlots: {
        type: Number,
        required: true,
      },
    },
  },
  { timestamps: true }
);

orderSchema.index({ userId: 1, raffleId: 1 });
orderSchema.index({ transactionId: 1 });
orderSchema.index({ userId: 1, raffleId: 1 }, { unique: true });
orderSchema.index({ raffleId: 1 });

export const OrderModel = mongoose.model<IOrder>("orders", orderSchema);
