import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  AppBar,
  Toolbar,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Alert,
  Tooltip,
  CircularProgress,
  Snackbar,
} from '@mui/material';
import {
  Add as AddIcon,
  Store as StoreIcon,
  Phone as PhoneIcon,
  Logout as LogoutIcon,
  ContentCopy as ContentCopyIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  ExitToApp as ExitToAppIcon,
  People as PeopleIcon,
  LocalShipping as ShippingIcon,
  ArrowForward as ArrowForwardIcon
} from '@mui/icons-material';
import { ref, set, remove, get, update, serverTimestamp } from 'firebase/database';
import { rtdb } from '../config/firebase';
import { toast } from 'react-toastify';

const DealerDashboard = () => {
  const { userProfile, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [retailers, setRetailers] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderStatusDialog, setOrderStatusDialog] = useState(false);
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    price: '',
    stock: ''
  });
  const [productDialog, setProductDialog] = useState(false);

  // Load initial data
  useEffect(() => {
    if (!userProfile) {
      setError('Please log in to continue');
      return;
    }
    if (userProfile.role !== 'dealer') {
      setError('Access denied. This dashboard is for dealers only.');
      return;
    }
    loadInitialData();
  }, [userProfile]);

  const loadInitialData = async () => {
    if (!userProfile?.uid) return;
    
    try {
      setLoading(true);
      setError(null);
      
      await Promise.all([
        loadProducts(),
        loadOrders(),
        loadRetailers()
      ]);
    } catch (error) {
      console.error('Error loading initial data:', error);
      setError('Failed to load dashboard data');
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadRetailers = async () => {
    try {
      const retailersRef = ref(rtdb, `dealers/${userProfile.uid}/connectedRetailers`);
      const snapshot = await get(retailersRef);
      
      if (snapshot.exists()) {
        const retailersData = snapshot.val();
        const retailersArray = Object.entries(retailersData).map(([id, retailer]) => ({
          id,
          ...retailer
        }));
        setRetailers(retailersArray);
      } else {
        setRetailers([]);
      }
    } catch (error) {
      console.error('Error loading retailers:', error);
      toast.error('Failed to load retailers');
    }
  };

  const loadOrders = async () => {
    try {
      const ordersRef = ref(rtdb, `dealers/${userProfile.uid}/orders`);
      const snapshot = await get(ordersRef);
      
      if (snapshot.exists()) {
        const ordersData = snapshot.val();
        const ordersArray = await Promise.all(
          Object.entries(ordersData).map(async ([orderId, order]) => {
            // Get retailer info
            const retailerRef = ref(rtdb, `users/${order.retailerId}`);
            const retailerSnap = await get(retailerRef);
            const retailerInfo = retailerSnap.exists() ? retailerSnap.val() : null;

            // Calculate timestamp if it's missing
            const timestamp = order.orderedAt || order.timestamp || Date.now();

            return {
              id: orderId,
              ...order,
              retailerName: retailerInfo?.name || 'Unknown',
              retailerPhone: retailerInfo?.phone || 'N/A',
              productName: order.productName || 'Unknown Product',
              quantity: order.quantity || 0,
              total: order.total || 0,
              orderedAt: timestamp
            };
          })
        );

        // Sort orders by date, newest first
        const sortedOrders = ordersArray.sort((a, b) => 
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

  const loadProducts = async () => {
    try {
      const productsRef = ref(rtdb, `dealers/${userProfile.uid}/products`);
      const snapshot = await get(productsRef);
      
      if (snapshot.exists()) {
        const productsData = snapshot.val();
        const productsArray = Object.entries(productsData).map(([id, product]) => ({
          id,
          ...product
        }));
        setProducts(productsArray);
      } else {
        setProducts([]);
      }
    } catch (error) {
      console.error('Error loading products:', error);
      toast.error('Failed to load products');
    }
  };

  const handleOrderStatus = async (status) => {
    if (!selectedOrder || !userProfile?.uid) return;

    try {
      // Update order status in dealer's node
      const orderRef = ref(rtdb, `dealers/${userProfile.uid}/orders/${selectedOrder.id}`);
      await update(orderRef, {
        status: status,
        updatedAt: serverTimestamp()
      });

      // Update order status in retailer's node
      const retailerOrderRef = ref(rtdb, `retailers/${selectedOrder.retailerId}/orders/${selectedOrder.id}`);
      await update(retailerOrderRef, {
        status: status,
        updatedAt: serverTimestamp()
      });

      setOrders(orders.map(order => 
        order.id === selectedOrder.id 
          ? { ...order, status, updatedAt: Date.now() }
          : order
      ));

      toast.success(`Order ${status === 'completed' ? 'accepted' : 'declined'} successfully`);
      setOrderStatusDialog(false);
      setSelectedOrder(null);
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error('Failed to update order status');
    }
  };

  const handleUpdateOrderStatus = async (orderId, retailerId, newStatus) => {
    try {
      // Update status in both dealer and retailer paths
      const updates = {
        [`dealers/${userProfile.uid}/orders/${orderId}/status`]: newStatus,
        [`retailers/${retailerId}/orders/${orderId}/status`]: newStatus
      };
      
      await update(ref(rtdb), updates);
      
      // Update local state
      setOrders(orders.map(order => 
        order.id === orderId 
          ? { ...order, status: newStatus }
          : order
      ));
      
      toast.success(`Order ${newStatus}`);
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error('Failed to update order status');
    }
  };

  const handleDeleteOrder = async (orderId, retailerId) => {
    try {
      // Remove from both dealer and retailer
      const updates = {
        [`dealers/${userProfile.uid}/orders/${orderId}`]: null,
        [`retailers/${retailerId}/orders/${orderId}`]: null
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

  const handleCopyPhone = () => {
    if (userProfile?.phone) {
      navigator.clipboard.writeText(userProfile.phone);
      toast.success('Phone number copied to clipboard!');
    }
  };

  const handleAddProduct = async () => {
    try {
      if (!newProduct.name || !newProduct.price || !newProduct.stock) {
        toast.error('Please fill all required fields');
        return;
      }

      const productId = Date.now().toString();
      const productData = {
        ...newProduct,
        price: parseFloat(newProduct.price),
        stock: parseInt(newProduct.stock),
        createdAt: serverTimestamp()
      };

      await set(ref(rtdb, `dealers/${userProfile.uid}/products/${productId}`), productData);
      setProducts([...products, { id: productId, ...productData }]);
      setProductDialog(false);
      setNewProduct({ name: '', description: '', price: '', stock: '' });
      toast.success('Product added successfully');
    } catch (error) {
      console.error('Error adding product:', error);
      toast.error('Failed to add product');
    }
  };

  // Render loading state
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  // Render error state
  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 4 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <StoreIcon sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Dealer Dashboard
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              bgcolor: 'primary.dark',
              px: 2,
              py: 1,
              borderRadius: 1
            }}>
              <Typography variant="subtitle2" sx={{ mr: 1 }}>Phone:</Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                {userProfile?.phone}
              </Typography>
              <Tooltip title="Copy Phone Number">
                <IconButton 
                  size="small" 
                  color="inherit"
                  onClick={() => {
                    navigator.clipboard.writeText(userProfile?.phone);
                    toast.success('Phone number copied!');
                  }}
                >
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
            <Button 
              color="inherit" 
              onClick={logout} 
              startIcon={<LogoutIcon />}
            >
              Logout
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Products Section */}
      <Box sx={{ mt: 4, px: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5">
            Products
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setSelectedProduct(null);
              setProductDialog(true);
            }}
          >
            Add Product
          </Button>
        </Box>
        {products.length > 0 ? (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell align="right">Price (Rs.)</TableCell>
                  <TableCell align="right">Stock</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>{product.name}</TableCell>
                    <TableCell>{product.description}</TableCell>
                    <TableCell align="right">Rs. {product.price}</TableCell>
                    <TableCell align="right">{product.stock}</TableCell>
                    <TableCell align="center">
                      <IconButton
                        color="primary"
                        onClick={() => {
                          setSelectedProduct(product);
                          setNewProduct(product);
                          setProductDialog(true);
                        }}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        color="error"
                        onClick={async () => {
                          if (window.confirm('Are you sure you want to delete this product?')) {
                            await remove(ref(rtdb, `dealers/${userProfile.uid}/products/${product.id}`));
                            setProducts(products.filter(p => p.id !== product.id));
                            toast.success('Product deleted');
                          }
                        }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Alert severity="info">No products added yet. Add your first product!</Alert>
        )}
      </Box>

      {/* Orders Section */}
      <Box sx={{ mt: 4, px: 3 }}>
        <Typography variant="h5" gutterBottom>
          Orders
        </Typography>
        {orders.length > 0 ? (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Order ID</TableCell>
                  <TableCell>Retailer Name</TableCell>
                  <TableCell>Retailer Phone</TableCell>
                  <TableCell>Product</TableCell>
                  <TableCell>Quantity</TableCell>
                  <TableCell>Total (Rs.)</TableCell>
                  <TableCell sx={{ minWidth: 300 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Typography variant="subtitle2">Status Flow</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Chip 
                          size="small" 
                          label="Pending" 
                          color="warning"
                          sx={{ minWidth: 70 }}
                        />
                        <ArrowForwardIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                        <Chip 
                          size="small" 
                          label="Approved" 
                          color="info"
                          sx={{ minWidth: 70 }}
                        />
                        <ArrowForwardIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                        <Chip 
                          size="small" 
                          label="Completed" 
                          color="success"
                          sx={{ minWidth: 70 }}
                        />
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>Ordered At</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>{order.id}</TableCell>
                    <TableCell>{order.retailerName}</TableCell>
                    <TableCell>{order.retailerPhone}</TableCell>
                    <TableCell>{order.productName}</TableCell>
                    <TableCell>{order.quantity}</TableCell>
                    <TableCell>Rs. {order.total}</TableCell>
                    <TableCell>
                      <Chip
                        label={order.status || 'pending'}
                        color={
                          order.status === 'completed' ? 'success' :
                          order.status === 'approved' ? 'info' :
                          order.status === 'declined' ? 'error' :
                          'warning'
                        }
                        sx={{ minWidth: 90 }}
                      />
                    </TableCell>
                    <TableCell>
                      {order.orderedAt ? new Date(order.orderedAt).toLocaleDateString() : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        {/* Show Approve and Decline for pending orders */}
                        {order.status === 'pending' && (
                          <>
                            <Button
                              size="small"
                              variant="contained"
                              color="info"
                              onClick={() => handleUpdateOrderStatus(order.id, order.retailerId, 'approved')}
                            >
                              Approve
                            </Button>
                            <Button
                              size="small"
                              variant="contained"
                              color="error"
                              onClick={() => handleUpdateOrderStatus(order.id, order.retailerId, 'declined')}
                            >
                              Decline
                            </Button>
                          </>
                        )}
                        
                        {/* Show Complete button for approved orders */}
                        {order.status === 'approved' && (
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            onClick={() => handleUpdateOrderStatus(order.id, order.retailerId, 'completed')}
                          >
                            Complete Order
                          </Button>
                        )}

                        {/* Always show delete button for all orders */}
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
          <Alert severity="info">No orders received yet</Alert>
        )}
      </Box>

      {/* Product Dialog */}
      <Dialog open={productDialog} onClose={() => {
        setProductDialog(false);
        setNewProduct({ name: '', description: '', price: '', stock: '' });
        setSelectedProduct(null);
      }}>
        <DialogTitle>
          {selectedProduct ? 'Edit Product' : 'Add New Product'}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {selectedProduct ? 'Edit the product details below.' : 'Enter the product details below.'}
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            label="Product Name"
            fullWidth
            variant="outlined"
            value={newProduct.name}
            onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
            sx={{ mt: 2 }}
          />
          <TextField
            margin="dense"
            label="Description"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={newProduct.description}
            onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
          />
          <TextField
            margin="dense"
            label="Price"
            type="number"
            fullWidth
            variant="outlined"
            value={newProduct.price}
            onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
          />
          <TextField
            margin="dense"
            label="Stock"
            type="number"
            fullWidth
            variant="outlined"
            value={newProduct.stock}
            onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setProductDialog(false);
            setNewProduct({ name: '', description: '', price: '', stock: '' });
            setSelectedProduct(null);
          }}>
            Cancel
          </Button>
          <Button 
            onClick={handleAddProduct} 
            variant="contained" 
            disabled={!newProduct.name || !newProduct.price || !newProduct.stock}
          >
            {selectedProduct ? 'Update' : 'Add'}
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
            onClick={() => {
              handleDeleteOrder(selectedOrder?.id, selectedOrder?.retailerId);
              setDeleteConfirmDialog(false);
            }} 
            color="error"
            variant="contained"
            startIcon={<DeleteIcon />}
          >
            Delete Order
          </Button>
        </DialogActions>
      </Dialog>

      {/* Order Status Dialog */}
      <Dialog
        open={orderStatusDialog}
        onClose={() => setOrderStatusDialog(false)}
      >
        <DialogTitle>Update Order Status</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Choose the new status for this order:
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOrderStatusDialog(false)}>Cancel</Button>
          <Button 
            onClick={() => handleUpdateOrderStatus(selectedOrder?.id, selectedOrder?.retailerId, 'completed')} 
            color="success"
          >
            Complete
          </Button>
          <Button 
            onClick={() => handleUpdateOrderStatus(selectedOrder?.id, selectedOrder?.retailerId, 'declined')} 
            color="error"
          >
            Decline
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DealerDashboard;
