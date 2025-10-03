import mongoose, { Document, Schema } from "mongoose";


export interface ICart extends Document {
  userId: mongoose.Types.ObjectId;
  items: mongoose.Types.ObjectId[];
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const cartSchema = new Schema<ICart>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    items: [
        {
          type: Schema.Types.ObjectId,
          ref: "raffles",
          required: true,
        },
    ],
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 2 * 60 * 1000), // 10 mins
    },
  },
  { timestamps: true }
);

export const CartModel = mongoose.model<ICart>("carts", cartSchema);
