import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth.jsx';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import DealerDashboard from './pages/DealerDashboard.jsx';
import RetailerDashboard from './pages/RetailerDashboard.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import { ThemeProvider, createTheme } from '@mui/material';
import { useEffect } from 'react';
import { fixUserProfiles } from './utils/fixUserProfiles';
import { Toaster } from 'react-hot-toast';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
      light: '#42a5f5',
      dark: '#1565c0'
    },
    secondary: {
      main: '#9c27b0',
      light: '#ba68c8',
      dark: '#7b1fa2'
    }
  }
});

function App() {
  useEffect(() => {
    // Fix user profiles when app starts
    fixUserProfiles().catch(console.error);
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <Router>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/login" />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/dealer-dashboard/*"
              element={
                <ProtectedRoute userType="dealer">
                  <DealerDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/retailer-dashboard/*"
              element={
                <ProtectedRoute userType="retailer">
                  <RetailerDashboard />
                </ProtectedRoute>
              }
            />
            {/* Catch undefined dashboard and redirect to login */}
            <Route path="/undefined-dashboard" element={<Navigate to="/login" />} />
            {/* Catch all other routes and redirect to login */}
            <Route path="*" element={<Navigate to="/login" />} />
          </Routes>
          <ToastContainer
            position="top-right"
            autoClose={3000}
            hideProgressBar={false}
            newestOnTop
            closeOnClick
            rtl={false}
            pauseOnFocusLoss={false}
            draggable
            pauseOnHover={false}
            theme="colored"
            limit={3}
          />
          <Toaster position="top-right" />
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;
