import AsyncHandler from "../handlers/AsyncHandler.js";
import CustomError from "../handlers/CustomError.js";
import { Product } from "../models/product.model.js";
import mongoose from "mongoose";
import { Deal } from "../models/deals.model.js";
import Category from "../models/category.model.js";
import { fileTypeFromBuffer } from "file-type";
import { uploadToCloudinary } from "../utils/uploadToCloudinary.js";
import User from "../models/user.models.js";
import { ensureSlug } from "../utils/makingSlug.js";
import { Rating } from "../models/rating.model.js";
import Order from "../models/orderItems.model.js";
import { ApiFeature } from "../utils/ApiFeatures.js";




//@ get all admin products
const getAllAdminProducts = AsyncHandler(async (req, res) => {
    const user = req.user;

    console.log("User is here", user);
    const { page = 1, limit = 10, search } = req.query;

    const filter = { user: user._id, isActive: true };

    if (search?.trim()) {
        filter.name = { $regex: search.trim(), $options: "i" };
    }

    const totalProducts = await Product.countDocuments(filter);

    const products = await Product.find(filter)
        .select("name price stock isActive activeDeal discription") // include description
        .populate({
            path: "activeDeal",
            select: "discount startDate endDate user"
        })
        .populate("category", "name") // populate category name if category exists
        .limit(Number(limit))
        .skip((page - 1) * limit)
        .lean();
    console.log(products, "the products are here");
    const meta = {
        page,
        limit,
        totalProducts,
        totalPages: Math.ceil(totalProducts / limit)
    };

    res.status(200).json({
        success: true,
        message: "Products fetched successfully",
        test: "true",
        data: { products },
        meta
    });
});

// @ create Product controller

const createProduct = AsyncHandler(async (req, res, next) => {

    const { name, price, stock, isActive, category, deals, discription } = req.body
    console.log(name, price, stock, isActive, category, deals, discription);
    const files = req.files;
    console.log(files);

    const user = req.user;
    console.log("the user is here", user);

    const productImage = [];

    for (const file of files) {
        const detectedType = await fileTypeFromBuffer(file.buffer);

        if (!detectedType || !["image/jpeg", "image/png"].includes(detectedType.mime)) {
            return next(new CustomError(400, "Invalid image file"));
        }

        try {
            const result = await uploadToCloudinary({
                resource_type: "image",
                buffer: file.buffer,
                folder: "E-commerce_products",
                transformation: [{ quality: "auto" }]
            });

            productImage.push(result.secure_url);
        } catch (error) {
            return next(new CustomError(500, "Cloudinary upload failed"));
        }
    }

    const existingCategory = await Category.findById(category);
    if (!existingCategory) {
        return next(new CustomError(400, "Create the category before creating product first."));
    }

    if (deals) {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const { discount, startDate, endDate } = req.body.deals;
            const product = await Product.create({
                name,
                price,
                stock,
                category,
                isActive,
                discription,
                images: productImage,
                user: user._id,
                slug: ensureSlug(name)
            });

            const deal = await Deal.create({
                discount,
                startDate,
                endDate,
                product: product._id,
                user: user._id
            });
            product.activeDeal = deal._id;
            console.log(deal);

            await product.save({ session })
            await session.commitTransaction();

            res.status(201).json({
                success: true,
                message: "Product is created successfully.",
                data: { product }
            })
        } catch (error) {
            await session.abortTransaction();
            console.log(error, "the error");

            return next(error instanceof CustomError ? new CustomError(500, "Failed to create a product") : error);
        } finally {
            session.endSession();
        }
    } else {

        const product = await Product.create({ name, price, stock, category, isActive, user: user._id, images: productImage, discription, slug: ensureSlug(name) });

        if (!product) {
            return next(new CustomError(500, "Failed to create the product."));
        }

        res.status(201).json({
            success: true,
            message: "Product is created successfuly",
            data: { product }
        })
    }

});


//@ edit product 

const editProduct = AsyncHandler(async (req, res, next) => {
    const productId = req.params.productId;
    const { name, price, stock, isActive, category, discription } = req.body;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
        return next(new CustomError(400, "Invalid product ID"))
    }

    const updateData = { name, price, stock, isActive, category, discription };
    if (name) {
        updateData.slug = ensureSlug(name);
    }

    const product = await Product.findByIdAndUpdate(productId, updateData, { returnDocument: "after", runValidators: true })
        .populate("activeDeal", "discount startDate endDate")
        .populate("category", "name")
        .select("name price stock isActive activeDeal discription images category");

    if (!product) {
        return next(new CustomError(404, "Failed to update the product"))
    }
    res.status(200).json({
        success: true,
        message: "product is updated successfully.",
        data: { product },
    });
});

// @ delete product
const deleteProduct = AsyncHandler(async (req, res, next) => {
    const productId = req.params.productId;
    const product = await Product.findById(productId);
    if (!product) {
        return next(new CustomError(404, "can't find the product"));
    }
    if (product.activeDeal) {
        await Deal.findByIdAndDelete(product.activeDeal)
    }
    await Product.findByIdAndDelete(productId);


    res.status(204).json({
        success: true,
        message: "product is deleted sucessfuly"
    })

});

// @ get the product

const getProduct = AsyncHandler(async (req, res, next) => {
    const id = req.params.productId;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return next(new CustomError(400, "Invalid product ID"))
    }


    const product = await Product.findById(id)
        .select("_id name price stock isActive activeDeal images discription slug category averageRating totalRatings ratingSum ratingBreakdown")
        .populate("activeDeal");

    if (!product) {
        return next(new CustomError(404, "Product not found"));
    }
    res.status(200).json({
        success: true,
        message: "Product fetched successfully",
        product
    });

});


const getProductsByNameOrSlug = AsyncHandler(async (req, res, next) => {
    const { name, slug } = req.query;
    let query = { isActive: true };

    if (name) {
        query.name = { $regex: name, $options: "i" };
    }

    if (slug) {
        query.slug = slug;
    }

    const products = await Product.find(query)
        .populate({
            path: "activeDeal",
            select: "discount startDate endDate"
        })
        .lean();

    res.status(200).json({
        success: true,
        message: "Productsss fetched successfully",
        data: products
    });
});

const getAllProducts = AsyncHandler(async (req, res, next) => {
    const admin = await User.findOne({ role: "admin" });

    if (!admin) {
        return next(new CustomError(404, "No admin found"));
    }

    const features = new ApiFeature(
        Product.find({ user: admin._id, isActive: true })
            .populate("activeDeal")
            .populate("category", "name"),
        req.query
    );

    await features.filterCategory(Category, req.query.category);
    features.filterPrice();
    await features.filterDiscount(Deal, admin._id);
    features.search();

    const totalProducts = await features.countDocuments();
    features.paginate();

    const data = await features.query;

    res.status(200).json({
        success: true,
        data,
        meta: {
            page: features.page,
            limit: features.limit,
            totalProducts,
            totalPages: Math.ceil(totalProducts / features.limit) || 1,
        },
    });
});


const getAdminStats = async (req, res, next) => {

    const productCount = await Product.countDocuments();
    const categoryCount = await Category.countDocuments();
    const dealCount = await Deal.countDocuments();

    res.status(200).json({
        success: true,
        data: {
            products: productCount,
            categories: categoryCount,
            deals: dealCount
        }
    })
};

//@rating product 

const ratingProduct = AsyncHandler(async (req, res, next) => {
    const { rating, title, comment } = req.body;
    const { userId, productId } = req.params;

    // ---------------- VALIDATION ----------------
    if (!userId || !productId) {
        return next(new CustomError(400, "User ID and Product ID are required"));
    }

    if (
        !mongoose.Types.ObjectId.isValid(userId) ||
        !mongoose.Types.ObjectId.isValid(productId)
    ) {
        return next(new CustomError(422, "Invalid userId or productId"));
    }

    // ---------------- USER CHECK ----------------
    const user = await User.findOne({
        _id: userId,
        isVerified: true
    });

    if (!user) {
        return next(new CustomError(403, "User not verified"));
    }

    // ---------------- PRODUCT CHECK ----------------
    const product = await Product.findOne({
        _id: productId,
        isActive: true
    });

    if (!product) {
        return next(new CustomError(404, "Product not found"));
    }

    // ---------------- ORDER VALIDATION ----------------
    const hasPurchased = await Order.exists({
        user: userId,
        paymentStatus: "paid",
        orderStatus: "delivered",
        "items.product": productId
    });

    if (!hasPurchased) {
        return next(
            new CustomError(403, "You can only review purchased products")
        );
    }

    const session = await mongoose.startSession();

    try {
        session.startTransaction();

        // ---------------- CHECK EXISTING REVIEW ----------------
        const existingReview = await Rating.findOne({
            userId,
            productId
        }).session(session);

        const isNewReview = !existingReview;
        const previousRating = existingReview?.rating;

        // ---------------- UPSERT REVIEW ----------------
        const ratingDoc = await Rating.findOneAndUpdate(
            { userId, productId },
            {
                $set: {
                    rating,
                    title,
                    comment
                }
            },
            {
                new: true,
                upsert: true,
                session
            }
        );

        // ---------------- PRODUCT STATS UPDATE ----------------
        let updateQuery;

        if (isNewReview) {
            updateQuery = {
                $inc: {
                    totalRatings: 1,
                    ratingSum: rating,
                    [`ratingBreakdown.${rating}`]: 1
                }
            };
        } else {
            updateQuery = {
                $inc: {
                    ratingSum: rating - previousRating,
                    [`ratingBreakdown.${previousRating}`]: -1,
                    [`ratingBreakdown.${rating}`]: 1
                }
            };
        }

        const updatedProduct = await Product.findByIdAndUpdate(
            productId,
            updateQuery,
            {
                session,
                new: true,
                runValidators: false
            }
        );

        // Recalculate average safely
        const averageRating =
            updatedProduct.ratingSum / updatedProduct.totalRatings;

        await Product.updateOne(
            { _id: productId },
            { $set: { averageRating } },
            { session }
        );

        // Recalculate average safely
        updatedProduct.averageRating =
            updatedProduct.ratingSum / updatedProduct.totalRatings;

        await updatedProduct.save({ session });

        await session.commitTransaction();
        session.endSession();

        return res.status(200).json({
            success: true,
            message: isNewReview
                ? "Rating created successfully"
                : "Rating updated successfully"
        });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        return next(error);
    }
});


const getProductReviews = AsyncHandler(async (req, res, next) => {
    const { productId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
        return next(new CustomError(400, "Invalid product ID"));
    }

    const reviews = await Rating.find({ productId })
        .populate("userId", "name avatar")
        .sort({ createdAt: -1 })
        .lean();

    res.status(200).json({
        success: true,
        reviews,
    });
});

export { createProduct, getAllAdminProducts, editProduct, deleteProduct, getProduct, getAdminStats, getAllProducts, getProductsByNameOrSlug, ratingProduct, getProductReviews }