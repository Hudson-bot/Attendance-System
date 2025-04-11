import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Box, Typography, IconButton, CircularProgress } from '@mui/material';
import { CameraAlt, CameraFront, FlashOn, FlashOff } from '@mui/icons-material';

/**
 * React QR Scanner Component
 * @param {Object} props
 * @param {function} props.onScan - Callback when QR code is scanned (receives { text: string })
 * @param {function} props.onError - Error handler callback
 * @param {Object} [props.style] - Custom styles
 * @param {Object} [props.constraints] - Video constraints
 * @param {string} [props.constraints.facingMode] - 'user' (front) or 'environment' (back)
 * @param {Object} [props.constraints.width] - Width constraints
 * @param {number} [props.constraints.width.ideal] - Ideal width
 * @param {Object} [props.constraints.height] - Height constraints
 * @param {number} [props.constraints.height.ideal] - Ideal height
 */
const QrScanner = ({ 
  onScan, 
  onError, 
  style = {}, 
  constraints = {
    facingMode: 'environment',
    width: { ideal: 1280 },
    height: { ideal: 720 }
  }
}) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [facingMode, setFacingMode] = useState(constraints.facingMode || 'environment');
  const [hasTorch, setHasTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [scanning, setScanning] = useState(true);

  // Initialize scanner
  useEffect(() => {
    let stream = null;
    let animationFrame = null;
    let qrWorker = null;

    const initScanner = async () => {
      try {
        // Get video stream
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode,
            width: constraints.width,
            height: constraints.height
          }
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          
          // Check for torch capability
          if (stream.getVideoTracks()[0].getCapabilities().torch) {
            setHasTorch(true);
          }

          // Initialize QR detection
          qrWorker = new Worker('/qr-worker.js'); // You'll need to provide this worker
          qrWorker.onmessage = (e) => {
            if (e.data && scanning) {
              onScan({ text: e.data });
            }
          };

          const processFrame = () => {
            if (videoRef.current && canvasRef.current && scanning) {
              const context = canvasRef.current.getContext('2d');
              canvasRef.current.width = videoRef.current.videoWidth;
              canvasRef.current.height = videoRef.current.videoHeight;
              context.drawImage(videoRef.current, 0, 0);
              
              const imageData = context.getImageData(
                0, 0, 
                canvasRef.current.width, 
                canvasRef.current.height
              );
              qrWorker.postMessage(imageData);
            }
            animationFrame = requestAnimationFrame(processFrame);
          };

          processFrame();
          setLoading(false);
        }
      } catch (err) {
        onError(err);
        setLoading(false);
      }
    };

    initScanner();

    return () => {
      if (animationFrame) cancelAnimationFrame(animationFrame);
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (qrWorker) qrWorker.terminate();
    };
  }, [facingMode, scanning]);

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  const toggleTorch = async () => {
    if (videoRef.current?.srcObject) {
      const track = videoRef.current.srcObject.getVideoTracks()[0];
      try {
        await track.applyConstraints({
          advanced: [{ torch: !torchOn }]
        });
        setTorchOn(!torchOn);
      } catch (err) {
        onError(err);
      }
    }
  };

  return (
    <Box sx={{ 
      position: 'relative',
      width: '100%',
      height: '100%',
      ...style
    }}>
      {/* Video element */}
      <motion.video
        ref={videoRef}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: loading ? 'none' : 'block'
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      />
      
      {/* Hidden canvas for processing */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Loading overlay */}
      {loading && (
        <Box sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(0,0,0,0.7)'
        }}>
          <CircularProgress size={60} />
          <Typography variant="body1" sx={{ mt: 2, color: 'white' }}>
            Initializing camera...
          </Typography>
        </Box>
      )}

      {/* Scanner frame overlay */}
      <Box sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <Box sx={{
          width: '70%',
          maxWidth: '400px',
          height: '70%',
          maxHeight: '400px',
          border: '4px solid #4e54c8',
          borderRadius: '16px',
          position: 'relative',
          '&::before, &::after': {
            content: '""',
            position: 'absolute',
            width: '40px',
            height: '40px',
            border: '4px solid #4e54c8',
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
        }} />
      </Box>

      {/* Controls */}
      <Box sx={{
        position: 'absolute',
        bottom: '20px',
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        gap: '20px'
      }}>
        <IconButton 
          onClick={toggleCamera}
          sx={{ 
            backgroundColor: 'rgba(0,0,0,0.5)',
            color: 'white',
            '&:hover': {
              backgroundColor: 'rgba(0,0,0,0.7)'
            }
          }}
        >
          {facingMode === 'user' ? <CameraFront /> : <CameraAlt />}
        </IconButton>

        {hasTorch && (
          <IconButton 
            onClick={toggleTorch}
            sx={{ 
              backgroundColor: 'rgba(0,0,0,0.5)',
              color: torchOn ? '#ffeb3b' : 'white',
              '&:hover': {
                backgroundColor: 'rgba(0,0,0,0.7)'
              }
            }}
          >
            {torchOn ? <FlashOn /> : <FlashOff />}
          </IconButton>
        )}
      </Box>
    </Box>
  );
};

export default QrScanner;