import express from "express";
import Stripe from "stripe";
import { Product } from "../models/product.model.js";
import Order from "../models/orderItems.model.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
const router = express.Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

router.post("/create-payment-intent", authMiddleware, async (req, res) => {
  try {
    const { cartItems, customerData } = req.body;
    const userId = req.user._id;

    if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Cart items are required",
      });
    }

    // 1️⃣ Calculate total amount securely by fetching current prices from DB
    let totalItemsPrice = 0;
    const orderItems = [];

    for (const item of cartItems) {
      const product = await Product.findById(item.productId);
      if (product) {
        totalItemsPrice += product.price * item.quantity;
        orderItems.push({
          product: product._id,
          name: product.name,
          price: product.price,
          quantity: item.quantity,
          image: product.images[0] || "",
        });
      } else {
        console.warn(`Product not found: ${item.productId}`);
      }
    }

    if (totalItemsPrice === 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid items in cart",
      });
    }

    // 2️⃣ Add Delivery Charges
    const deliveryCharges = 250;
    const finalAmount = totalItemsPrice + deliveryCharges;

    // 3️⃣ Create Stripe Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(finalAmount * 100), // Stripe expects amounts in cents/paisas
      currency: "pkr",
      metadata: {
        customerEmail: customerData?.email,
        customerName: `${customerData?.firstName} ${customerData?.lastName}`,
        orderItems: cartItems.length,
      },
      automatic_payment_methods: { enabled: true },
    });

    // 4️⃣ Create Order Record with "pending" payment status
    const order = await Order.create({
      user: userId,
      customerInfo: {
        name: `${customerData?.firstName} ${customerData?.lastName}`,
        email: customerData?.email,
        phone: customerData?.phone,
      },
      items: orderItems,
      totalAmount: finalAmount,
      currency: "pkr",
      addressSnapshot: {
        address: customerData?.address || "N/A",
        city: customerData?.city || "N/A",
        country: customerData?.country || "Pakistan",
        zip: customerData?.postalCode || "N/A",
      },
      stripePaymentIntentId: paymentIntent.id,
      paymentStatus: "pending",
      orderStatus: "pending",
    });

    console.log("✅ Order created with ID:", order._id);

    res.status(201).json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      orderId: order._id,
    });

  } catch (error) {
    console.error("❌ Stripe Error:", error.message);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// 📝 Endpoint to update payment status after successful Stripe payment
router.post("/confirm-payment", authMiddleware, async (req, res) => {
  try {
    const { paymentIntentId } = req.body;

    if (!paymentIntentId) {
      return res.status(400).json({
        success: false,
        message: "Payment Intent ID is required",
      });
    }

    // Find order by Stripe Payment Intent ID
    const order = await Order.findOne({ stripePaymentIntentId: paymentIntentId });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Verify the order belongs to the current user
    if (order.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to access this order",
      });
    }

    // Update payment status to "paid"
    order.paymentStatus = "paid";
    order.orderStatus = "confirmed";
    await order.save();

    console.log("✅ Order payment confirmed:", order._id);

    res.status(200).json({
      success: true,
      message: "Payment confirmed successfully",
      order: {
        orderId: order._id,
        orderStatus: order.orderStatus,
        paymentStatus: order.paymentStatus,
      },
    });

  } catch (error) {
    console.error("❌ Error confirming payment:", error.message);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

export default router;