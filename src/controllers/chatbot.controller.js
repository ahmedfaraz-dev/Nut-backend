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

        // 1. Fetch up-to-date Context Data from Database
        // Get available products
        const products = await Product.find({ isActive: true })
            .select("name price discription stock -_id")
            .limit(20);

        // Get active deals
        const activeDeals = await Deal.find({ endDate: { $gt: new Date() } })
            .populate("product", "name")
            .select("discount endDate product");

        // 2. Format context for the prompt
        const productsContext = products.map(p => `- ${p.name}: Rs${p.price} (Stock: ${p.stock > 0 ? "In Stock" : "Out of Stock"}) - Description: ${p.discription}`).join("\n");
        const dealsContext = activeDeals.map(d => `- ${d.discount}% off on ${d.product?.name} until ${new Date(d.endDate).toLocaleDateString()}`).join("\n");

        // 3. Define the AI System Prompt with DB Context
        const systemPrompt = `You are a helpful customer support assistant for "Aura-Nuts", an e-commerce store selling premium dry fruits and nuts from Hunza Valley.
Answer the user's questions strictly based on the following available products and deals.
If they ask about a product not in this list, politely let them know we don't have it right now.
Be concise, polite, and helpful. Do not mention that you have a "list" or "context given to you". Keep your response friendly and professional.

Available Products:
${productsContext || "No products currently available."}

Active Deals:
${dealsContext || "No active deals at the moment."}

Common FAQs:
- Shipping: We deliver fast and nationwide.
- Quality: We offer 100% organic, purely natural, hand-picked dry fruits straight from the heart of Hunza Valley.
- Returns and Payment: Secure payment and returns are handled by our trusted payment gateways.
`;

        // 4. Call Groq completion API
        const chatCompletion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                ...(history || []), // Injects previous conversation history if any
                { role: "user", content: message }
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.5,
            max_tokens: 500,
        });

        const reply = chatCompletion.choices[0]?.message?.content || "Sorry, I couldn't process that.";

        return res.status(200).json({
            success: true,
            reply
        });

    } catch (error) {
        console.error("Chatbot Error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to process chat message."
        });
    }
};
