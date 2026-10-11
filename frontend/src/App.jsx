import { useState } from "react";
import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "./lib/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import BootScreen from "./components/BootScreen";

import Splash from "./pages/Splash";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import Home from "./pages/Home";
import Monitor from "./pages/Monitor";
import DataPage from "./pages/DataPage";
import PatientDetail from "./pages/PatientDetail";
import Report from "./pages/Report";
import ProfilePage from "./pages/ProfilePage";
import Docs from "./pages/Docs";
import About from "./pages/About";

export default function App() {
  const [booted, setBooted] = useState(false);

  return (
    <AuthProvider>
      {!booted && <BootScreen onDone={() => setBooted(true)} />}
      <Routes>
        <Route path="/" element={<Splash />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/docs" element={<Docs />} />
        <Route path="/about" element={<ProtectedRoute><About /></ProtectedRoute>} />

        <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
        <Route path="/monitor" element={<ProtectedRoute><Monitor /></ProtectedRoute>} />
        <Route path="/data" element={<ProtectedRoute><DataPage /></ProtectedRoute>} />
        <Route path="/data/:id" element={<ProtectedRoute><PatientDetail /></ProtectedRoute>} />
        <Route path="/report" element={<ProtectedRoute><Report /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      </Routes>
    </AuthProvider>
  );
}
