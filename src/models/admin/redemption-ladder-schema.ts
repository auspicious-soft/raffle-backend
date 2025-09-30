import mongoose, { Date, Document, Schema } from "mongoose";

export interface IRedemptionLadder extends Document {
  name: string;
  requiredPoints: number;
  categories: mongoose.Types.ObjectId[];
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const redemptionSchema = new Schema<IRedemptionLadder>(
    {
        name:{
            type:String,
            required:true,
        },
        requiredPoints:{
            type:Number,
            required:true,
        },
        categories: [
      {
        type: Schema.Types.ObjectId,
        ref: "giftCategories",
        required: true,
      },
    ],
        isDeleted:{
            type:Boolean,
            default:false,
        }
    },
    {timestamps:true}
)

export const RedemptionModel = mongoose.model<IRedemptionLadder>("redemptionLadder",redemptionSchema)
