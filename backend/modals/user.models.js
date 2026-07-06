import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name : {
        type : String,
        require : true
    },

    email : {
        type : String,
        require : true,
        unique : true
    },

    password : {
        type : String,
        require : true,
    },

    assistantName : {
        type : String         
    },

    assistantImage:{
        type : String
    },

    assistantVoice : {
        type : String,
        enum : ["male", "female"],
        default : "female"
    },

    preferredLanguage : {
        type : String,
        enum : ["en-US", "hi-IN"],
        default : "en-US"
    },

    history : [
        {type : mongoose.Schema.Types.Mixed}
    ]   

},{timestamps : true})

const User = mongoose.model("User",userSchema)
export default User
