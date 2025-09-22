import mongoose, { Document, Schema } from "mongoose";
import { authTypes, languages } from "src/utils/constant";

export interface IShippingAddress extends Document {
  country: string;
  state: string;
  address: string;
  city: string;
  postalCode: string;
  countryCode: string;
  phoneNumber: string;
}
export interface IUser extends Document {
  userName: string;
  email: string;
  password?: string;
  image?: string;
  language?: "en";
  fcmToken?: string | null;
  authType: "EMAIL" | "GOOGLE" | "APPLE";
  role: "USER" | "ADMIN";
  isVerifiedEmail: boolean;
  isVerifiedPhone: boolean;
  pendingIsPhoneVerified:boolean;
  isDeleted: boolean;
  isBlocked?: boolean;
  lastLoginAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  createdForVerificationAt?: Date;
  stripeCustomerId?: string;
  isCardSetupComplete?: boolean;
  hasUsedTrial?: boolean;
  totalPoints?: number;
  shippingAddresses?: IShippingAddress[];
}



const userSchema = new Schema<IUser>(
  {
    userName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      unique: true,
      trim: true,
    },
    password: {
      type: String,
      required: function () {
        return this.authType === "EMAIL";
      },
    },
    image: {
      type: String,
      default: "user/dummyImg",
    },
    fcmToken: {
      type: String,
      default: null,
    },
    language: {
      type: String,
      enum: languages,
      default: "en",
    },
    authType: {
      type: String,
      enum: authTypes,
      default: "EMAIL",
    },
    role: {
      type: String,
      default: "USER",
    },
    isVerifiedEmail: {
      type: Boolean,
      default: false,
    },
    isVerifiedPhone: {
      type: Boolean,
      default: false,
    },
     pendingIsPhoneVerified: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    isBlocked:{
  type: Boolean,
      default: false,
    },
    lastLoginAt: {
      type: Date,
    },
    createdForVerificationAt: {
      type: Date,
      default: function (this: IUser) {
        return !this.isVerifiedEmail ? new Date() : undefined;
      },
      index: {
        expireAfterSeconds: 600,
        partialFilterExpression: { isVerifiedEmail: false },
      },
    },
    stripeCustomerId: {
      type: String,
      default: null,
    },
    isCardSetupComplete: {
      type: Boolean,
      default: false,
    },
    hasUsedTrial: {
      type: Boolean,
      default: false,
    },
    totalPoints: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

export const UserModel = mongoose.model<IUser>("user", userSchema);
