import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import {
  Box,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Card,
  CardContent,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  Chip,
  CircularProgress,
  AppBar,
  Toolbar,
  InputAdornment
} from '@mui/material';
import {
  Store as StoreIcon,
  Phone as PhoneIcon,
  Logout as LogoutIcon,
  LinkOff as LinkOffIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import {
  ref, set, get, update, serverTimestamp
} from 'firebase/database';
import { rtdb } from '../config/firebase';
import { toast } from 'react-toastify';

export default function RetailerDashboard() {
  const { userProfile, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dealerPhone, setDealerPhone] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [dealerInfo, setDealerInfo] = useState(null);
  const [dealerProducts, setDealerProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [orderQuantity, setOrderQuantity] = useState(1);
  const [orderDialog, setOrderDialog] = useState(false);
  const [orders, setOrders] = useState([]);
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Check authentication and role
  useEffect(() => {
    if (!userProfile) {
      setError('Please log in to continue');
      return;
    }
    if (userProfile.role !== 'retailer') {
      setError('Access denied. This dashboard is for retailers only.');
      return;
    }
    loadInitialData();
  }, [userProfile]);

  // First, let's get the connected dealer's info
  const loadConnectedDealer = async () => {
    if (!userProfile?.uid) return null;
    try {
      const connectedDealerRef = ref(rtdb, `retailers/${userProfile.uid}/connectedDealer`);
      const snapshot = await get(connectedDealerRef);
      if (snapshot.exists()) {
        const dealerId = snapshot.val();
        const dealerRef = ref(rtdb, `users/${dealerId}`);
        const dealerSnap = await get(dealerRef);
        if (dealerSnap.exists()) {
          return { id: dealerId, ...dealerSnap.val() };
        }
      }
      return null;
    } catch (error) {
      console.error('Error loading connected dealer:', error);
      return null;
    }
  };

  const loadOrders = async () => {
    try {
      const ordersRef = ref(rtdb, `retailers/${userProfile.uid}/orders`);
      const ordersSnap = await get(ordersRef);

      if (ordersSnap.exists()) {
        const ordersData = ordersSnap.val();
        const ordersWithInfo = await Promise.all(
          Object.entries(ordersData).map(async ([orderId, order]) => {
            // Get dealer info directly from the order's dealerId
            let dealerName = 'Unknown Dealer';
            let dealerPhone = 'N/A';

            if (order.dealerId) {
              // Try to get dealer info from users collection
              const dealerRef = ref(rtdb, `users/${order.dealerId}`);
              const dealerSnap = await get(dealerRef);
              
              if (dealerSnap.exists()) {
                const dealerData = dealerSnap.val();
                dealerName = dealerData.name || dealerData.businessName || 'Unknown Dealer';
                dealerPhone = dealerData.phone || order.dealerId;
              }
            }

            const timestamp = order.orderedAt || order.timestamp || Date.now();

            return {
              id: orderId,
              ...order,
              dealerName,
              dealerPhone,
              orderedAt: timestamp
            };
          })
        );

        // Sort orders by date, newest first
        const sortedOrders = ordersWithInfo.sort((a, b) => 
          b.orderedAt - a.orderedAt
        );

        setOrders(sortedOrders);
      } else {
        setOrders([]);
      }
    } catch (error) {
      console.error('Error loading orders:', error);
      toast.error('Failed to load orders');
    }
  };

  // Load initial data
  const loadInitialData = async () => {
    if (!userProfile?.uid) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Check if retailer is connected to a dealer
      const retailerRef = ref(rtdb, `retailers/${userProfile.uid}/connectedDealer`);
      const retailerSnap = await get(retailerRef);
      
      if (retailerSnap.exists()) {
        const connectedDealer = retailerSnap.val();
        
        // Fetch complete dealer information
        const dealerRef = ref(rtdb, `users/${connectedDealer.dealerId}`);
        const dealerSnap = await get(dealerRef);
        
        if (dealerSnap.exists()) {
          const dealerData = dealerSnap.val();
          setDealerInfo({
            dealerId: dealerData.uid,
            dealerName: dealerData.name,
            phone: dealerData.phone,
            address: dealerData.address || 'Address not provided'
          });
          
          await Promise.all([
            loadDealerProducts(dealerData.uid),
            loadOrders()
          ]);
        }
      }
    } catch (error) {
      console.error('Error loading initial data:', error);
      setError('Failed to load dashboard data. Please try refreshing the page.');
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadDealerProducts = async (dealerId) => {
    try {
      setProductsLoading(true);
      const productsRef = ref(rtdb, `dealers/${dealerId}/products`);
      const productsSnap = await get(productsRef);
      
      if (productsSnap.exists()) {
        const productsData = Object.entries(productsSnap.val()).map(([id, product]) => ({
          id,
          ...product
        }));
        setDealerProducts(productsData);
      } else {
        setDealerProducts([]);
      }
    } catch (error) {
      console.error('Error loading dealer products:', error);
      toast.error('Failed to load products');
    } finally {
      setProductsLoading(false);
    }
  };

  const handleDeleteOrder = async (orderId, dealerId) => {
    try {
      // Remove from both retailer and dealer
      const updates = {
        [`retailers/${userProfile.uid}/orders/${orderId}`]: null,
        [`dealers/${dealerId}/orders/${orderId}`]: null
      };
      
      await update(ref(rtdb), updates);
      
      // Update local state
      setOrders(orders.filter(order => order.id !== orderId));
      toast.success('Order deleted successfully');
      setDeleteConfirmDialog(false);
      setSelectedOrder(null);
    } catch (error) {
      console.error('Error deleting order:', error);
      toast.error('Failed to delete order');
    }
  };

  const handleConnectDealer = async () => {
    if (!dealerPhone.trim()) {
      toast.error('Please enter a dealer phone number');
      return;
    }

    try {
      setConnecting(true);
      setError(null);
      
      // Find dealer by phone number
      const dealersRef = ref(rtdb, 'users');
      const dealersSnap = await get(dealersRef);
      
      if (!dealersSnap.exists()) {
        throw new Error('No dealers found');
      }

      const dealers = Object.entries(dealersSnap.val());
      const dealer = dealers.find(([_, data]) => 
        data.phone === dealerPhone && data.role === 'dealer'
      );

      if (!dealer) {
        throw new Error('Dealer not found');
      }

      const [dealerId, dealerData] = dealer;

      // Update retailer's connected dealer
      const retailerRef = ref(rtdb, `retailers/${userProfile.uid}/connectedDealer`);
      await set(retailerRef, {
        dealerId,
        dealerName: dealerData.name,
        connectedAt: serverTimestamp()
      });

      setDealerInfo({
        dealerId,
        dealerName: dealerData.name,
        phone: dealerData.phone,
        address: dealerData.address || 'Address not provided'
      });

      await loadDealerProducts(dealerId);
      toast.success(`Connected to dealer: ${dealerData.name}`);
      setDealerPhone('');
    } catch (error) {
      console.error('Error connecting to dealer:', error);
      setError(error.message === 'Dealer not found' 
        ? 'No dealer found with this phone number' 
        : 'Failed to connect to dealer. Please try again.');
      toast.error(error.message);
    } finally {
      setConnecting(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (!selectedProduct || !orderQuantity) {
      toast.error('Please select a product and quantity');
      return;
    }

    try {
      const orderId = Date.now().toString();
      const orderData = {
        id: orderId,
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        quantity: orderQuantity,
        price: selectedProduct.price,
        total: selectedProduct.price * orderQuantity,
        status: 'pending',
        dealerId: dealerInfo.dealerId,
        dealerName: dealerInfo.dealerName,
        retailerId: userProfile.uid,
        retailerName: userProfile.name,
        orderedAt: serverTimestamp()
      };

      // Add to main orders collection
      await set(ref(rtdb, `orders/${orderId}`), orderData);
      
      // Add to retailer's orders
      await set(ref(rtdb, `retailers/${userProfile.uid}/orders/${orderId}`), orderData);
      
      // Add to dealer's orders
      await set(ref(rtdb, `dealers/${dealerInfo.dealerId}/orders/${orderId}`), orderData);

      setOrders([...orders, orderData]);
      setOrderDialog(false);
      setOrderQuantity(1);
      setSelectedProduct(null);
      
      toast.success('Order placed successfully');
    } catch (error) {
      console.error('Error placing order:', error);
      toast.error('Failed to place order');
    }
  };

  const handleDisconnectDealer = async () => {
    try {
      await set(ref(rtdb, `retailers/${userProfile.uid}/connectedDealer`), null);
      setDealerInfo(null);
      setDealerProducts([]);
      toast.success('Disconnected from dealer');
    } catch (error) {
      console.error('Error disconnecting from dealer:', error);
      toast.error('Failed to disconnect from dealer');
    }
  };

  // Render loading state
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  // Render error state
  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        {error === 'Please log in to continue' && (
          <Button variant="contained" color="primary" onClick={() => navigate('/login')}>
            Go to Login
          </Button>
        )}
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <StoreIcon sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Retailer Dashboard
          </Typography>
          <Button color="inherit" onClick={logout} startIcon={<LogoutIcon />}>
            Logout
          </Button>
        </Toolbar>
      </AppBar>

      <Box sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          Welcome, {userProfile?.name}
        </Typography>

        {loading ? (
          <CircularProgress />
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : (
          <>
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Connected Dealer Information
                </Typography>
                {dealerInfo ? (
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <Typography variant="body1">
                        <strong>Name:</strong> {dealerInfo.dealerName}
                      </Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="body1">
                        <strong>Phone:</strong> {dealerInfo.phone}
                      </Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="body1">
                        <strong>Address:</strong> {dealerInfo.address}
                      </Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Button
                        variant="outlined"
                        color="error"
                        startIcon={<LinkOffIcon />}
                        onClick={handleDisconnectDealer}
                      >
                        Disconnect Dealer
                      </Button>
                    </Grid>
                  </Grid>
                ) : (
                  <Box sx={{ mt: 2 }}>
                    <Typography color="text.secondary">
                      No dealer connected. Connect with a dealer to start ordering products.
                    </Typography>
                    <TextField
                      fullWidth
                      label="Dealer Phone Number"
                      variant="outlined"
                      value={dealerPhone}
                      onChange={(e) => setDealerPhone(e.target.value)}
                      sx={{ mt: 2 }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <PhoneIcon />
                          </InputAdornment>
                        ),
                      }}
                    />
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={handleConnectDealer}
                      disabled={connecting || !dealerPhone}
                      sx={{ mt: 2 }}
                    >
                      {connecting ? <CircularProgress size={24} /> : 'Connect to Dealer'}
                    </Button>
                  </Box>
                )}
              </CardContent>
            </Card>

            {dealerInfo && (
              <>
                <Box sx={{ mb: 4 }}>
                  <Typography variant="h5" gutterBottom>
                    Dealer Products
                  </Typography>
                  {productsLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                      <CircularProgress />
                    </Box>
                  ) : dealerProducts.length > 0 ? (
                    <Grid container spacing={3}>
                      {dealerProducts.map((product) => (
                        <Grid item xs={12} sm={6} md={4} key={product.id}>
                          <Card>
                            <CardContent>
                              <Typography variant="h6">{product.name}</Typography>
                              <Typography color="textSecondary">{product.description}</Typography>
                              <Typography>Price: Rs.{product.price}</Typography>
                              <Typography>Stock: {product.stock}</Typography>
                              <Button
                                variant="contained"
                                color="primary"
                                sx={{ mt: 2 }}
                                onClick={() => {
                                  setSelectedProduct(product);
                                  setOrderDialog(true);
                                }}
                                disabled={!product.stock || product.stock < 1}
                                fullWidth
                              >
                                Order
                              </Button>
                            </CardContent>
                          </Card>
                        </Grid>
                      ))}
                    </Grid>
                  ) : (
                    <Alert severity="info">
                      No products available from this dealer. Please check back later.
                    </Alert>
                  )}
                </Box>

                <Box sx={{ mt: 4 }}>
                  <Typography variant="h5" gutterBottom>
                    My Orders
                  </Typography>
                  {orders.length > 0 ? (
                    <TableContainer component={Paper}>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>Order ID</TableCell>
                            <TableCell>Product</TableCell>
                            <TableCell>Dealer Name</TableCell>
                            <TableCell>Dealer Phone</TableCell>
                            <TableCell>Quantity</TableCell>
                            <TableCell>Total (Rs.)</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Ordered At</TableCell>
                            <TableCell>Actions</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {orders.map((order) => (
                            <TableRow key={order.id}>
                              <TableCell>{order.id}</TableCell>
                              <TableCell>{order.productName}</TableCell>
                              <TableCell>{order.dealerName}</TableCell>
                              <TableCell>{order.dealerPhone}</TableCell>
                              <TableCell>{order.quantity}</TableCell>
                              <TableCell>Rs. {order.total}</TableCell>
                              <TableCell>
                                <Chip
                                  label={order.status || 'pending'}
                                  color={
                                    order.status === 'completed'
                                      ? 'success'
                                      : order.status === 'pending'
                                      ? 'warning'
                                      : order.status === 'declined'
                                      ? 'error'
                                      : 'default'
                                  }
                                />
                              </TableCell>
                              <TableCell>
                                {order.orderedAt ? new Date(order.orderedAt).toLocaleDateString() : 'N/A'}
                              </TableCell>
                              <TableCell>
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    color="error"
                                    onClick={() => {
                                      setSelectedOrder(order);
                                      setDeleteConfirmDialog(true);
                                    }}
                                    startIcon={<DeleteIcon />}
                                  >
                                    Delete
                                  </Button>
                                </Box>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  ) : (
                    <Alert severity="info">No orders yet</Alert>
                  )}
                </Box>
              </>
            )}
          </>
        )}
      </Box>

      {/* Order Dialog */}
      <Dialog open={orderDialog} onClose={() => setOrderDialog(false)}>
        <DialogTitle>Place Order</DialogTitle>
        <DialogContent>
          {selectedProduct && (
            <>
              <Typography variant="h6">{selectedProduct.name}</Typography>
              <Typography>Price: Rs.{selectedProduct.price}</Typography>
              <Typography>Available Stock: {selectedProduct.stock}</Typography>
              <TextField
                type="number"
                label="Quantity"
                value={orderQuantity}
                onChange={(e) => setOrderQuantity(Math.max(1, Math.min(selectedProduct.stock, parseInt(e.target.value) || 0)))}
                fullWidth
                margin="normal"
                inputProps={{ min: 1, max: selectedProduct.stock }}
              />
              <Typography variant="h6" sx={{ mt: 2 }}>
                Total: Rs.{(selectedProduct.price * orderQuantity).toFixed(2)}
              </Typography>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOrderDialog(false)}>Cancel</Button>
          <Button onClick={handlePlaceOrder} variant="contained" color="primary">
            Place Order
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmDialog}
        onClose={() => setDeleteConfirmDialog(false)}
      >
        <DialogTitle>Delete Order</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this order? This action cannot be undone.
            {selectedOrder?.status === 'completed' && (
              <Box sx={{ mt: 2, color: 'warning.main' }}>
                <strong>Note:</strong> You are deleting a completed order.
              </Box>
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmDialog(false)}>Cancel</Button>
          <Button 
            onClick={() => handleDeleteOrder(selectedOrder?.id, selectedOrder?.dealerId)} 
            color="error"
            variant="contained"
            startIcon={<DeleteIcon />}
          >
            Delete Order
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
