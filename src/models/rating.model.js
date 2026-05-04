import mongoose, { Schema, model } from "mongoose";

const ratingSchema = new Schema({
  productId: {
    type: mongoose.Types.ObjectId,
    ref: "Product",
    required: true,
    index: true,
  },
  userId: {
    type: mongoose.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },
  title: {
    type: String,
    trim: true,
  },
  comment: {
    type: String,
  },
  isVerifiedPurchase: {
    type: Boolean,
    default: false,
  }
}, { timestamps: true });


ratingSchema.index({ userId: 1, productId: 1 }, { unique: true });

export const Rating =  model("Rating", ratingSchema);