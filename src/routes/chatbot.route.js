import { Router } from "express";
import { handleChatMessage } from "../controllers/chatbot.controller.js";

export const chatbotRoute = Router();

// Endpoint for sending messages to the chatbot. Open to public.
chatbotRoute.post("/chat", handleChatMessage);
