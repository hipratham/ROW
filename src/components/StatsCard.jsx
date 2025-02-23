import React from 'react';
import { Paper, Box, Typography, alpha, useTheme } from '@mui/material';
import { motion } from 'framer-motion';

const StatsCard = ({ title, value, icon, color }) => {
  const theme = useTheme();

  return (
    <motion.div
      whileHover={{ y: -5 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Paper
        sx={{
          p: 3,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
          background: `linear-gradient(135deg, ${alpha(color, 0.2)} 0%, ${alpha(theme.palette.background.default, 0.9)} 100%)`,
          boxShadow: `0 4px 20px 0 ${alpha(color, 0.15)}`,
          '&:hover': {
            boxShadow: `0 8px 25px 0 ${alpha(color, 0.2)}`,
          },
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: -15,
            right: -15,
            width: 90,
            height: 90,
            borderRadius: '50%',
            background: alpha(color, 0.1),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {React.cloneElement(icon, {
            sx: {
              fontSize: 35,
              color: color,
            },
          })}
        </Box>

        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Typography variant="h4" component="div" sx={{ mb: 1, fontWeight: 600 }}>
            {value}
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            {title}
          </Typography>
        </Box>
      </Paper>
    </motion.div>
  );
};

export default StatsCard;
