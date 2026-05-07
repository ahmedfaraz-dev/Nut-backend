import { Router } from "express";
import { validateZodSchema } from "../middlewares/validateZodSchema.middleware.js";
import { addProfile, currentUser, registerUser, verifyEmail } from "../controllers/user.controller.js";
import { userRegisterSchema } from "../schemas/userRegister.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { imageMulter} from "../middlewares/multerImage.middleware.js";
import { getProductsByNameOrSlug } from "../controllers/product.controller.js";
import { getProduct } from "../controllers/product.controller.js";
import { getAllCategories } from "../controllers/category.controller.js";
import { userOrder } from "../controllers/order.controller.js";
const userRouter = Router();

const uploadImage = imageMulter(5, ["image/png" , "image/jpeg" , "image/gif", "image/jpg"]);

userRouter.route('/register').post(validateZodSchema(userRegisterSchema), registerUser);
userRouter.route('/verify-email/:token').get( verifyEmail);
userRouter.route('/add-profile').post(authMiddleware ,uploadImage.single("image"), addProfile);
userRouter.route('/get-user').get(authMiddleware, currentUser);
userRouter.route('/products').get(getProductsByNameOrSlug);
userRouter.route('/productss/:productId').get( getProduct);
userRouter.route('/categories').get( getAllCategories);

// 📦 Get Order History
userRouter.route('/my-orders').get(authMiddleware, userOrder);

export { userRouter }