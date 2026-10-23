import express from "express";
//import mongoose from "mongoose";
import connectDb from "./lib/db.js";
import dotenv from "dotenv";
import User from "./model/user.model.js"
import Redis from "ioredis";


dotenv.config();

const app = express();

const redis = new Redis(process.env.REDIS_URL);

app.use(express.json());
const PORT = process.env.PORT || 5000;

app.get("/", (req, res) => {
    res.send("Backend server is running!");
});


//create a new user
app.post("/create", async (req, res) => {

    const { name, email, password } = req.body
    const user = await User.create({
        name, email, password
    })

    return res.json(user);
})

// get user without redis 
app.get("/get",async (req, res) => {

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




app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  connectDb();
});

