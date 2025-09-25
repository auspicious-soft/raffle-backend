import mongoose, { Document, Schema } from "mongoose";

export interface IGiftCategory extends Document {
  price: number;
  companyName: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const giftCategorySchema = new Schema<IGiftCategory>(
  {
    price: {
      type: Number,
      requried: true,
    },
    companyName: {
      type: String,
      required: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export const GiftCategoryModel = mongoose.model<IGiftCategory>(
  "giftCategories",
  giftCategorySchema
);
