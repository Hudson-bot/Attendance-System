import React, { useState, useEffect, useCallback } from "react";
import {
  Container,
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Alert,
  CircularProgress,
  Avatar,
  LinearProgress
} from "@mui/material";
import QRCodeScanner from "../QRCodeScanner";
import { useAuth } from "../../contexts/AuthContext";
import axios from "axios";
import { motion } from "framer-motion";

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

const StudentDashboard = () => {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);
  const [attendanceHistory, setAttendanceHistory] = useState({});
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [isUpdating, setIsUpdating] = useState(false);
  const { token, user } = useAuth();
  const [lastScanTime, setLastScanTime] = useState(0);

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
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.5
      }
    }
  };

  const fetchAttendanceHistory = useCallback(async () => {
    if (isUpdating) return;
    setIsUpdating(true);
    try {
      const response = await axios.get(
        "https://attendance-system-app-bzly.onrender.com/api/attendance/my-attendance",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const newHistory = response.data;
      const hasChanges =
        JSON.stringify(newHistory) !== JSON.stringify(attendanceHistory);
      if (hasChanges) {
        setAttendanceHistory(newHistory);
        setLastUpdate(new Date());
      }
    } catch (err) {
      console.error("Error fetching attendance history:", err);
    } finally {
      setIsUpdating(false);
    }
  }, [attendanceHistory, token, isUpdating]);

  useEffect(() => {
    fetchAttendanceHistory();
  }, [fetchAttendanceHistory]);

  const handleError = (err) => {
    setError(err?.message || "An error occurred while accessing the camera.");
    setScanning(false);
  };

  const handleScan = async (decodedText) => {
    const now = Date.now();
    if (now - lastScanTime < 3000) {
      return;
    }
    setLastScanTime(now);
    
    try {
      setLoading(true);
      const response = await axios.post(
        'https://attendance-system-app-bzly.onrender.com/api/attendance/mark',
        { qrCode: decodedText },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccess('Attendance marked successfully!');
      setScanning(false);
      fetchAttendanceHistory();
      console.log(response);
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to mark attendance';
      setError(errorMessage);
      if (errorMessage.includes('already marked')) {
        setScanning(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const startScanner = useCallback(() => {
    setError(null);
    setSuccess(null);
    setTimeout(() => {
      setScanning(true);
    }, 300);
  }, []);

  const stopScanner = useCallback(() => {
    setScanning(false);
    setError(null);
    setSuccess(null);
  }, []);

  useEffect(() => {
    return () => {
      setScanning(false);
      setError(null);
      setSuccess(null);
    };
  }, []);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <Box sx={{ mb: 4 }}>
          <motion.div variants={itemVariants}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <Avatar 
                sx={{ 
                  width: 60, 
                  height: 60, 
                  mr: 2,
                  bgcolor: colors.primary,
                  color: 'white',
                  fontSize: '1.5rem',
                  fontWeight: 'bold'
                }}
              >
                {user?.name?.charAt(0).toUpperCase()}
              </Avatar>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 700, color: colors.text }}>
                  Welcome, {user?.name}
                </Typography>
                <Typography variant="subtitle1" sx={{ color: colors.primary }}>
                  Student Dashboard
                </Typography>
              </Box>
            </Box>
          </motion.div>

          <Grid container spacing={3}>
            {/* QR Scanner Card */}
            <Grid item xs={12} md={6}>
              <motion.div variants={itemVariants}>
                <Card sx={{ 
                  borderRadius: 3,
                  boxShadow: '0 8px 16px rgba(0,0,0,0.1)',
                  background: 'white'
                }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ 
                      fontWeight: 600,
                      color: colors.text,
                      mb: 3
                    }}>
                      QR Code Scanner
                    </Typography>
                    
                    {error && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                          {error}
                        </Alert>
                      </motion.div>
                    )}
                    
                    {success && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>
                          {success}
                        </Alert>
                      </motion.div>
                    )}
                    
                    {scanning ? (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.3 }}
                      >
                        <QRCodeScanner onError={handleError} onScan={handleScan} />
                      </motion.div>
                    ) : (
                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Button
                          variant="contained"
                          onClick={startScanner}
                          disabled={loading}
                          sx={{
                            py: 1.5,
                            borderRadius: 2,
                            fontSize: '1rem',
                            fontWeight: 600,
                            textTransform: 'none',
                            background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
                            color: 'white',
                            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                            '&:hover': {
                              boxShadow: '0 6px 8px rgba(0,0,0,0.15)',
                              background: `linear-gradient(135deg, ${colors.secondary} 0%, ${colors.primary} 100%)`,
                            }
                          }}
                        >
                          {loading ? (
                            <>
                              <CircularProgress size={24} sx={{ mr: 1, color: 'white' }} />
                              Processing...
                            </>
                          ) : (
                            "Start Scanner"
                          )}
                        </Button>
                      </motion.div>
                    )}
                    
                    {scanning && (
                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Button
                          variant="outlined"
                          onClick={stopScanner}
                          sx={{
                            mt: 2,
                            py: 1.5,
                            borderRadius: 2,
                            fontSize: '1rem',
                            fontWeight: 600,
                            textTransform: 'none',
                            borderColor: colors.error,
                            color: colors.error,
                            '&:hover': {
                              borderColor: colors.error,
                              background: 'rgba(220, 53, 69, 0.04)'
                            }
                          }}
                        >
                          Stop Scanner
                        </Button>
                      </motion.div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>

            {/* Attendance History Card */}
            <Grid item xs={12} md={6}>
              <motion.div variants={itemVariants}>
                <Card sx={{ 
                  borderRadius: 3,
                  boxShadow: '0 8px 16px rgba(0,0,0,0.1)',
                  background: 'white'
                }}>
                  <CardContent>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        mb: 3,
                      }}
                    >
                      <Typography variant="h6" sx={{ fontWeight: 600, color: colors.text }}>
                        Attendance History
                      </Typography>
                      <Box sx={{ display: "flex", alignItems: "center" }}>
                        {isUpdating && (
                          <CircularProgress size={20} sx={{ mr: 1 }} />
                        )}
                        <Typography variant="caption" color="text.secondary">
                          Last updated: {lastUpdate.toLocaleTimeString()}
                        </Typography>
                      </Box>
                    </Box>
                    
                    {Object.keys(attendanceHistory).length > 0 ? (
                      Object.entries(attendanceHistory).map(([subject, record]) => (
                        <motion.div
                          key={subject}
                          variants={itemVariants}
                          whileHover={{ scale: 1.01 }}
                        >
                          <Box
                            sx={{ 
                              mb: 3, 
                              p: 2, 
                              borderRadius: 2,
                              border: `1px solid ${colors.background}`,
                              background: 'white'
                            }}
                          >
                            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                              {subject}
                            </Typography>
                            
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                              <Typography variant="body2" sx={{ mr: 2 }}>
                                {record.attended}/{record.totalClasses} classes
                              </Typography>
                              <Typography variant="body2" sx={{ 
                                fontWeight: 600,
                                color: record.attendancePercentage >= 75 ? colors.success : 
                                      record.attendancePercentage >= 50 ? colors.warning : colors.error
                              }}>
                                ({record.attendancePercentage.toFixed(1)}%)
                              </Typography>
                            </Box>
                            
                            <LinearProgress 
                              variant="determinate" 
                              value={record.attendancePercentage} 
                              sx={{ 
                                height: 8,
                                borderRadius: 4,
                                backgroundColor: colors.background,
                                '& .MuiLinearProgress-bar': {
                                  borderRadius: 4,
                                  backgroundColor: record.attendancePercentage >= 75 ? colors.success : 
                                                record.attendancePercentage >= 50 ? colors.warning : colors.error
                                }
                              }} 
                            />
                          </Box>
                        </motion.div>
                      ))
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No attendance records found
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>
          </Grid>
        </Box>
      </motion.div>
    </Container>
  );
};

export default StudentDashboard;