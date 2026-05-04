import { Router } from "express";
import { validateZodSchema } from "../middlewares/validateZodSchema.middleware.js";
import { addProfile, currentUser, registerUser, verifyEmail } from "../controllers/user.controller.js";
import { userRegisterSchema } from "../schemas/userRegister.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { imageMulter} from "../middlewares/multerImage.middleware.js";
import { getProductsByNameOrSlug } from "../controllers/product.controller.js";
import { getProduct } from "../controllers/product.controller.js";
import Order from "../models/orderItems.model.js";
const userRouter = Router();

const uploadImage = imageMulter(5, ["image/png" , "image/jpeg" , "image/gif", "image/jpg"]);

userRouter.route('/register').post(validateZodSchema(userRegisterSchema), registerUser);
userRouter.route('/verify-email/:token').get( verifyEmail);
userRouter.route('/add-profile').post(authMiddleware ,uploadImage.single("image"), addProfile);
userRouter.route('/get-user').get(authMiddleware, currentUser);
userRouter.route('/products').get(getProductsByNameOrSlug);
userRouter.route('/productss/:productId').get(authMiddleware, getProduct);

// 📦 Get Order History
userRouter.route('/my-orders').get(authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;

    const orders = await Order.find({ user: userId })
      .populate('items.product', 'name slug image')
      .sort({ createdAt: -1 });

    const now = Date.now();
    const cutoffDate = new Date(now - 7 * 24 * 60 * 60 * 1000);

    const ordersVisible = (orders || []).filter(order => {
      const statusNormalized = String(order.orderStatus ?? "")
        .trim()
        .toLowerCase();

      if (["processing", "confirmed", "shipped"].includes(statusNormalized)) {
        return true;
      }

      if (["delivered", "cancelled"].includes(statusNormalized)) {
        return order.createdAt && order.createdAt >= cutoffDate;
      }

      return false;
    });

    if (ordersVisible.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No orders found",
        orders: [],
      });
    }

    res.status(200).json({
      success: true,
      message: "Orders retrieved successfully",
      totalOrders: ordersVisible.length,
      orders: ordersVisible.map(order => ({
        _id: order._id,
        items: order.items,
        totalAmount: order.totalAmount,
        currency: order.currency,
        orderStatus: String(order.orderStatus ?? "").trim().toLowerCase(),
        paymentStatus: order.paymentStatus,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      })),
    });

  } catch (error) {
    console.error("❌ Error fetching orders:", error.message);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

export { userRouter }