import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Button,
  TextField,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Avatar
} from '@mui/material';
import { QRCodeSVG } from 'qrcode.react';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { useInterval } from '../../hooks/useInterval';

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

const FacultyDashboard = () => {
  const [subject, setSubject] = useState('');
  const [classroom, setClassroom] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [reports, setReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [isUpdating, setIsUpdating] = useState(false);
  const [currentSession, setCurrentSession] = useState(null);
  const [sessionStudents, setSessionStudents] = useState([]);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  
  const qrDialogTimerRef = useRef(null);
  const { user } = useAuth();

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

  // Clear timer when component unmounts
  useEffect(() => {
    return () => {
      if (qrDialogTimerRef.current) {
        clearTimeout(qrDialogTimerRef.current);
      }
    };
  }, []);

  const generateQRCode = async () => {
    if (!subject || !classroom) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/attendance/generate-qr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          subject,
          classRoom: classroom
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to generate QR code');
      }

      setQrCode(data.qrCode);
      setCurrentSession(data.sessionId);
      setShowQR(true);
      setSuccess('QR code generated successfully!');
      fetchReports();
      
      if (qrDialogTimerRef.current) {
        clearTimeout(qrDialogTimerRef.current);
      }
      
      qrDialogTimerRef.current = setTimeout(() => {
        setShowQR(false);
        setTimeout(() => {
          fetchSessionStudents(data.sessionId);
        }, 1000);
      }, 2 * 60 * 1000);
    } catch (err) {
      setError(err.message || 'Failed to generate QR code');
    } finally {
      setLoading(false);
    }
  };

  const fetchSessionStudents = async (sessionId, retryCount = 0) => {
    setIsLoadingStudents(true);
    setError('');
    try {
      if (!sessionId) {
        setError('Invalid session ID');
        setSessionStudents([]);
        setIsLoadingStudents(false);
        return;
      }
      
      const response = await fetch(`http://localhost:5000/api/attendance/session/${sessionId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.status === 404) {
        setError('Session not found. It may have been deleted.');
        setSessionStudents([]);
        setIsLoadingStudents(false);
        return;
      }
      
      if (response.status === 403) {
        setError('You do not have access to this session.');
        setSessionStudents([]);
        setIsLoadingStudents(false);
        return;
      }
      
      if (response.status === 500) {
        if (retryCount < 2) {
          setIsLoadingStudents(false);
          setTimeout(() => {
            fetchSessionStudents(sessionId, retryCount + 1);
          }, 1000);
          return;
        }
        
        setError('Server error when fetching session. Please try again later.');
        setSessionStudents([]);
        setIsLoadingStudents(false);
        return;
      }

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch session details');
      }

      setSessionStudents(data.students || []);
      
      if (data.status === 'expired') {
        setSuccess(`This session has expired. Showing ${data.students?.length || 0} students who marked attendance.`);
      }
    } catch (err) {
      if (retryCount < 2) {
        setIsLoadingStudents(false);
        setTimeout(() => {
          fetchSessionStudents(sessionId, retryCount + 1);
        }, 1000);
        return;
      }
      
      setError(err.message || 'Failed to fetch session details');
      setSessionStudents([]);
    } finally {
      setIsLoadingStudents(false);
    }
  };

  const downloadExcel = async (sessionId) => {
    setError('');
    try {
      setSuccess('Preparing Excel file for download...');
      
      const xhr = new XMLHttpRequest();
      xhr.open('GET', `http://localhost:5000/api/attendance/export/${sessionId}`, true);
      xhr.setRequestHeader('Authorization', `Bearer ${localStorage.getItem('token')}`);
      xhr.responseType = 'blob';
      
      xhr.onload = function() {
        if (this.status === 200) {
          const blob = this.response;
          if (blob.size === 0) {
            setError('Received empty Excel file');
            return;
          }
          
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.style.display = 'none';
          a.href = url;
          a.download = `attendance_${new Date().toISOString().split('T')[0]}.xlsx`;
          document.body.appendChild(a);
          a.click();
          
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
          
          setSuccess('Excel file downloaded successfully!');
        } else {
          setError(`Failed to download Excel file (Status: ${this.status})`);
        }
      };
      
      xhr.onerror = function() {
        setError('Network error during Excel download');
      };
      
      xhr.send();
    } catch (err) {
      setError(err.message || 'Failed to download Excel file');
    }
  };

  const fetchReports = useCallback(async () => {
    if (isUpdating) return;
    setIsUpdating(true);
    try {
      const response = await fetch('http://localhost:5000/api/attendance/report', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch reports');
      }

      const newReports = Object.entries(data).map(([subject, report]) => ({
        subject,
        ...report
      }));

      const hasChanges = JSON.stringify(newReports) !== JSON.stringify(reports);
      if (hasChanges) {
        setReports(newReports);
        setLastUpdate(new Date());
        if (selectedReport) {
          const updatedSelectedReport = newReports.find(r => r.subject === selectedReport.subject);
          if (updatedSelectedReport) {
            setSelectedReport(updatedSelectedReport);
          }
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch reports');
    } finally {
      setIsUpdating(false);
    }
  }, [reports, selectedReport]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  useInterval(() => {
    fetchReports();
  }, 5000);

  const handleCloseQRDialog = useCallback(() => {
    setShowQR(false);
    if (qrDialogTimerRef.current) {
      clearTimeout(qrDialogTimerRef.current);
      qrDialogTimerRef.current = null;
    }
    if (currentSession) {
      fetchSessionStudents(currentSession);
    }
  }, [currentSession]);

  const handleCloseStudentsDialog = useCallback(() => {
    setSessionStudents([]);
    setCurrentSession(null);
  }, []);

  const handleCloseReportDialog = useCallback(() => {
    setSelectedReport(null);
  }, []);

  return (
    <Container maxWidth="lg" sx={{ py: 4, background: colors.background }}>
      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <Box sx={{ mb: 4 }}>
          <motion.div variants={itemVariants}>
            <Typography variant="h4" component="h1" sx={{ 
              fontWeight: 700, 
              color: colors.primary,
              mb: 2,
              textAlign: 'center'
            }}>
              Faculty Dashboard
            </Typography>
          </motion.div>

          <Grid container spacing={3}>
            {/* Faculty Info Card */}
            <Grid item xs={12} md={4}>
              <motion.div variants={itemVariants}>
                <Card sx={{ 
                  background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
                  color: 'white',
                  borderRadius: 3,
                  boxShadow: '0 8px 16px rgba(0,0,0,0.1)'
                }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Avatar 
                        sx={{ 
                          width: 60, 
                          height: 60, 
                          bgcolor: 'white',
                          color: colors.primary,
                          fontSize: '1.5rem',
                          fontWeight: 'bold',
                          mr: 2
                        }}
                      >
                        {user?.name?.charAt(0).toUpperCase()}
                      </Avatar>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        {user?.name}
                      </Typography>
                    </Box>
                    <Typography variant="body1" sx={{ mb: 1 }}>
                      <strong>Department:</strong> {user?.department}
                    </Typography>
                    <Typography variant="body1">
                      <strong>Email:</strong> {user?.email}
                    </Typography>
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>

            {/* QR Generation Card */}
            <Grid item xs={12} md={8}>
              <motion.div variants={itemVariants}>
                <Card sx={{ 
                  borderRadius: 3,
                  boxShadow: '0 8px 16px rgba(0,0,0,0.1)',
                  background: 'white'
                }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ 
                      fontWeight: 600, 
                      mb: 3,
                      color: colors.text
                    }}>
                      Generate Attendance QR Code
                    </Typography>
                    {error && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        <Alert severity="error" sx={{ mb: 2 }}>
                          {error}
                        </Alert>
                      </motion.div>
                    )}
                    {success && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        <Alert severity="success" sx={{ mb: 2 }}>
                          {success}
                        </Alert>
                      </motion.div>
                    )}
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="Subject"
                          value={subject}
                          onChange={(e) => setSubject(e.target.value)}
                          margin="normal"
                          variant="outlined"
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              borderRadius: 2,
                            },
                          }}
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="Classroom"
                          value={classroom}
                          onChange={(e) => setClassroom(e.target.value)}
                          margin="normal"
                          variant="outlined"
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              borderRadius: 2,
                            },
                          }}
                        />
                      </Grid>
                    </Grid>
                    <motion.div
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                    >
                      <Button
                        fullWidth
                        variant="contained"
                        onClick={generateQRCode}
                        disabled={loading}
                        sx={{ 
                          mt: 2,
                          py: 1.5,
                          borderRadius: 2,
                          background: `linear-gradient(135deg, ${colors.accent} 0%, ${colors.primary} 100%)`,
                          color: 'white',
                          fontWeight: 600,
                          fontSize: '1rem',
                          textTransform: 'none',
                          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                          '&:hover': {
                            boxShadow: '0 6px 8px rgba(0,0,0,0.15)',
                            background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`,
                          }
                        }}
                      >
                        {loading ? <CircularProgress size={24} color="inherit" /> : 'Generate QR Code'}
                      </Button>
                    </motion.div>
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>

            {/* Attendance Reports */}
            <Grid item xs={12}>
              <motion.div variants={itemVariants}>
                <Card sx={{ 
                  borderRadius: 3,
                  boxShadow: '0 8px 16px rgba(0,0,0,0.1)',
                  background: 'white'
                }}>
                  <CardContent>
                    <Box sx={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      mb: 3 
                    }}>
                      <Typography variant="h6" sx={{ fontWeight: 600, color: colors.text }}>
                        Attendance Reports
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {isUpdating && <CircularProgress size={20} sx={{ mr: 1 }} />}
                        <Typography variant="caption" color="text.secondary">
                          Last updated: {lastUpdate.toLocaleTimeString()}
                        </Typography>
                      </Box>
                    </Box>
                    <TableContainer>
                      <Table>
                        <TableHead>
                          <TableRow sx={{ background: colors.background }}>
                            <TableCell sx={{ fontWeight: 600 }}>Subject</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Total Sessions</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Total Students</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {reports.map((report) => (
                            <motion.tr
                              key={report.subject}
                              whileHover={{ background: colors.background }}
                              transition={{ duration: 0.2 }}
                            >
                              <TableCell>{report.subject}</TableCell>
                              <TableCell>{report.totalSessions}</TableCell>
                              <TableCell>{Object.keys(report.students).length}</TableCell>
                              <TableCell>
                                <Button
                                  variant="outlined"
                                  size="small"
                                  onClick={() => setSelectedReport(report)}
                                  sx={{
                                    borderRadius: 2,
                                    textTransform: 'none',
                                    color: colors.primary,
                                    borderColor: colors.primary,
                                    '&:hover': {
                                      background: colors.primary,
                                      color: 'white',
                                      borderColor: colors.primary
                                    }
                                  }}
                                >
                                  View Details
                                </Button>
                              </TableCell>
                            </motion.tr>
                          ))}
                          {reports.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={4} align="center">
                                No attendance reports found
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>
          </Grid>
        </Box>

        {/* QR Code Dialog */}
        <Dialog 
          open={showQR} 
          onClose={handleCloseQRDialog}
          maxWidth="md"
          PaperProps={{
            sx: {
              borderRadius: 3,
              overflow: 'hidden'
            }
          }}
        >
          <DialogTitle sx={{ 
            background: colors.primary, 
            color: 'white',
            fontWeight: 600
          }}>
            Scan QR Code
          </DialogTitle>
          <DialogContent sx={{ p: 4 }}>
            <Box sx={{ 
              p: 3, 
              textAlign: 'center',
              background: colors.background,
              borderRadius: 2,
              border: `1px solid ${colors.secondary}`
            }}>
              {qrCode && (
                <motion.div
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <QRCodeSVG
                    value={qrCode}
                    size={256}
                    level="H"
                    includeMargin={true}
                    fgColor={colors.primary}
                  />
                </motion.div>
              )}
              <Typography variant="body2" sx={{ mt: 3, color: colors.text }}>
                This QR code will expire in 2 minutes
              </Typography>
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button 
              onClick={handleCloseQRDialog}
              sx={{
                borderRadius: 2,
                textTransform: 'none',
                color: colors.primary,
                '&:hover': {
                  background: colors.background
                }
              }}
            >
              Close
            </Button>
          </DialogActions>
        </Dialog>

        {/* Session Students Dialog */}
        <Dialog
          open={!showQR && currentSession !== null && !isLoadingStudents}
          onClose={handleCloseStudentsDialog}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 3,
              overflow: 'hidden'
            }
          }}
        >
          <DialogTitle sx={{ 
            background: colors.primary, 
            color: 'white',
            fontWeight: 600
          }}>
            Students Who Scanned the QR Code
          </DialogTitle>
          <DialogContent sx={{ p: 3 }}>
            {isLoadingStudents ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress />
              </Box>
            ) : (
              <>
                {sessionStudents.length === 0 ? (
                  <Box sx={{ p: 3, textAlign: 'center' }}>
                    <Typography variant="body1" sx={{ color: colors.text }}>
                      No students scanned this QR code.
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1, color: colors.text }}>
                      You can still download an empty Excel sheet.
                    </Typography>
                  </Box>
                ) : (
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow sx={{ background: colors.background }}>
                          <TableCell sx={{ fontWeight: 600 }}>Student Name</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {sessionStudents.map((student) => (
                          <motion.tr
                            key={student.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.3 }}
                          >
                            <TableCell>{student.name}</TableCell>
                            <TableCell>{student.email}</TableCell>
                          </motion.tr>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button 
              variant="contained"
              onClick={() => currentSession && downloadExcel(currentSession)}
              sx={{
                borderRadius: 2,
                textTransform: 'none',
                background: colors.success,
                '&:hover': {
                  background: '#218838'
                }
              }}
            >
              Export to Excel
            </Button>
            <Button 
              onClick={handleCloseStudentsDialog}
              sx={{
                borderRadius: 2,
                textTransform: 'none',
                color: colors.text,
                '&:hover': {
                  background: colors.background
                }
              }}
            >
              Close
            </Button>
          </DialogActions>
        </Dialog>

        {/* Report Details Dialog */}
        <Dialog
          open={!!selectedReport}
          onClose={handleCloseReportDialog}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 3,
              overflow: 'hidden'
            }
          }}
        >
          <DialogTitle sx={{ 
            background: colors.primary, 
            color: 'white',
            fontWeight: 600
          }}>
            Attendance Details - {selectedReport?.subject}
          </DialogTitle>
          <DialogContent sx={{ p: 3 }}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ background: colors.background }}>
                    <TableCell sx={{ fontWeight: 600 }}>Student Name</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Attendance</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Percentage</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {selectedReport && Object.entries(selectedReport.students).map(([id, student]) => (
                    <motion.tr
                      key={id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      <TableCell>{student.name}</TableCell>
                      <TableCell>{student.email}</TableCell>
                      <TableCell>{student.attendanceCount} / {selectedReport.totalSessions}</TableCell>
                      <TableCell>
                        {typeof student.attendancePercentage === 'number' 
                          ? `${student.attendancePercentage.toFixed(1)}%`
                          : `${(student.attendanceCount / selectedReport.totalSessions * 100).toFixed(1)}%`}
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button 
              onClick={handleCloseReportDialog}
              sx={{
                borderRadius: 2,
                textTransform: 'none',
                color: colors.text,
                '&:hover': {
                  background: colors.background
                }
              }}
            >
              Close
            </Button>
          </DialogActions>
        </Dialog>
      </motion.div>
    </Container>
  );
};

export default FacultyDashboard;