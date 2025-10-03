import mongoose, { Document, Schema } from "mongoose";

export interface ICartQueue extends Document {
  userId: mongoose.Types.ObjectId;
  items: mongoose.Types.ObjectId[]; // Multiple raffles can be reserved
  expiresAt: Date; // Time when reservation expires
  createdAt: Date;
  updatedAt: Date;
}

const cartQueueSchema = new Schema<ICartQueue>(
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
      default: () => new Date(Date.now() + 2 * 60 * 1000), // 10 minutes from creation
    },
  },
  { timestamps: true }
);



export const CartQueueModel = mongoose.model<ICartQueue>("cart_queue", cartQueueSchema);
