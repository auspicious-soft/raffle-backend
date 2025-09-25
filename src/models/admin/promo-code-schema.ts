import mongoose, { Document, Schema } from "mongoose";

export interface IPromoCode extends Document {
  reedemCode: string;
  discount: number;
  totalUses: number;
  promoUsed: number;
  expiryDate: Date;
  isDeleted: boolean;
  promoType: string;
  associatedTo: mongoose.Types.ObjectId;
  userName: string;
  status: string;
  cretedAt: string;
  updatedAt: string;
}

const promoCodeSchema = new Schema<IPromoCode>(
  {
    reedemCode: {
      type: String,
      required: true,
    },
    discount: {
      type: Number,
      required: true,
    },
    totalUses: {
      type: Number,
      required: true,
    },
    promoUsed: {
      type: Number,
      default: 0,
    },
    expiryDate: {
      type: Date,
      required: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    promoType: {
      type: String,
      default: "PUBLIC",
      enum: ["PUBLIC", "PRIVATE"],
    },
    associatedTo: {
      type: Schema.Types.ObjectId,
      ref: "user",
    },
    userName: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      default: "AVAILABLE",
      enum: ["AVAILABLE", "COMPLETED", "EXPIRED"],
    },
  },
  { timestamps: true }
);


export const PromoCodeModel = mongoose.model<IPromoCode>(
    "promoCodes",
    promoCodeSchema
)