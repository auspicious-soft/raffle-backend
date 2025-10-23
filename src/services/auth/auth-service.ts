import { configDotenv } from "dotenv";
import { OtpModel } from "src/models/system/otp-schema";
import { IUser, UserModel } from "src/models/user/user-schema";
import {
  generateAndSendOtp,
  generateToken,
  hashPassword,
  verifyPassword,
} from "src/utils/helper";
import jwt from "jsonwebtoken";
import { Filter } from "bad-words";
import { error } from "console";
import { ShippingAddressModel } from "src/models/user/user-shipping-schema";

configDotenv();

const filter = new Filter();

filter.addWords("somebadword", "anotherbadword");

function normalizeUsername(username: string) {
  return username
    .toLowerCase()
    .replace(/[@._-]/g, "")            // remove special chars
    .replace(/[0-9]/g, "")             // remove digits
    .replace(/[0134]/g, (c) => ({ 
      "0": "o", 
      "1": "i", 
      "3": "e", 
      "4": "a" 
    }[c] || c))
    .trim();
}


export const authServices = {
  async login(payload: any) {
    const checkExist = await UserModel.findOne({
      email: payload.email,
      authType: "EMAIL",
      isBlocked: false,
      isDeleted: false,
    }).lean();

    const checkEmailVerified = await UserModel.findOne({
      email: payload.email,
      isBlocked: false,
      isDeleted: false,
      isVerifiedEmail: true,
    });

    let hasShippingDetails = false;
    const userId = checkExist?._id;

    const hasShippingAddress = await ShippingAddressModel.findOne({
      userId:userId
    })

    if(hasShippingAddress){
      hasShippingDetails=true;
    }


    if (!checkExist) {
      throw new Error("userNotFound");
    }

    if (!checkEmailVerified) {
      throw new Error("Email not verified.");
    }

    const passwordStatus = await verifyPassword(
      payload.password,
      checkExist?.password || ""
    );
    if (!passwordStatus) {
      throw new Error("invalidPassword");
    }
    delete checkExist.password;
    return {...checkExist, hasShippingDetails};
  },

  async forgetPassword(payload: any) {
    const checkExist = await UserModel.findOne({
      email: payload.email,
      isVerifiedEmail: true,
      authType: "EMAIL",
    });
    if (!checkExist) {
      throw new Error("userNotFound");
    }
   const OTP = await generateAndSendOtp(payload.email, "FORGOT_PASSWORD", "EMAIL", "USER");
    return {OTP};
  },

  async verifyForgetPasswordOTP(payload: any) {
    const checkOtp = await OtpModel.findOne({
      $or: [{ email: payload.method }, { phone: payload.method }],
      code: payload.code,
      userType: payload.userType,
    });
    if (!checkOtp) {
      throw new Error("invalidOtp");
    }
    const tokenPayload = checkOtp.toObject();
    const token = jwt.sign(tokenPayload, process.env.AUTH_SECRET as string, {
      expiresIn: "5m",
    });

    return { token };
  },

  async resetPassword(payload: any) {
    const data = jwt.verify(
      payload.token,
      process.env.AUTH_SECRET as string
    ) as any;
    if (!data.email && !data.phone) {
      throw new Error("Missing Required Fields");
    }
    const checkOtp = await OtpModel.findOne({
      $or: [{ email: data?.email }, { phone: data?.phone }],
      code: data.code,
      purpose: "FORGOT_PASSWORD",
      userType: "USER",
    });
    if (!checkOtp) {
      throw new Error("Error");
    }
    const password = await hashPassword(payload.password);

    await UserModel.updateOne({ email: data.email }, { $set: { password } });

    return {};
  },

  async registerUser(payload: any) {
    const checkExist = await UserModel.findOne({
      email: payload.email,
      isDeleted: false,
    });
    if (checkExist) {
      throw new Error("emaiExist");
    }

    const checkUserName = await UserModel.findOne({
      userName:payload.userName,
      isDeleted:false,
    });
    if(checkUserName){
      throw new Error("username allready exist")
    }

    payload.password = await hashPassword(payload.password);
    const userData = await UserModel.create(payload);
    const user = userData.toObject();
    delete user.password;
    let OTP = ""
    if (payload.authType === "EMAIL") {
     OTP =  await generateAndSendOtp(payload.email, "SIGNUP", "EMAIL", "USER");
    }
    return {...user, OTP};
  },

  async verifyOtp(payload: any) {
    const checkExist = await OtpModel.findOne({
      $or: [{ email: payload.method }, { phone: payload.method }],
      code: payload.code,
      userType: payload.userType,
    });
    if (!checkExist) {
      throw new Error("invalidOtp");
    }
    const verificationMode = checkExist.email ? "email" : "phone";
    const verificationKey = checkExist.email
      ? "isVerifiedEmail"
      : "isVerifiedPhone";

    const userData = await UserModel.findOneAndUpdate(
      { [verificationMode]: payload.method },
      { $set: { [verificationKey]: true } },
      { new: true }
    );
    if (!userData) {
      throw new Error("userNotFound");
    }

    const token = await generateToken(userData);
    const user = userData.toObject();
    delete user.password;

    return { ...user, token, hasShippingDetails:false };
  },

  async resendOtp(payload: any) {
    if (payload.userType == "USER") {
      const checkExist = await UserModel.findOne({
        $or: [{ email: payload.value }, { phone: payload.value }],
        isVerifiedEmail: false,
        isVerifiedPhone: false,
      });

      if (!checkExist) {
        throw new Error("registerAgain");
      }
    }

   const OTP  = await generateAndSendOtp(
      payload.value,
      payload.purpose,
      "EMAIL",
      payload.userType
    );
    return {OTP};
  },

  async checkUserNameAvailability(payload:any) {
    const {userName} = payload
    if (!userName) {
      throw new Error("userNameRequired");
    }
    const normalized = normalizeUsername(userName);


    if (filter.isProfane(normalized)) {
      return { available: false, reason: "profanity" };
    }
    const existingUser = await UserModel.findOne({
      userName: { $regex: `^${userName}$`, $options: "i" },
      isDeleted: false,
    });
    if (existingUser) {
      return { available: false };
    }

    return { available: true };
  },
};
