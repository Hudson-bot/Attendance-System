import { useState } from 'react';
import {
  AppBar,
  Box,
  Container,
  IconButton,
  Toolbar,
  Typography,
  Menu,
  MenuItem,
  Avatar,
  Divider,
} from '@mui/material';
import { AccountCircle, ExitToApp } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { motion } from 'framer-motion';

// Color scheme
const colors = {
  primary: '#4e54c8',
  secondary: '#8f94fb',
  accent: '#4776E6',
  background: '#f8f9fa',
  text: '#343a40',
  success: '#28a745',
  error: '#dc3545',
  warning: '#ffc107',
  info: '#17a2b8'
};

const AppLayout = ({ children }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleProfile = () => {
    handleClose();
    // Add profile navigation when implemented
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: -20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.5
      }
    }
  };

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      minHeight: '100vh',
      background: colors.background
    }}>
      {/* Animated AppBar */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <AppBar 
          position="static" 
          elevation={0}
          sx={{
            background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
          }}
        >
          <Toolbar>
            <motion.div variants={itemVariants}>
              <Typography 
                variant="h6" 
                component="div" 
                sx={{ 
                  flexGrow: 1,
                  fontWeight: 700,
                  letterSpacing: 1
                }}
              >
                QR Attendance System
              </Typography>
            </motion.div>
            
            {user && (
              <motion.div variants={itemVariants}>
                <IconButton
                  size="large"
                  aria-label="account of current user"
                  aria-controls="menu-appbar"
                  aria-haspopup="true"
                  onClick={handleMenu}
                  color="inherit"
                  sx={{
                    '&:hover': {
                      background: 'rgba(255,255,255,0.1)'
                    }
                  }}
                >
                  {user.profilePicture ? (
                    <Avatar 
                      src={user.profilePicture} 
                      sx={{
                        border: `2px solid white`,
                        boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                      }}
                    />
                  ) : (
                    <AccountCircle sx={{ fontSize: 32 }} />
                  )}
                </IconButton>
                
                <Menu
                  id="menu-appbar"
                  anchorEl={anchorEl}
                  anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'right',
                  }}
                  keepMounted
                  transformOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                  }}
                  open={Boolean(anchorEl)}
                  onClose={handleClose}
                  PaperProps={{
                    sx: {
                      borderRadius: 2,
                      boxShadow: '0 5px 15px rgba(0,0,0,0.1)',
                      minWidth: 200,
                      overflow: 'hidden'
                    }
                  }}
                >
                  <Box sx={{ 
                    px: 2, 
                    py: 1.5,
                    background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
                    color: 'white'
                  }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      {user.name}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.8 }}>
                      {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                    </Typography>
                  </Box>
                  
                  <Divider />
                  
                  <MenuItem 
                    onClick={handleProfile}
                    sx={{
                      '&:hover': {
                        background: colors.background
                      }
                    }}
                  >
                    <AccountCircle sx={{ 
                      mr: 2,
                      color: colors.primary 
                    }} />
                    <Typography variant="body2">
                      Profile
                    </Typography>
                  </MenuItem>
                  
                  <MenuItem 
                    onClick={handleLogout}
                    sx={{
                      '&:hover': {
                        background: colors.background
                      }
                    }}
                  >
                    <ExitToApp sx={{ 
                      mr: 2,
                      color: colors.error 
                    }} />
                    <Typography variant="body2">
                      Logout
                    </Typography>
                  </MenuItem>
                </Menu>
              </motion.div>
            )}
          </Toolbar>
        </AppBar>
      </motion.div>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          bgcolor: 'background.default',
          minHeight: '100vh',
          py: 4
        }}
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Container maxWidth="lg">
            {children}
          </Container>
        </motion.div>
      </Box>

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <Box
          component="footer"
          sx={{
            py: 3,
            px: 2,
            mt: 'auto',
            backgroundColor: 'white',
            boxShadow: '0 -2px 10px rgba(0,0,0,0.05)',
            borderTop: `1px solid ${colors.background}`
          }}
        >
          <Container maxWidth="lg">
            <Typography 
              variant="body2" 
              color="text.secondary" 
              align="center"
              sx={{
                fontSize: '0.875rem'
              }}
            >
              © {new Date().getFullYear()} QR Attendance System. All rights reserved.
            </Typography>
          </Container>
        </Box>
      </motion.div>
    </Box>
  );
};

export default AppLayout;