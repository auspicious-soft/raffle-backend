import mongoose, { Document, Schema } from "mongoose";

export interface ITransaction extends Document {
  userId: mongoose.Types.ObjectId;
  raffleIds: mongoose.Types.ObjectId[];
  promoCode?: mongoose.Types.ObjectId | null;
  promoDetails?: {
    code: string;
    discountValue: number;
  };
  amount: {
    subtotal: number;
    discount: number;
    total: number;
    currency: string;
  };
  stripe: {
    paymentIntentId: string;
    checkoutSessionId?: string;
  };
  status: "PENDING" | "SUCCESS" | "FAILED" | "CANCELED";
  createdAt: Date;
  isProcessed: boolean;
  updatedAt: Date;
}

const transactionSchema = new Schema<ITransaction>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "user", required: true },
    raffleIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "raffles",
        required: true,
      },
    ],
    promoCode: {
      type: Schema.Types.ObjectId,
      ref: "promoCodes",
      default: null,
    },
    promoDetails: {
      code: {
        type: String,
        default: "",
      },
      discountValue: {
        type: Number,
        default: 0,
      },
    },
    amount: {
      subtotal: {
        type: Number,
        required: true,
      },
      discount: {
        type: Number,
        default: 0,
      },
      total: {
        type: Number,
        required: true,
      },
      currency: {
        type: String,
        default: "usd",
      },
    },
    isProcessed: {
      type: Boolean,
      default: false,
    },
    stripe: {
      paymentIntentId: {
        type: String,
        required: true,
      },
      checkoutSessionId: {
        type: String,
        default: null,
      },
    },
    status: {
      type: String,
      enum: ["PENDING", "SUCCESS", "FAILED", "CANCELED"],
      default: "PENDING",
    },
  },
  { timestamps: true }
);

transactionSchema.index({ userId: 1, status: 1 });
transactionSchema.index({ "stripe.paymentIntentId": 1 }, { unique: true });

export const TransactionModel = mongoose.model<ITransaction>(
  "transactions",
  transactionSchema
);
