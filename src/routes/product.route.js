import { Router } from "express";
import { getAllProducts, ratingProduct, getProductReviews } from "../controllers/product.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { validateZodSchema } from "../middlewares/validateZodSchema.middleware.js";
import { ratingSchema } from "../schemas/rating.js";


const productRoute = Router();

productRoute.route('/all-products').get(getAllProducts);
productRoute.route('/:productId/reviews').get(getProductReviews);
productRoute.route('/user/:userId/:rating/:productId').post(authMiddleware, validateZodSchema(ratingSchema), ratingProduct);




export {productRoute}