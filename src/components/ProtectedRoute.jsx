import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import { CircularProgress, Container } from '@mui/material';

const ProtectedRoute = ({ children, userType }) => {
  const { user, userProfile, loading } = useAuth();

  if (loading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (!user || !userProfile) {
    return <Navigate to="/login" />;
  }

  if (userProfile.role !== userType) {
    return <Navigate to={`/${userProfile.role}-dashboard`} />;
  }

  return children;
};

export default ProtectedRoute;
