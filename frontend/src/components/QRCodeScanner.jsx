import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { motion } from 'framer-motion';
import { Box, Typography, CircularProgress, IconButton } from '@mui/material';
import { CameraAlt, CameraFront, FlashOn, FlashOff } from '@mui/icons-material';

// Color scheme
const colors = {
  primary: '#4e54c8',
  secondary: '#8f94fb',
  background: '#1a1a1a',
  text: '#ffffff',
  error: '#ff4444'
};

const QRCodeScanner = ({ onScan, onError }) => {
  const scannerRef = useRef(null);
  const qrScannerId = 'qr-reader';
  const [isLoading, setIsLoading] = useState(true);
  const [isFrontCamera, setIsFrontCamera] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const [scanningActive, setScanningActive] = useState(true);

  const handleScan = useCallback((text) => {
    if (scanningActive) {
      onScan(text);
      // Add haptic feedback on successful scan
      if (navigator.vibrate) {
        navigator.vibrate(100);
      }
    }
  }, [onScan, scanningActive]);

  const handleError = useCallback((errorMessage) => {
    onError(errorMessage);
    setIsLoading(false);
  }, [onError]);

  const initScanner = useCallback(async () => {
    try {
      // Create scanner instance
      const scannerInstance = new Html5Qrcode(qrScannerId);
      scannerRef.current = scannerInstance;

      // Configuration
      const config = {
        fps: 2,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
        disableFlip: false
      };

      // Start scanning
      await scannerInstance.start(
        { facingMode: isFrontCamera ? 'user' : 'environment' },
        config,
        handleScan,
        () => {} // Ignore interim errors
      );

      setIsLoading(false);
    } catch (err) {
      let errorMessage = 'Failed to start scanner. Please try again.';
      if (err instanceof Error) {
        if (err.message.includes('NotAllowedError')) {
          errorMessage = 'Camera access denied. Please grant camera permissions.';
        } else if (err.message.includes('NotFoundError')) {
          errorMessage = 'No camera found. Please ensure your device has a camera.';
        } else if (err.message.includes('NotReadableError')) {
          errorMessage = 'Camera is already in use. Please close other camera apps.';
        }
      }
      handleError(errorMessage);
    }
  }, [isFrontCamera, handleScan, handleError]);

  useEffect(() => {
    let mounted = true;
    // let scannerInstance = null;

    // Add a small delay before initialization
    const timeoutId = setTimeout(() => {
      if (mounted) initScanner();
    }, 300);

    // Cleanup function
    return () => {
      mounted = false;
      clearTimeout(timeoutId);

      const cleanupScanner = async () => {
        if (scannerRef.current?.isScanning) {
          try {
            await scannerRef.current.stop();
            await scannerRef.current.clear();
          } catch (err) {
            console.error('Error cleaning up scanner:', err);
          }
        }
        scannerRef.current = null;
      };

      cleanupScanner();
    };
  }, [initScanner]);

  const toggleCamera = useCallback(() => {
    setScanningActive(false);
    setIsFrontCamera(prev => !prev);
    setTimeout(() => setScanningActive(true), 500);
  }, []);

  const toggleFlash = useCallback(() => {
    setFlashOn(prev => !prev);
  }, []);

  return (
    <Box sx={{ 
      position: 'relative',
      width: '100%',
      height: '100%',
      minHeight: '400px',
      backgroundColor: colors.background,
      borderRadius: '16px',
      overflow: 'hidden',
      boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
    }}>
      {/* Scanner container */}
      <div
        id={qrScannerId}
        style={{
          width: '100%',
          height: '100%',
          position: 'relative'
        }}
      />

      {/* Loading overlay */}
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.7)',
            zIndex: 10
          }}
        >
          <CircularProgress size={60} thickness={4} sx={{ color: colors.primary }} />
          <Typography variant="body1" sx={{ mt: 2, color: colors.text }}>
            Initializing scanner...
          </Typography>
        </motion.div>
      )}

      {/* Scanner frame overlay */}
      <Box
        component={motion.div}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: 'none',
          zIndex: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <Box
          sx={{
            width: '250px',
            height: '250px',
            border: `4px solid ${colors.primary}`,
            borderRadius: '16px',
            position: 'relative',
            '&::before, &::after': {
              content: '""',
              position: 'absolute',
              width: '40px',
              height: '40px',
              border: `4px solid ${colors.primary}`,
              borderRadius: '8px'
            },
            '&::before': {
              top: '-4px',
              left: '-4px',
              borderRight: 'none',
              borderBottom: 'none'
            },
            '&::after': {
              bottom: '-4px',
              right: '-4px',
              borderLeft: 'none',
              borderTop: 'none'
            }
          }}
        />
      </Box>

      {/* Scanner instructions */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.7 }}
        style={{
          position: 'absolute',
          bottom: '20px',
          left: 0,
          right: 0,
          textAlign: 'center',
          zIndex: 3
        }}
      >
        <Typography variant="body2" sx={{ color: colors.text, mb: 1 }}>
          Point your camera at a QR code to scan
        </Typography>
      </motion.div>

      {/* Camera controls */}
      <Box
        sx={{
          position: 'absolute',
          top: '16px',
          right: '16px',
          zIndex: 3,
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}
      >
        <IconButton
          onClick={toggleCamera}
          sx={{
            backgroundColor: 'rgba(0,0,0,0.5)',
            color: colors.text,
            '&:hover': {
              backgroundColor: 'rgba(0,0,0,0.7)'
            }
          }}
        >
          {isFrontCamera ? <CameraFront /> : <CameraAlt />}
        </IconButton>
        <IconButton
          onClick={toggleFlash}
          sx={{
            backgroundColor: 'rgba(0,0,0,0.5)',
            color: flashOn ? colors.primary : colors.text,
            '&:hover': {
              backgroundColor: 'rgba(0,0,0,0.7)'
            }
          }}
        >
          {flashOn ? <FlashOn /> : <FlashOff />}
        </IconButton>
      </Box>
    </Box>
  );
};

export default QRCodeScanner;