import mongoose, { Document, Schema } from "mongoose";

export interface ITransaction extends Document {
 userId: mongoose.Types.ObjectId;
  purpose: "BUCKS_TOPUP" | "OTHER";
  amountCents: number; 
  currency: string; 
  promoCodeId?: mongoose.Types.ObjectId | null;
  discountCents?: number; 
  finalAmountCents: number; 
  stripeSessionId: string;
  status: "PENDING" | "SUCCESS" | "FAILED" | "CANCELED" | "EXPIRED"; 
  createdAt: Date;
  updatedAt: Date;
}


const transactionSchema = new Schema<ITransaction>(
 {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "user",
      required: true,
      index: true,
    },
    purpose: {
      type: String,
      enum: ["BUCKS_TOPUP", "OTHER"],
      default: "BUCKS_TOPUP",
    },
    amountCents: {
      type: Number,
      required: true, 
    },
    currency: {
      type: String,
      default: "usd",
    },
    promoCodeId: {
      type: Schema.Types.ObjectId,
      ref: "promoCodes",
      default: null,
    },
    discountCents: {
      type: Number,
      default: 0,
    },
    finalAmountCents: {
      type: Number,
      required: true,
    },
    stripeSessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["PENDING", "SUCCESS", "FAILED", "CANCELED", "EXPIRED"],
      default: "PENDING",
      index: true,
    },
  },
  { timestamps: true }
);

transactionSchema.index({ "stripe.paymentIntentId": 1 }, { unique: true });
transactionSchema.index({ userId: 1, status: 1 });

export const TransactionModel = mongoose.model<ITransaction>(
  "transactions",
  transactionSchema
);