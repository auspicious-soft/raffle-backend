import mongoose, { Document, Schema } from "mongoose";

export interface IGiftCard extends Document {
  categoryId: mongoose.Types.ObjectId;
  redemptionCode: string;
  price: number;
  status: string;
  expiryDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

const giftCardSchema = new Schema<IGiftCard>({
  categoryId: {
    type: Schema.Types.ObjectId,
    ref: "giftCategories",
    required: true,
  },
  redemptionCode: {
    type: String,
    required: true,
    unique: true,
  },
  status: {
    type: String,
    default: "NOT_GRANTED",
    enum: ["NOT_GRANTED", "GRANTED", "EXPIRED"],
  },
  price: {
    type: Number,
    required: true,
  },
  expiryDate: {
    type: Date,
    required: true,
  },
},
  { timestamps: true }

);

export const GiftCardModel = mongoose.model<IGiftCard>(
  "giftcards",
  giftCardSchema
);
