import mongoose, { Date, Document, Schema } from "mongoose";
import { required } from "zod/v4/core/util.cjs";

export interface IRewardDetails extends Document {
  rewardName: string;
  rewardImages: string[];
  rewardType: string;
  giftCard: mongoose.Types.ObjectId;
  consolationPoints: number;
  promoCode: mongoose.Types.ObjectId;
  rewardStatus: string;
}
export interface IRaffle extends Document {
  title: string;
  description: string;
  price: number;
  winnerId: mongoose.Types.ObjectId;
  totalSlots: number;
  bookedSlots: number;
  startDate: Date;
  endDate: Date;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  rewards: IRewardDetails[];
}

const raffleSchema = new Schema<IRaffle>({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    requried: true,
  },
  price: {
    type: Number,
    required: true,
  },
  totalSlots: {
    type: Number,
    required: true,
  },
  bookedSlots: {
    type: Number,
    default: 0,
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  winnerId: {
    type: Schema.Types.ObjectId,
    ref: "user",
    default: null,
  },
  status: {
    type: String,
    default: "INACTIVE",
    eanum: ["INACTIVE", "ACTIVE", "COMPLETED"],
  },
  rewards: {
    rewardName: {
      type: String,
      required: true,
    },
    rewardType: {
      type: String,
      default: "DIGITAL",
      enum: ["DIGITAL", "PHYSICAL"],
    },
    giftCard: {
      type: Schema.Types.ObjectId,
      ref: "giftcards",
      default: null,
    },
    consolationPoints: {
      type: Number,
      required: true,
    },
    promoCode: {
      type: Schema.Types.ObjectId,
      ref:"promoCodes",
      default: null,
    },
    rewardStaus: {
      type: String,
      default: "",
      enum: ["DELIVERED", ""],
    },
  },
});
