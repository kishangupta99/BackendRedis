import express from "express";
//import mongoose from "mongoose";
import connectDb from "./lib/db.js";
import dotenv from "dotenv";
import User from "./model/user.model.js"
import Redis from "ioredis";
import ratelimiter from "./middleware/ratelimit.js";
import sendEmail from "./lib/sendEmail.js";
import emailQueue from "./queue.js";


dotenv.config();

const app = express();

export const redis = new Redis(process.env.REDIS_URL);

app.use(express.json());
const PORT = process.env.PORT || 5000;

app.get("/", (req, res) => {
    res.send(`"Backend server is running! System hangling is not an issue now." ${process.env.SERVER_NAME}`);
});


//create a new user
app.post("/create", async (req, res) => {

    const { name, email, password } = req.body
    await redis.del("users"); // Invalidate the cache when a new user is created
    const user = await User.create({
        name, email, password
    })

    await emailQueue.add("send-email", {email});

    return res.json(user);
})




// get user without redis 
app.get("/get",ratelimiter ,async (req, res) => {

    const user = await User.find({})

    return res.json(user)
})



// get user with redis
app.get("/get-redis", async (req, res) => {
    const cacheKey = "users";
    const cachedData = await redis.get(cacheKey);

    if (cachedData) {
        console.log("Fetching data from Redis cache");
        return res.json(JSON.parse(cachedData));
    }

    const users = await User.find({});
    await redis.set(cacheKey, JSON.stringify(users), "EX", 60); // Cache for 60 seconds

    console.log("Fetching data from MongoDB");
    return res.json(users);
});


// OTP sending using Redis
app.post("/send-otp", async (req, res) => {
    const { email } = req.body;

    // Generate a random 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store the OTP in Redis with a TTL of 5 minutes (300 seconds)
    await redis.set(`otp:${email}`, otp, "EX", 300);

    // In a real application, you would send the OTP to the user's email here
    console.log(`OTP for ${email}: ${otp}`); 
    return res.json({otp: otp, message: "OTP sent successfully" });

    // return res.json({ message: "OTP sent successfully" });
}); 


// OTP verification using Redis
app.post("/verify-otp", async (req, res) => {
    const { email, otp } = req.body;

    // Retrieve the OTP from Redis
    const storedOtp = await redis.get(`otp:${email}`);

    if (!storedOtp) {
        return res.status(400).json({ message: "OTP has expired or is invalid" });
    }

    if (storedOtp === otp) {
        // OTP is valid, delete it from Redis
        await redis.del(`otp:${email}`);
        return res.json({ message: "OTP verified successfully" });
    } else {
        return res.status(400).json({ message: "Invalid OTP" });
    }
});




app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  connectDb();
});

