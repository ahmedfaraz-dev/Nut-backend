import mongoose, {Schema, model} from "mongoose";
 
const orderItemSchema = new Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true
    },
    name: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    quantity: {
        type: Number,
        required: true
    },
    image: {
        type: String,
        required: false
    }
    
},{_id: false });



const orderSchema = new Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    customerInfo: {
        name: {type: String, required: true},
        email: {type: String, required: true},
        phone: {type: String, required: true},
    },
    items: {
        type: [orderItemSchema],
        validate: [
            arr => arr.length > 0,
            "Order must have at least one item"
        ]
    },
    totalAmount: {
        type: Number,
        required: true
    },
    currency: {
        type: String,
        default: "pkr",
        enum: ["usd", "eur", "gbp", "inr", "pkr"]
    },
    addressSnapshot: {
        address: {type: String, required: true},
        city: {type: String, required: true},
        country: {type: String, required: true},
        zip:{type: String, required: true}
    },
    stripePaymentIntentId: {
        type: String,
        required: true,
        unique: true
    },
    orderStatus: {
        type: String,
        enum:["pending", "confirmed", "shipped", "delivered", "cancelled"],
        default: "pending"
    },
    paymentStatus:{
        type: String,
        enum: ["pending", "paid", "failed", "refunded"],
        default: "pending"
    }

},{timestamps:true})

orderSchema.index({user: 1});
orderSchema.index({orderStatus: 1, paymentStatus: 1});

const Order = model("Order", orderSchema);


export default Order;




