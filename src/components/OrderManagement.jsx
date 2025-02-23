import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import { ref, get, set, update } from 'firebase/database';
import { rtdb } from '../config/firebase';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'react-toastify';

const OrderStatus = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  HOLD: 'hold'
};

const statusColors = {
  [OrderStatus.PENDING]: 'warning',
  [OrderStatus.ACCEPTED]: 'success',
  [OrderStatus.REJECTED]: 'error',
  [OrderStatus.HOLD]: 'info'
};

export const OrderManagement = ({ dealerId, isDealer }) => {
  const { userProfile } = useAuth();
  const [orders, setOrders] = useState([]);
  const [dealerInfo, setDealerInfo] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [updateDialog, setUpdateDialog] = useState(false);
  const [statusNote, setStatusNote] = useState('');

  useEffect(() => {
    const loadDealerInfo = async () => {
      if (dealerId) {
        const dealerRef = ref(rtdb, `users/${dealerId}`);
        const snapshot = await get(dealerRef);
        if (snapshot.exists()) {
          setDealerInfo(snapshot.val());
        }
      }
    };

    const loadOrders = async () => {
      const ordersRef = ref(rtdb, 'orders');
      const snapshot = await get(ordersRef);
      if (snapshot.exists()) {
        const allOrders = Object.entries(snapshot.val()).map(([id, order]) => ({
          id,
          ...order
        }));
        
        // Filter orders based on user role
        const filteredOrders = allOrders.filter(order => 
          isDealer ? order.dealerId === userProfile.uid : order.retailerId === userProfile.uid
        );
        
        setOrders(filteredOrders);
      }
    };

    loadDealerInfo();
    loadOrders();

    // Set up real-time listener for orders
    const ordersRef = ref(rtdb, 'orders');
    const unsubscribe = rtdb.on(ordersRef, 'value', (snapshot) => {
      if (snapshot.exists()) {
        const allOrders = Object.entries(snapshot.val()).map(([id, order]) => ({
          id,
          ...order
        }));
        
        const filteredOrders = allOrders.filter(order => 
          isDealer ? order.dealerId === userProfile.uid : order.retailerId === userProfile.uid
        );
        
        setOrders(filteredOrders);
      }
    });

    return () => {
      rtdb.off(ordersRef, 'value', unsubscribe);
    };
  }, [dealerId, isDealer, userProfile]);

  const handleUpdateStatus = async (order, newStatus) => {
    setSelectedOrder(order);
    setStatusNote('');
    setUpdateDialog(true);
  };

  const confirmStatusUpdate = async () => {
    try {
      const orderRef = ref(rtdb, `orders/${selectedOrder.id}`);
      const updates = {
        status: selectedOrder.status,
        statusNote,
        updatedAt: new Date().toISOString()
      };

      // If order is accepted, update product stock
      if (selectedOrder.status === OrderStatus.ACCEPTED) {
        const productRef = ref(rtdb, `products/${selectedOrder.productId}`);
        const productSnap = await get(productRef);
        
        if (productSnap.exists()) {
          const product = productSnap.val();
          const newStock = product.stock - selectedOrder.quantity;
          
          if (newStock < 0) {
            toast.error('Not enough stock available');
            return;
          }
          
          await update(productRef, { stock: newStock });
        }
      }

      await update(orderRef, updates);
      setUpdateDialog(false);
      toast.success('Order status updated successfully');
    } catch (error) {
      console.error('Error updating order:', error);
      toast.error('Failed to update order status');
    }
  };

  const renderOrderTable = () => (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Order ID</TableCell>
            <TableCell>Product</TableCell>
            <TableCell>Quantity</TableCell>
            <TableCell>Total Price</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {orders.map((order) => (
            <TableRow key={order.id}>
              <TableCell>{order.id}</TableCell>
              <TableCell>{order.productName}</TableCell>
              <TableCell>{order.quantity}</TableCell>
              <TableCell>NPR {order.totalPrice.toLocaleString()}</TableCell>
              <TableCell>
                <Chip
                  label={order.status}
                  color={statusColors[order.status]}
                  size="small"
                />
              </TableCell>
              <TableCell>
                {isDealer && order.status === OrderStatus.PENDING && (
                  <Box>
                    <Button
                      size="small"
                      color="success"
                      onClick={() => handleUpdateStatus(order, OrderStatus.ACCEPTED)}
                    >
                      Accept
                    </Button>
                    <Button
                      size="small"
                      color="warning"
                      onClick={() => handleUpdateStatus(order, OrderStatus.HOLD)}
                    >
                      Hold
                    </Button>
                    <Button
                      size="small"
                      color="error"
                      onClick={() => handleUpdateStatus(order, OrderStatus.REJECTED)}
                    >
                      Reject
                    </Button>
                  </Box>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  return (
    <Box>
      {dealerInfo && !isDealer && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Dealer Information
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Typography variant="subtitle2">Name</Typography>
                <Typography>{dealerInfo.name}</Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="subtitle2">Address</Typography>
                <Typography>{dealerInfo.address}</Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="subtitle2">Contact</Typography>
                <Typography>{dealerInfo.phone || 'N/A'}</Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      <Typography variant="h6" gutterBottom>
        {isDealer ? 'Manage Orders' : 'My Orders'}
      </Typography>

      {renderOrderTable()}

      <Dialog open={updateDialog} onClose={() => setUpdateDialog(false)}>
        <DialogTitle>Update Order Status</DialogTitle>
        <DialogContent>
          <Typography variant="subtitle1">
            Total Amount: NPR {selectedOrder?.totalPrice.toLocaleString()}
          </Typography>
          <TextField
            fullWidth
            label="Status Note"
            multiline
            rows={4}
            value={statusNote}
            onChange={(e) => setStatusNote(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUpdateDialog(false)}>Cancel</Button>
          <Button onClick={confirmStatusUpdate} color="primary">
            Update
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OrderManagement;
