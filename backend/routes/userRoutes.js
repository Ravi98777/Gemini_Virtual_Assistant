import express from "express"
import isAuth from "../middlewares/isAuth.js"
import {askToAssistant, clearAssistantHistory, getCurrentUser, updateAssistant} from "../controllers/user.controller.js"
import upload from "../middlewares/multer.js"

const userRouter = express.Router()

userRouter.get("/current",isAuth, getCurrentUser)
userRouter.post("/asktoassistant",isAuth,  askToAssistant)
userRouter.post("/update",isAuth,upload.single("assistantImage"), updateAssistant)
userRouter.delete("/history",isAuth, clearAssistantHistory)
export default userRouter
