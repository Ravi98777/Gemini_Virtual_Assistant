// import genToken from "../config/token.js"
// import User from "../modals/user.models.js"
// import bcrypt from "bcryptjs"


// export const signup = async(req,res)=>{
//     try {
//         const {name,email,password} = req.body

//         const existEmail = await User.findOne({email})
//         if(existEmail) {
//             return res.status(400).json({message : "this email already exist"})
//         }

//         if(password.length < 6){
//             return res.status(400).json({message : "Password must be greater than 6"})
//         }

//         const hashPassword = await bcrypt.hash(password,10)

//         const user = await User.create({
//             name,email,password : hashPassword
//         })

//         console.log("User created successfully")

//         const token = await genToken(user._id)

//         res.cookie("token" ,token,{
//             httpOnly : true,
//             maxAge : 7*24*1000*60*60,
//             sameSite : "strict",
//             secure : false
//         })
//         return res.status(201).json(user)
        
//     } catch (error) {
//         return res.status(400).json({message : `sign up error ${error}`})
        
//     }
// }



// export const login =async(req,res)=>{
//     try {
//         const {email,password} = req.body

//         const user = await User.findOne({email})
//         if(!user) {
//             return res.status(400).json({message : "this email is not regitered"})
//         }

//        const correct_password = await bcrypt.compare(password, user.password)
//        if(!correct_password){
//             return res.status(400).json({message : "incorrect password"})
//        }



      
//         console.log("User loggedIn successfully")

//         const token = await genToken(user._id)

//         res.cookie("token" ,token,{
//             httpOnly : true,
//             maxAge : 7*24*1000*60*60,
//             sameSite : "strict",
//             secure : false
//         })
//         return res.status(200).json(user)
        
//     } catch (error) {
//         return res.status(400).json({message : `LoginIn error ${error}`})
        
//     }
// }


// export const logout = async(req,res)=>{
//     try {
//          res.clearCookie("token")
//         return res.status(200).json({message : "Logged Out successfully"})

//     } catch (error) {
//        return res.status(400).json({message : `  logout error ${error}`})        
//     }
// }









import genToken from "../config/token.js";
import User from "../modals/user.models.js";
import bcrypt from "bcryptjs";

const cookieOptions = {
  httpOnly: true,
  maxAge: 7 * 24 * 60 * 60 * 1000,
  sameSite: "strict",
  secure: process.env.NODE_ENV === "production",
};

export const signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name?.trim() || !email?.trim() || !password) {
      return res.status(400).json({
        message: "Name, email and password are required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must contain at least 6 characters",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(409).json({
        message: "This email already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
    });

    const token = await genToken(user._id);

    res.cookie("token", token, cookieOptions);

    return res.status(201).json({
      message: "User created successfully",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Signup error:", error);

    return res.status(500).json({
      message: "Unable to create user",
    });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email?.trim() || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const isPasswordCorrect = await bcrypt.compare(
      password,
      user.password
    );

    if (!isPasswordCorrect) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const token = await genToken(user._id);

    res.cookie("token", token, cookieOptions);

    return res.status(200).json({
      message: "Logged in successfully",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      message: "Unable to log in",
    });
  }
};

export const logout = (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  });

  return res.status(200).json({
    message: "Logged out successfully",
  });
};