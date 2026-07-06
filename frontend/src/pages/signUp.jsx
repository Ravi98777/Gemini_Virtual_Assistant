import React, { useState } from "react";
import bg from "../assets/authBg.png";
import { FaEye, FaEyeSlash } from "react-icons/fa6";
import {useNavigate } from "react-router-dom";
import { use } from "react";
import { useContext } from "react";
import { userDataContext } from "../context/UserContext";
import axios from "axios";

const SignUp = () => {


const navigate = useNavigate()
const [showPassword, setShowPassword] = useState(false);
const [name, setName] = useState("")
const [email, setEmail] = useState("")
const [password, setpassword] = useState("")
const [error, setError] = useState("")
const [loading, setLoading] = useState(false)

const {serverUrl,userData, setUserData} = useContext(userDataContext)

const handleSignUp = async(e)=>{
    e.preventDefault()
    setLoading(true)
    setError(" ")
    try {
        const result = await axios.post(`${serverUrl}/api/auth/signup`,{
            name,email,password
        },{withCredentials : true})
        setUserData(result.data)
        navigate("/customize")
        console.log(result)

        // result.status(200).json({message : "User Successfully registered"})
        
    } catch (error) {
        console.log(error)
        setUserData(null)
        setError(error.response.data.message)      
     
    }
        setLoading(false)  


}

  return (
    <div
      className="w-full h-screen bg-cover bg-center bg-no-repeat flex justify-center items-center"
      style={{ backgroundImage: `url(${bg})` }}
    >
      <form onSubmit={handleSignUp} className="w-[90%] max-w-md bg-[#00000035] backdrop-blur-lg border border-white/20 rounded-2xl shadow-2xl p-8 flex flex-col gap-5">
        <h1 className="text-3xl font-bold text-white text-center"  >
          Create Account
        </h1>

        <p className="text-gray-300 text-center text-sm">
          Register to continue
        </p>

        <input
          type="text"
          placeholder="Username"
          className="px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-300 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/40"
           required onChange={(e)=>setName(e.target.value)} 
           value={name}
        />

        <input
          type="email"
          placeholder="Email"
          className="px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-300 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/40"
          required onChange={(e)=>setEmail(e.target.value)} 
           value={email}
        />

        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            className="w-full px-4 py-3 pr-12 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-300 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/40"
          required onChange={(e)=>setpassword(e.target.value)} 
           value={password}
          />
            {error.length>1 && <p className="text-red-600 flex justify-center text-xl ">
                *{error}
            </p>}

          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-cyan-400 transition"
          >
            {showPassword ? (
              <FaEyeSlash size={18} />
            ) : (
              <FaEye size={18} />
            )}
          </button>
        </div>

        <button
          type="submit"
          className="py-3 rounded-lg bg-cyan-600 hover:bg-cyan-800 text-white font-semibold transition"
          disabled = {loading} 
        >
           {loading? "loading...":  "Register"}
         
        </button>

        <p className="text-center text-gray-300 text-sm">
          Already have an account?{" "}
          <span className="text-cyan-400 cursor-pointer hover:underline" onClick={()=>navigate("/signIn")}>
            Login
          </span>
        </p>
      </form>
    </div>
  );
};

export default SignUp;