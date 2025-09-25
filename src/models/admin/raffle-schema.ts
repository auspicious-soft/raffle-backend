import mongoose, {Date, Document, Schema} from "mongoose";

export interface IRewardDetails extends Document{
    rewardName:string;
    rewardImages:string;
    rewardType:string;
    consolationPoints:number;
    promoCode:string;
}
export interface IRafflle extends Document {
    title:string;
    description:string;
    price:number;
    totalSlots:number;
    bookedSlots:number;
    startDate:number;
    endDate:number;
    status:string;
    createdAt:Date;
    updatedAt:Date;
}