import mongoose, { Document, Schema } from "mongoose";

export interface IShippingAddress extends Document {
  userId: mongoose.Types.ObjectId; // Reference to User
  country: string;
  state: string;
  address: string;
  city: string;
  postalCode: string;
  countryCode: string;
  phoneNumber: string;
  createdAt?: Date;
  updatedAt?: Date;
  pendingPhoneNumber?: string;
  pendingCountryCode?: string;
}

const shippingAddressSchema = new Schema<IShippingAddress>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "user",
      required: true,
      index: true,
    },
    country: {
      type: String,
      required: true,
    },
    state: {
      type: String,
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
    city: {
      type: String,
      required: true,
    },
    postalCode: {
      type: String,
      required: true,
    },
    countryCode: {
      type: String,
      default: "",
    },
    phoneNumber: {
      type: String,
      default: "",
    },
    pendingPhoneNumber: { type: String, default: "" },
    pendingCountryCode: { type: String, default: "" },
  },
  { timestamps: true }
);

export const ShippingAddressModel = mongoose.model<IShippingAddress>(
  "shippingAddress",
  shippingAddressSchema
);
