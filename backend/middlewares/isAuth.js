// import jwt from "jsonwebtoken"

// const isAuth = async(req,res,next)=>{
//     try {
//         const token = req.cookie.token
//     if(!token) return res.status(400).json({message : "User token not found"})
        

//     const verifyToken = await jwt.verify(token,process.env.JWT_SECRET)
//     req.userId = verifyToken.userId
//     next()

//      } catch (error) {
//         console.log(error)    
//      return res.status(400).json({message : "isAuth error"})

//      }
// }

// export default isAuth


import jwt from "jsonwebtoken";

const isAuth = (req, res, next) => {
  try {
    const token = req.cookies?.token;

    if (!token) {
      return res.status(401).json({
        message: "Authentication required. Please log in again.",
      });
    }

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is not configured");
      return res.status(500).json({
        message: "Server authentication is not configured",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded.userId) {
      return res.status(401).json({
        message: "Invalid authentication token",
      });
    }

    req.userId = decoded.userId;
    next();
  } catch (error) {
    console.error("Authentication error:", error.message);

    return res.status(401).json({
      message: "Session expired or invalid. Please log in again.",
    });
  }
};

export default isAuth;
