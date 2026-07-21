import { Product } from "../models/product.model.js";
import { Deal } from "../models/deals.model.js";
import { Groq } from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export const handleChatMessage = async (req, res, next) => {
    try {
        const { message, history } = req.body;

        if (!message) {
            return res.status(400).json({ success: false, message: "Message is required." });
        }

        const now = new Date();

        // 1. Fetch all active products sorted cheapest → most expensive
        const products = await Product.find({ isActive: true })
            .select("name price discription stock")
            .sort({ price: 1 });

        // 2. FIX: Removed .select() conflict — only use .populate() with fields
        //    FIX: Added startDate filter so only truly LIVE deals are included
        const activeDeals = await Deal.find({
            startDate: { $lte: now },   // deal has already started
            endDate:   { $gt: now },    // deal has not expired
        })
            .populate("product", "name price")  // populate without .select() interference
            .sort({ discount: -1 });            // biggest discount first

        // 3. Format products as a clean numbered list
        const productsContext = products
            .map((p, i) =>
                `${i + 1}. ${p.name} | Price: Rs${p.price} | Stock: ${p.stock > 0 ? "In Stock" : "Out of Stock"} | ${p.discription}`
            )
            .join("\n");

        // 4. FIX: Compute discounted price here so AI doesn't need to do math
        const dealsContext = activeDeals.length > 0
            ? activeDeals
                .map((d, i) => {
                    const productName  = d.product?.name  ?? "Unknown";
                    const originalPrice = d.product?.price ?? 0;
                    const discountedPrice = Math.round(originalPrice - (originalPrice * d.discount) / 100);
                    return `${i + 1}. ${d.discount}% OFF on "${productName}" | Original: Rs${originalPrice} | After Discount: Rs${discountedPrice} | Valid until: ${new Date(d.endDate).toLocaleDateString()}`;
                })
                .join("\n")
            : "No active deals at the moment.";

        // 5. System prompt with clear analytics rules
        const systemPrompt = `You are a helpful and knowledgeable customer support assistant for "Aura-Nuts", a premium e-commerce store selling dry fruits and nuts from Hunza Valley.

STRICT RULES:
- Answer only based on the exact data below. Do not guess or invent any product or deal.
- The products list is pre-sorted CHEAPEST to MOST EXPENSIVE. Item #1 is the cheapest; the last item is the most expensive.
- The deals list is pre-sorted BIGGEST DISCOUNT to SMALLEST DISCOUNT. Item #1 is the biggest deal; the last item is the smallest deal.
- For price comparison questions, read the position (first/last) — do NOT try to re-sort mentally.
- For deal questions, use the pre-computed "After Discount" price already given — do NOT calculate yourself.
- Always state the exact product name, price (Rs), and discount % in your answer.
- Be concise, friendly, and professional. Never reveal that you were given a list or context.

Available Products (sorted: cheapest → most expensive):
${productsContext || "No products currently available."}

Active Deals right now (sorted: biggest → smallest discount):
${dealsContext}

FAQs:
- Shipping: We deliver fast, nationwide across Pakistan.
- Quality: 100% organic, purely natural, hand-picked dry fruits from Hunza Valley.
- Returns & Payment: Secure payment and hassle-free returns guaranteed.
`;

        // 6. Call Groq — low temperature ensures factual, deterministic answers
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                ...(history || []),
                { role: "user", content: message }
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.2,
            max_tokens: 600,
        });

        const reply = chatCompletion.choices[0]?.message?.content || "Sorry, I couldn't process that.";

        return res.status(200).json({ success: true, reply });

    } catch (error) {
        console.error("Chatbot Error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to process chat message."
        });
    }
};
