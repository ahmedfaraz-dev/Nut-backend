import dotenv from 'dotenv';
dotenv.config({ path: '/home/ahmed-faraz/Desktop/nuts-copy/ecomerce-api/.env' });
import mongoose from 'mongoose';
import { Deal } from './src/models/deals.model.js';

async function test() {
  await mongoose.connect(process.env.MONGO_URI);

  const now = new Date();
  console.log("Current time (now):", now);

  const allDeals = await Deal.find({});
  console.log("All deals:", allDeals.map(d => ({
    _id: d._id,
    discount: d.discount,
    startDate: d.startDate,
    endDate: d.endDate,
    isStartLteNow: d.startDate <= now,
    isEndGtNow: d.endDate > now,
  })));

  const activeDeals = await Deal.find({
    startDate: { $lte: now },
    endDate: { $gt: now },
  }).populate("product", "name price isActive");
  console.log("Active deals (Chatbot query matches):", activeDeals.length);
  activeDeals.forEach(d => console.log(`- Deal ID: ${d._id}, Discount: ${d.discount}%, Product:`, d.product));

  process.exit(0);
}

test();
