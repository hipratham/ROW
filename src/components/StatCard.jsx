import React from 'react';
import { Paper, Typography, Box, useTheme, alpha } from '@mui/material';
import { motion } from 'framer-motion';

const StatCard = ({ title, value, icon, color }) => {
  const theme = useTheme();

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 300 }}
    >
      <Paper
        sx={{
          p: 3,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
          background: `linear-gradient(135deg, ${alpha(color, 0.1)} 0%, ${alpha(color, 0.05)} 100%)`,
          borderTop: `4px solid ${color}`,
          boxShadow: `0 4px 20px 0 ${alpha(color, 0.1)}`,
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
              opacity: 0.8,
            },
          })}
        </Box>

        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Typography
            variant="h4"
            sx={{
              mb: 1,
              color: theme.palette.text.primary,
              fontWeight: 600,
            }}
          >
            <motion.span
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {value}
            </motion.span>
          </Typography>

          <Typography
            variant="subtitle1"
            sx={{
              color: theme.palette.text.secondary,
              fontWeight: 500,
            }}
          >
            {title}
          </Typography>
        </Box>

        <Box
          sx={{
            position: 'absolute',
            bottom: -10,
            left: -10,
            width: 75,
            height: 75,
            borderRadius: '50%',
            background: alpha(color, 0.05),
          }}
        />
      </Paper>
    </motion.div>
  );
};

export default StatCard;
