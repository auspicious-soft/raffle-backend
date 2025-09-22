import mongoose, { Schema, Document } from "mongoose";

export interface IToken extends Document {
  userId: mongoose.Types.ObjectId;
  token: string;
  createdAt: Date;
  expiresAt: Date;
}

const tokenSchema = new Schema<IToken>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    token: {
      type: String,
      required: true,
      index: true,
      unique: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: true },
  }
);

tokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const TokenModel = mongoose.model<IToken>("Token", tokenSchema);
