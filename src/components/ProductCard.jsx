import React from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Box,
  IconButton,
  TextField,
  Tooltip,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  ShoppingCart as CartIcon,
} from '@mui/icons-material';

const ProductCard = ({
  product,
  isDealer = true,
  onUpdateStock,
  onEdit,
  onDelete,
  onOrder,
}) => {
  // Format currency in NPR
  const formatCurrency = (amount) => {
    return `NPR ${Number(amount).toLocaleString('en-IN', {
      maximumFractionDigits: 2,
      minimumFractionDigits: 2
    })}`;
  };

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flexGrow: 1 }}>
        <Typography variant="h6" component="h2" gutterBottom>
          {product.name}
        </Typography>
        <Typography 
          variant="body2" 
          color="text.secondary" 
          sx={{ 
            mb: 2,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            minHeight: '40px',
          }}
        >
          {product.description}
        </Typography>
        <Typography variant="h6" color="primary" gutterBottom>
          {formatCurrency(product.price)}
        </Typography>
        <Box sx={{ mt: 2 }}>
          <Typography color="text.secondary">
            Stock: {product.stock}
          </Typography>
          {product.category && (
            <Typography color="text.secondary">
              Category: {product.category}
            </Typography>
          )}
        </Box>
        {isDealer && (
          <Box sx={{ mt: 2 }}>
            <motion.div
              initial={false}
              animate={{ height: isHovered ? 'auto' : 0, opacity: isHovered ? 1 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <Stack direction="row" spacing={1} alignItems="center">
                <TextField
                  type="number"
                  label="Stock"
                  size="small"
                  value={product.stock}
                  onChange={(e) => onUpdateStock(product.id, e.target.value)}
                  inputProps={{ min: 0 }}
                  sx={{ width: '100px' }}
                />
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => onUpdateStock(product.id, product.stock)}
                >
                  Update
                </Button>
              </Stack>
            </motion.div>
          </Box>
        )}
      </CardContent>
      <CardActions>
        {isDealer ? (
          <Stack direction="row" spacing={1} justifyContent="flex-end" width="100%">
            <Tooltip title="Edit Product">
              <IconButton
                size="small"
                color="primary"
                onClick={onEdit}
              >
                <EditIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete Product">
              <IconButton
                size="small"
                color="error"
                onClick={onDelete}
              >
                <DeleteIcon />
              </IconButton>
            </Tooltip>
          </Stack>
        ) : (
          <Button
            variant="contained"
            startIcon={<CartIcon />}
            onClick={onOrder}
            disabled={product.stock <= 0}
            fullWidth
          >
            Order Now
          </Button>
        )}
      </CardActions>
    </Card>
  );
};

export default ProductCard;
