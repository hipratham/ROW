import React from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Chip,
  Stack,
  Divider,
  Box,
  IconButton,
  Collapse,
  useTheme,
  alpha,
} from '@mui/material';
import {
  LocalShipping as ShippingIcon,
  AccessTime as TimeIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';

const OrderCard = ({ order, onUpdateStatus, retailerInfo }) => {
  const theme = useTheme();
  const [expanded, setExpanded] = React.useState(false);

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return theme.palette.warning.main;
      case 'processing': return theme.palette.info.main;
      case 'completed': return theme.palette.success.main;
      case 'cancelled': return theme.palette.error.main;
      default: return theme.palette.grey[500];
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <motion.div whileHover={{ y: -5 }}>
      <Card
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'visible',
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.background.default, 0.8)} 100%)`,
          boxShadow: `0 4px 20px 0 ${alpha(theme.palette.primary.main, 0.1)}`,
          '&:hover': {
            boxShadow: `0 8px 25px 0 ${alpha(theme.palette.primary.main, 0.15)}`,
          },
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: -10,
            right: 20,
            bgcolor: getStatusColor(order.status),
            color: 'white',
            px: 2,
            py: 0.5,
            borderRadius: '16px',
            boxShadow: 2,
          }}
        >
          <Typography variant="caption" sx={{ textTransform: 'capitalize' }}>
            {order.status}
          </Typography>
        </Box>

        <CardContent sx={{ pt: 3 }}>
          <Stack spacing={2}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="h6" component="div">
                Order #{order.id.slice(0, 8)}
              </Typography>
              <Chip
                icon={<TimeIcon sx={{ fontSize: 16 }} />}
                label={formatDate(order.timestamp)}
                size="small"
                variant="outlined"
              />
            </Stack>

            <Divider />

            {/* Retailer Info */}
            {retailerInfo && (
              <>
                <Stack spacing={1}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Retailer Information
                  </Typography>
                  <Stack spacing={1}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <PersonIcon color="action" sx={{ fontSize: 20 }} />
                      <Typography variant="body2">{retailerInfo.name}</Typography>
                    </Stack>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <PhoneIcon color="action" sx={{ fontSize: 20 }} />
                      <Typography variant="body2">{retailerInfo.phone}</Typography>
                    </Stack>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <LocationIcon color="action" sx={{ fontSize: 20 }} />
                      <Typography variant="body2">{retailerInfo.address}</Typography>
                    </Stack>
                  </Stack>
                </Stack>
                <Divider />
              </>
            )}

            {/* Order Items */}
            <Stack spacing={1}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="subtitle2" color="text.secondary">
                  Order Items
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => setExpanded(!expanded)}
                  sx={{
                    transform: expanded ? 'rotate(180deg)' : 'none',
                    transition: theme.transitions.create('transform'),
                  }}
                >
                  <ExpandMoreIcon />
                </IconButton>
              </Stack>

              <Collapse in={expanded}>
                <Stack spacing={1}>
                  {order.items?.map((item, index) => (
                    <Stack
                      key={index}
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                    >
                      <Typography variant="body2">
                        {item.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {item.quantity} × NPR {item.price?.toLocaleString()}
                      </Typography>
                    </Stack>
                  ))}
                  <Divider />
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="subtitle1">Total</Typography>
                    <Typography variant="subtitle1" color="primary.main">
                      NPR {order.totalAmount?.toLocaleString()}
                    </Typography>
                  </Stack>
                </Stack>
              </Collapse>
            </Stack>
          </Stack>
        </CardContent>

        <CardActions sx={{ p: 2, pt: 0, mt: 'auto' }}>
          {order.status === 'pending' && (
            <Stack direction="row" spacing={1} width="100%">
              <Button
                variant="contained"
                color="primary"
                startIcon={<ShippingIcon />}
                onClick={() => onUpdateStatus(order.id, 'processing')}
                fullWidth
              >
                Accept Order
              </Button>
              <Button
                variant="outlined"
                color="error"
                onClick={() => onUpdateStatus(order.id, 'cancelled')}
                fullWidth
              >
                Cancel
              </Button>
            </Stack>
          )}
          {order.status === 'processing' && (
            <Button
              variant="contained"
              color="success"
              onClick={() => onUpdateStatus(order.id, 'completed')}
              fullWidth
            >
              Mark as Completed
            </Button>
          )}
        </CardActions>
      </Card>
    </motion.div>
  );
};

export default OrderCard;
