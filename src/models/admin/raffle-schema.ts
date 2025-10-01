import mongoose, { Date, Document, Schema } from "mongoose";

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
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
  rewards: IRewardDetails[];
}

const raffleSchema = new Schema<IRaffle>(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
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
    isDeleted: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      default: "INACTIVE",
      enum: ["INACTIVE", "ACTIVE", "COMPLETED"],
    },
    rewards: [
      {
        rewardName: {
          type: String,
          required: true,
        },
        rewardType: {
          type: String,
          default: "DIGITAL",
          enum: ["DIGITAL", "PHYSICAL"],
        },
        rewardImages: {
          type: [String],
          default: [],
        },
        giftCard: {
          type: Schema.Types.ObjectId,
          ref: "giftCategories",
          default: null,
        },
        consolationPoints: {
          type: Number,
          required: true,
        },
        promoCode: {
          type: Schema.Types.ObjectId,
          ref: "promoCodes",
          default: null,
        },
        rewardStatus: {
          type: String,
          default: "",
          enum: ["DELIVERED", "GRANTED","SHIPPED" ,""],
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

export const RaffleModel = mongoose.model<IRaffle>("raffles", raffleSchema);
