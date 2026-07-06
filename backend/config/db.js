import mongoose from "mongoose";

const connectDb = async()=>{
    try {
        await mongoose.connect(process.env.MONGODB_URL);
        console.log("Database Connected successfully");
    } catch (error) {
         
    console.error("FULL ERROR:");
    console.error(error);
}
        
    }

 

export default connectDb