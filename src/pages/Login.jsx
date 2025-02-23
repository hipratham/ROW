import React, { useState } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Link,
  Alert,
  CircularProgress,
  InputAdornment,
  FormHelperText,
} from '@mui/material';
import {
  Person as PersonIcon,
  Email as EmailIcon,
  Home as HomeIcon,
  Phone as PhoneIcon,
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

const Login = () => {
  const navigate = useNavigate();
  const { login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [touched, setTouched] = useState({});
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    phone: '',
    userType: '',
    address: '',
    confirmPassword: ''
  });

  const handleBlur = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const getHelperText = (field) => {
    if (!touched[field]) return '';
    
    switch (field) {
      case 'email':
        if (!formData.email) return 'Email is required';
        if (!/\S+@\S+\.\S+/.test(formData.email)) return 'Invalid email address';
        break;
      case 'password':
        if (!formData.password) return 'Password is required';
        if (formData.password.length < 6) return 'Password must be at least 6 characters';
        break;
      case 'confirmPassword':
        if (!formData.confirmPassword) return 'Please confirm your password';
        if (formData.password !== formData.confirmPassword) return 'Passwords do not match';
        break;
      case 'name':
        if (!formData.name) return 'Name is required';
        break;
      case 'phone':
        if (!formData.phone) return 'Phone number is required';
        if (!/^\d{10}$/.test(formData.phone)) return 'Please enter a valid 10-digit phone number';
        break;
      case 'userType':
        if (!formData.userType) return 'User type is required';
        break;
      case 'address':
        if (!formData.address) return 'Address is required';
        break;
      default:
        return '';
    }
    return '';
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'phone') {
      // Only allow numbers and limit to 10 digits
      const phoneValue = value.replace(/[^0-9]/g, '').slice(0, 10);
      setFormData(prev => ({
        ...prev,
        [name]: phoneValue
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Validate email and password for login
    if (isLogin) {
      if (!formData.email || !formData.password) {
        setError('Please enter both email and password');
        return;
      }
      
      setLoading(true);
      try {
        await login(formData.email, formData.password);
        // Navigation will be handled by the login function
      } catch (error) {
        console.error('Login error:', error);
        setError(error.message);
        toast.error(error.message);
      } finally {
        setLoading(false);
      }
      return;
    }

    // Handle registration
    setLoading(true);
    try {
      // Set all fields as touched for validation
      const allFields = ['email', 'password', 'confirmPassword', 'name', 'phone', 'userType', 'address'];
      const newTouched = {};
      allFields.forEach(field => newTouched[field] = true);
      setTouched(newTouched);

      // Check for validation errors
      for (const field of allFields) {
        const errorText = getHelperText(field);
        if (errorText) {
          setError(errorText);
          setLoading(false);
          return;
        }
      }

      // Call register with correct parameter structure
      await register(
        formData.email,
        formData.password,
        formData.name,
        formData.userType,
        formData.phone
      );

      toast.success('Account created successfully!');
      // Navigate to appropriate dashboard
      const dashboardPath = formData.userType === 'dealer' ? '/dealer-dashboard' : '/retailer-dashboard';
      navigate(dashboardPath);
    } catch (error) {
      console.error('Registration error:', error);
      
      if (error.code === 'auth/email-already-in-use') {
        toast.info('This email is already registered. Try logging in instead.');
        setTimeout(() => {
          setIsLogin(true);
          setFormData(prev => ({
            ...prev,
            password: '',
            confirmPassword: ''
          }));
          setError('');
        }, 1500);
      } else {
        setError(error.message || 'Failed to create account');
        toast.error(error.message || 'Failed to create account');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: 4,
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <Typography component="h1" variant="h5" gutterBottom>
            {isLogin ? 'Sign In' : 'Create Account'}
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2, width: '100%' }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1, width: '100%' }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              autoComplete="email"
              autoFocus
              value={formData.email}
              onChange={handleChange}
              onBlur={() => handleBlur('email')}
              error={touched.email && !!getHelperText('email')}
              helperText={touched.email && getHelperText('email')}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailIcon />
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type="password"
              id="password"
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              value={formData.password}
              onChange={handleChange}
              onBlur={() => handleBlur('password')}
              error={touched.password && !!getHelperText('password')}
              helperText={touched.password && getHelperText('password')}
            />

            {!isLogin && (
              <>
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  name="confirmPassword"
                  label="Confirm Password"
                  type="password"
                  id="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  onBlur={() => handleBlur('confirmPassword')}
                  error={touched.confirmPassword && !!getHelperText('confirmPassword')}
                  helperText={touched.confirmPassword && getHelperText('confirmPassword')}
                />

                <TextField
                  margin="normal"
                  required
                  fullWidth
                  name="name"
                  label="Full Name"
                  id="name"
                  value={formData.name}
                  onChange={handleChange}
                  onBlur={() => handleBlur('name')}
                  error={touched.name && !!getHelperText('name')}
                  helperText={touched.name && getHelperText('name')}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonIcon />
                      </InputAdornment>
                    ),
                  }}
                />

                <TextField
                  margin="normal"
                  required
                  fullWidth
                  name="phone"
                  label="Phone Number"
                  id="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  onBlur={() => handleBlur('phone')}
                  error={touched.phone && !!getHelperText('phone')}
                  helperText={touched.phone && getHelperText('phone')}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PhoneIcon />
                      </InputAdornment>
                    ),
                  }}
                />

                <FormControl 
                  fullWidth 
                  required
                  margin="normal"
                  error={touched.userType && !!getHelperText('userType')}
                >
                  <InputLabel id="user-type-label">User Type</InputLabel>
                  <Select
                    labelId="user-type-label"
                    id="userType"
                    name="userType"
                    value={formData.userType}
                    onChange={handleChange}
                    onBlur={() => handleBlur('userType')}
                    label="User Type"
                  >
                    <MenuItem value="dealer">Dealer</MenuItem>
                    <MenuItem value="retailer">Retailer</MenuItem>
                  </Select>
                  {touched.userType && getHelperText('userType') && (
                    <FormHelperText error>{getHelperText('userType')}</FormHelperText>
                  )}
                </FormControl>

                <TextField
                  margin="normal"
                  required
                  fullWidth
                  name="address"
                  label="Address"
                  id="address"
                  value={formData.address}
                  onChange={handleChange}
                  onBlur={() => handleBlur('address')}
                  error={touched.address && !!getHelperText('address')}
                  helperText={touched.address && getHelperText('address')}
                  multiline
                  rows={2}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <HomeIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              </>
            )}

            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{
                mt: 3,
                mb: 2,
                py: 1.5,
                background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                '&:hover': {
                  background: 'linear-gradient(45deg, #1976D2 30%, #1EA2D4 90%)',
                },
                position: 'relative'
              }}
              disabled={loading}
            >
              {loading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                isLogin ? 'Sign In' : 'Create Account'
              )}
            </Button>

            <Box sx={{ textAlign: 'center' }}>
              <Link
                component="button"
                variant="body2"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError('');
                  setTouched({});
                  setFormData({
                    email: '',
                    password: '',
                    name: '',
                    phone: '',
                    userType: '',
                    address: '',
                    confirmPassword: ''
                  });
                }}
                sx={{
                  textDecoration: 'none',
                  color: '#2196F3',
                  '&:hover': {
                    color: '#1976D2',
                  }
                }}
              >
                {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
              </Link>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default Login;
