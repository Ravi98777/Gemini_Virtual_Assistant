import React, { useContext } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import SignUp from "./pages/signUp.jsx";
import SignIn from "./pages/signIn.jsx";
import Home from "./pages/home.jsx";
import Customize from "./pages/customize.jsx";

import { userDataContext } from "./context/UserContext.jsx";

const App = () => {
  const { userData } = useContext(userDataContext);

  return (
    <Routes>
      {/* Home Route */}
      <Route
        path="/"
        element={
          !userData ? (
            <Navigate to="/signin" />
          ) : userData.assistantImage && userData.assistantName ? (
            <Home />
          ) : (
            <Navigate to="/customize" />
          )
        }
      />

      {/* Sign Up */}
      <Route
        path="/signup"
        element={!userData ? <SignUp /> : <Navigate to="/" />}
      />

      
      <Route
        path="/signin"
        element={!userData ? <SignIn /> : <Navigate to="/" />}
      />

      {/* Customize Assistant */}
      <Route
        path="/customize"
        element={userData ? <Customize /> : <Navigate to="/signin" />}
      />

      

    </Routes>
  );
};

export default App;