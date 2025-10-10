import mongoose, { Document, Schema } from "mongoose";

export interface IOrder extends Document {
  userId: mongoose.Types.ObjectId;
  raffleId: mongoose.Types.ObjectId;
  slotsBooked: number;
  bucksSpent: number;
  status: "PENDING" | "CONFIRMED" | "CANCELED" | "REFUNDED";
  raffleSnapshot: {
    title: string;
    price: number;
    totalSlots: number;
    endDate?: Date;
  };
  paymentSource: "WALLET"; // always WALLET in new flow
  createdAt: Date;
  updatedAt: Date;
}

const orderSchema = new Schema<IOrder>(
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
    slotsBooked: {
      type: Number,
      default: 1,
      min: 1,
    },
    bucksSpent: {
      type: Number,
      required: true, // how many raffle bucks used
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
        required: true, // price per slot (Raffle Bucks)
      },
      totalSlots: {
        type: Number,
        required: true,
      },
      endDate: {
        type: Date,
      },
    },
    paymentSource: {
      type: String,
      enum: ["WALLET"],
      default: "WALLET",
    },
  },
  { timestamps: true }
);

// Indexes for efficient lookups
orderSchema.index({ userId: 1, raffleId: 1 });
orderSchema.index({ raffleId: 1 });
orderSchema.index({ userId: 1, status: 1 });

export const OrderModel = mongoose.model<IOrder>("orders", orderSchema);
