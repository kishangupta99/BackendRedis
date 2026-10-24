import {redis} from "../index.js";

const ratelimiter = async(req, res, next) =>{
    const ip = req.ip;
    const key = `ratelimit:${ip}`;
    const requestCount = await redis.incr(key);
    if(requestCount === 1){
        await redis.expire(key, 60);
    }
    if(requestCount > 5){
        return res.status(429).json({message: "Too many requests happens in a minute, please try again later"});
    }

    next();

}

export default ratelimiter;

