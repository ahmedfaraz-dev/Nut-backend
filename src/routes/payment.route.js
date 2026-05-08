import express from "express";
import Stripe from "stripe";
import { Product } from "../models/product.model.js";
import Order from "../models/orderItems.model.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
const router = express.Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const SUPPORTED_CURRENCIES = new Set(["usd", "eur", "gbp", "inr", "pkr"]);
const BASE_CURRENCY = "pkr";
const CURRENCY_CACHE_TTL_MS = 30 * 60 * 1000;

let currencyRatesCache = {
  rates: null,
  expiresAt: 0,
};

const getExchangeRates = async () => {
  const now = Date.now();
  if (currencyRatesCache.rates && now < currencyRatesCache.expiresAt) {
    return currencyRatesCache.rates;
  }

  if (!process.env.CURRENCY_API_KEY) {
    throw new Error("Currency API key is missing");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(
      `https://v6.exchangerate-api.com/v6/${process.env.CURRENCY_API_KEY}/latest/${BASE_CURRENCY.toUpperCase()}`,
      { signal: controller.signal }
    );

    if (!response.ok) {
      throw new Error(`Currency API request failed with status ${response.status}`);
    }

    const data = await response.json();
    const rates = data?.conversion_rates;

    if (!rates || typeof rates !== "object") {
      throw new Error("Invalid response from currency API");
    }

    currencyRatesCache = {
      rates,
      expiresAt: now + CURRENCY_CACHE_TTL_MS,
    };

    return rates;
  } finally {
    clearTimeout(timeout);
  }
};

router.post("/create-payment-intent", authMiddleware, async (req, res) => {
  try {
    const { cartItems, customerData, currency } = req.body;
    const userId = req.user._id;
    const requestedCurrency = String(currency || BASE_CURRENCY).toLowerCase();

    if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Cart items are required",
      });
    }

    if (!SUPPORTED_CURRENCIES.has(requestedCurrency)) {
      return res.status(400).json({
        success: false,
        message: "Unsupported currency",
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
    const finalAmountInPkr = totalItemsPrice + deliveryCharges;
    let finalAmount = finalAmountInPkr;

    if (requestedCurrency !== BASE_CURRENCY) {
      const rates = await getExchangeRates();
      const conversionRate = rates[requestedCurrency.toUpperCase()];

      if (!conversionRate) {
        return res.status(502).json({
          success: false,
          message: "Unable to convert amount for selected currency",
        });
      }

      finalAmount = finalAmountInPkr * conversionRate;
    }

    // 3️⃣ Create Stripe Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(finalAmount * 100), // Stripe expects amounts in cents/paisas
      currency: requestedCurrency,
      metadata: {
        customerEmail: customerData?.email,
        customerName: `${customerData?.firstName} ${customerData?.lastName}`,
        orderItems: cartItems.length,
      },
      automatic_payment_methods: { enabled: true },
    });

    // 4️⃣ Create Order Record with "processing" order status
    const order = await Order.create({
      user: userId,
      customerInfo: {
        name: `${customerData?.firstName} ${customerData?.lastName}`,
        email: customerData?.email,
        phone: customerData?.phone,
      },
      items: orderItems,
      totalAmount: finalAmount,
      currency: requestedCurrency,
      addressSnapshot: {
        address: customerData?.address || "N/A",
        city: customerData?.city || "N/A",
        country: customerData?.country || "Pakistan",
        zip: customerData?.postalCode || "N/A",
      },
      stripePaymentIntentId: paymentIntent.id,
      paymentStatus: "pending",
      orderStatus: "processing",
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