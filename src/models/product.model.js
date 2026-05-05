import mongoose, { Schema, model } from "mongoose";
import { number } from "zod";


const productSchema = new Schema({
    name: {
        type: String,
        trim: true,
        required: true,
        lowercase: true,
        minLength: [3, "Product name should have at least 3 characters"]
    },
    price: {
        type: Number,
        required: true
    },
    images: {
        type: [String],
        required: true
    },
    discription: {
        type: String,
        required: true
    },
    stock: {
        type: Number,
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
        required: true
    },
    activeDeal: {
        type: mongoose.Types.ObjectId,
        ref: "Deal",
        default: null
    },
    slug: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    averageRating: {
        type: Number,
        default: 0
    },
    totalRatings: {
        type: Number,
        default: 0
    },
    ratingSum: {
        type: Number,
        default: 0
    },
    ratingBreakdown: {
        "5": { type: Number, default: 0 },
        "4": { type: Number, default: 0 },
        "3": { type: Number, default: 0 },
        "2": { type: Number, default: 0 },
        "1": { type: Number, default: 0 }
    }
}, { timestamps: true })

productSchema.index({ name: 1 });
productSchema.index({ category: 1 });
productSchema.index({ user: 1 });
productSchema.index({ price: 1 });
productSchema.index({ activeDeal: 1 });
productSchema.index({ isActive: 1 });
export const Product = model("Product", productSchema);