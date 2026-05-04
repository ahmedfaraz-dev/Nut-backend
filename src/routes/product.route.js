import { Router } from "express";
import { getAllProducts, ratingProduct } from "../controllers/product.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { validateZodSchema } from "../middlewares/validateZodSchema.middleware.js";
import { ratingSchema } from "../schemas/rating.js";


const productRoute = Router();

productRoute.route('/all-products').get(getAllProducts);
productRoute.route('/user/:userId/:rating/:productId').get(authMiddleware, validateZodSchema( ratingSchema , ratingProduct));




export {productRoute}