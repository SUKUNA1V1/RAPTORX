import { useEffect, useState } from 'react';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import TextField from '@mui/material/TextField';
import InputLabel from '@mui/material/InputLabel';
import Box from '@mui/material/Box';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableBody from '@mui/material/TableBody';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import IconButton from '@mui/material/IconButton';
import Switch from '@mui/material/Switch';
import Rating from '@mui/material/Rating';
import TablePagination from '@mui/material/TablePagination';
import IconifyIcon from 'components/base/IconifyIcon';
import { AccessPointItem, apiClient } from 'lib/api';

const AccessPointsManagement = () => {
  const [points, setPoints] = useState<AccessPointItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [view, setView] = useState<'add' | 'review'>('add');
  
  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [totalRecords, setTotalRecords] = useState(0);

  // Filter states
  const [buildingFilter, setBuildingFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [newPoint, setNewPoint] = useState({
    name: '',
    type: '',
    status: 'active',
    building: '',
    floor: '',
    room: '',
    zone: '',
    ip_address: '',
    required_clearance: 1,
    is_restricted: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [editingPoint, setEditingPoint] = useState<AccessPointItem | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    type: '',
    status: 'active',
    building: '',
    floor: '',
    room: '',
    zone: '',
    ip_address: '',
    required_clearance: 1,
    is_restricted: false,
  });
  const [editSubmitting, setEditSubmitting] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      
      const filters: { status?: string; building?: string } = {};
      if (statusFilter) filters.status = statusFilter;
      if (buildingFilter) filters.building = buildingFilter;

      const data = await apiClient.getAccessPoints(page + 1, rowsPerPage, filters);
      setPoints(data.items);
      setTotalRecords(data.total);
    } catch {
      setError('Failed to load access points management data from backend API.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (view === 'review') {
      void load();
    }
  }, [view, page, rowsPerPage, statusFilter, buildingFilter]);

  // Debounce building filter
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(0);
      if (view === 'review') {
        void load();
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [buildingFilter]);

  const handleAddAccessPoint = async () => {
    if (!newPoint.name || !newPoint.type || !newPoint.building) {
      setError('Name, type, and building are required.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      setSuccessMsg('');

      await apiClient.createAccessPoint({
        name: newPoint.name,
        type: newPoint.type,
        status: newPoint.status,
        building: newPoint.building,
        floor: newPoint.floor || undefined,
        room: newPoint.room || undefined,
        zone: newPoint.zone || undefined,
        ip_address: newPoint.ip_address || undefined,
        required_clearance: newPoint.required_clearance || 0,
        is_restricted: newPoint.is_restricted,
      });

      setSuccessMsg(`Access point "${newPoint.name}" created successfully!`);
      setNewPoint({
        name: '',
        type: '',
        status: 'active',
        building: '',
        floor: '',
        room: '',
        zone: '',
        ip_address: '',
        required_clearance: 1,
        is_restricted: false,
      });
    } catch (err) {
      setError('Failed to create access point.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditClick = (point: AccessPointItem) => {
    setEditingPoint(point);
    setEditFormData({
      name: point.name,
      type: point.type,
      status: point.status,
      building: point.building,
      floor: point.floor || '',
      room: point.room || '',
      zone: point.zone || '',
      ip_address: point.ip_address || '',
      required_clearance: point.required_clearance ?? 1,
      is_restricted: point.is_restricted ?? false,
    });
  };

  const handleUpdateAccessPoint = async () => {
    if (!editingPoint) return;
    try {
      setEditSubmitting(true);
      await apiClient.updateAccessPoint(editingPoint.id, {
        ...editFormData,
        floor: editFormData.floor || undefined,
        room: editFormData.room || undefined,
        zone: editFormData.zone || undefined,
        ip_address: editFormData.ip_address || undefined,
      });
      setEditingPoint(null);
      void load();
    } catch (err) {
      setError('Failed to update access point.');
    } finally {
      setEditSubmitting(false);
    }
  };

  return (
    <Paper sx={{ p: { xs: 3, md: 4 }, borderRadius: 4 }}>
      <Stack spacing={4} direction="column" sx={{ width: '100%' }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              boxShadow: '0 8px 32px rgba(99, 102, 241, 0.3)',
            }}
          >
            <IconifyIcon icon="mdi:door-closed-lock" sx={{ fontSize: '2rem' }} />
          </Box>
          <Box>
            <Typography variant="h3" fontWeight={800}>
              Access Points
            </Typography>
            <Typography variant="body1" sx={{ color: 'text.secondary', fontWeight: 500 }}>
              Configure readers, biometric scanners, and smart locks.
            </Typography>
          </Box>
        </Box>

        {/* View Switcher */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <Button 
            variant={view === 'add' ? 'contained' : 'outlined'}
            startIcon={<IconifyIcon icon="mdi:plus" />}
            onClick={() => setView('add')}
          >
            Register Point
          </Button>
          <Button 
            variant={view === 'review' ? 'contained' : 'outlined'}
            color={view === 'review' ? 'primary' : 'secondary'}
            onClick={() => setView('review')}
            startIcon={<IconifyIcon icon="mdi:table-eye" />}
          >
            Review Database
          </Button>
        </Stack>

        {successMsg && <Alert severity="success">{successMsg}</Alert>}
        {error && <Alert severity="error">{error}</Alert>}

        {view === 'add' && (
          <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <Stack spacing={2} direction="column" sx={{ width: 1 }}>
              <Typography variant="h5" fontWeight={700}>
                Add New Access Point
              </Typography>

              <TextField
                fullWidth
                size="small"
                label="Point Name"
                placeholder="e.g. Main Lobby Gate 1"
                value={newPoint.name}
                onChange={(e) => setNewPoint({ ...newPoint, name: e.target.value })}
                disabled={submitting}
              />

              <TextField
                fullWidth
                size="small"
                label="Type"
                placeholder="e.g. Card Reader, Biometric"
                value={newPoint.type}
                onChange={(e) => setNewPoint({ ...newPoint, type: e.target.value })}
                disabled={submitting}
              />

              <TextField
                fullWidth
                size="small"
                label="Building"
                placeholder="e.g. Building A"
                value={newPoint.building}
                onChange={(e) => setNewPoint({ ...newPoint, building: e.target.value })}
                disabled={submitting}
              />

              <TextField
                fullWidth
                size="small"
                label="Floor"
                placeholder="e.g. 1"
                value={newPoint.floor}
                onChange={(e) => setNewPoint({ ...newPoint, floor: e.target.value })}
                disabled={submitting}
              />

              <TextField
                fullWidth
                size="small"
                label="Room"
                placeholder="e.g. 101"
                value={newPoint.room}
                onChange={(e) => setNewPoint({ ...newPoint, room: e.target.value })}
                disabled={submitting}
              />

              <TextField
                fullWidth
                size="small"
                label="Zone"
                placeholder="e.g. Secure Zone"
                value={newPoint.zone}
                onChange={(e) => setNewPoint({ ...newPoint, zone: e.target.value })}
                disabled={submitting}
              />

              <TextField
                fullWidth
                size="small"
                label="IP Address"
                placeholder="e.g. 192.168.1.100"
                value={newPoint.ip_address}
                onChange={(e) => setNewPoint({ ...newPoint, ip_address: e.target.value })}
                disabled={submitting}
              />

              <Box sx={{ p: 2.5, borderRadius: 2, bgcolor: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', mt: 1 }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
                  <Box>
                    <Typography variant="subtitle2" sx={{ color: 'text.primary', fontWeight: 600 }}>Security Level</Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>Required clearance (1-5)</Typography>
                  </Box>
                  <Rating
                    value={newPoint.required_clearance}
                    max={5}
                    icon={<IconifyIcon icon="mingcute:shield-fill" color="primary.main" fontSize="1.5rem" />}
                    emptyIcon={<IconifyIcon icon="mingcute:shield-line" color="text.secondary" fontSize="1.5rem" sx={{ opacity: 0.3 }} />}
                    onChange={(_, v) => setNewPoint({ ...newPoint, required_clearance: v || 1 })}
                    disabled={submitting}
                  />
                </Stack>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="subtitle2" sx={{ color: 'text.primary', fontWeight: 600 }}>Highly Restricted Zone</Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>Requires multifactor authentication</Typography>
                  </Box>
                  <Switch
                    checked={newPoint.is_restricted}
                    onChange={(e) => setNewPoint({ ...newPoint, is_restricted: e.target.checked })}
                    disabled={submitting}
                    color="error"
                  />
                </Stack>
              </Box>

              <Button
                variant="contained"
                size="large"
                disabled={submitting}
                onClick={handleAddAccessPoint}
                sx={{ py: 1.5, borderRadius: 2, fontWeight: 700 }}
              >
                {submitting ? 'Registering...' : 'Register Access Point'}
              </Button>
            </Stack>
          </Box>
        )}

        {view === 'review' && (
          <Paper 
            sx={{ 
              borderRadius: 4, 
              overflow: 'hidden',
              background: 'rgba(255, 255, 255, 0.02)', 
              backdropFilter: 'blur(10px)', 
              border: '1px solid rgba(255,255,255,0.05)',
              boxShadow: '0 4px 24px rgba(0,0,0,0.2)',
              position: 'relative'
            }}
          >
            {loading && (
              <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(0,0,0,0.3)', zIndex: 10 }}>
                <CircularProgress size={32} sx={{ color: '#6366f1' }} />
              </Box>
            )}
            <Table size="medium">
              <TableHead>
                <TableRow sx={{ bgcolor: 'rgba(255, 255, 255, 0.03)' }}>
                  <TableCell align="center" sx={{ fontWeight: 600, color: 'text.secondary', py: 1.5 }}>Point Name</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600, color: 'text.secondary', py: 1.5 }}>Location</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600, color: 'text.secondary', py: 1.5 }}>Type</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600, color: 'text.secondary', py: 1.5 }}>IP Address</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600, color: 'text.secondary', py: 1.5 }}>Clearance</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600, color: 'text.secondary', py: 1.5 }}>Restricted</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600, color: 'text.secondary', py: 1.5 }}>Status</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600, color: 'text.secondary', py: 1.5 }}>Actions</TableCell>
                </TableRow>
                <TableRow sx={{ bgcolor: 'rgba(255, 255, 255, 0.01)' }}>
                  <TableCell align="center" sx={{ py: 1 }}></TableCell>
                  <TableCell align="center" sx={{ py: 1 }}>
                    <TextField
                      fullWidth
                      size="small"
                      placeholder="Filter building..."
                      value={buildingFilter}
                      onChange={(e) => setBuildingFilter(e.target.value)}
                      sx={{ 
                        '& .MuiOutlinedInput-root': { 
                          bgcolor: 'rgba(0,0,0,0.2)',
                          borderRadius: 1.5
                        } 
                      }}
                    />
                  </TableCell>
                  <TableCell align="center" sx={{ py: 1 }}></TableCell>
                  <TableCell align="center" sx={{ py: 1 }}></TableCell>
                  <TableCell align="center" sx={{ py: 1 }}></TableCell>
                  <TableCell align="center" sx={{ py: 1 }}></TableCell>
                  <TableCell align="center" sx={{ py: 1 }}>
                    <TextField
                      fullWidth
                      size="small"
                      select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      sx={{ 
                        '& .MuiOutlinedInput-root': { 
                          bgcolor: 'rgba(0,0,0,0.2)',
                          borderRadius: 1.5
                        } 
                      }}
                    >
                      <MenuItem value="">All</MenuItem>
                      <MenuItem value="active">Active</MenuItem>
                      <MenuItem value="inactive">Inactive</MenuItem>
                    </TextField>
                  </TableCell>
                  <TableCell align="center" sx={{ py: 1 }}></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {points.map((point) => (
                  <TableRow 
                    key={point.id}
                    sx={{
                      '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.05)' },
                      '&:last-child td, &:last-child th': { border: 0 }
                    }}
                  >
                    <TableCell align="center" sx={{ fontWeight: 600 }}>{point.name}</TableCell>
                    <TableCell align="center" sx={{ color: 'text.secondary' }}>
                      {point.building}{point.floor ? `, Fl ${point.floor}` : ''}
                    </TableCell>
                    <TableCell align="center">
                      <Chip label={point.type} size="small" variant="outlined" sx={{ borderRadius: 1.5 }} />
                    </TableCell>
                    <TableCell align="center" sx={{ color: 'text.secondary', fontFamily: 'monospace' }}>
                      {point.ip_address || '-'}
                    </TableCell>
                    <TableCell align="center">
                      {point.required_clearance}
                    </TableCell>
                    <TableCell align="center">
                      <Chip 
                        label={point.is_restricted ? 'Restricted' : 'Standard'} 
                        size="small" 
                        sx={{ 
                          bgcolor: point.is_restricted ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                          color: point.is_restricted ? '#ef4444' : 'text.secondary',
                          fontWeight: point.is_restricted ? 700 : 500,
                          borderRadius: 1.5,
                          border: `1px solid ${point.is_restricted ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.1)'}`
                        }} 
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Chip 
                        label={point.status.toUpperCase()} 
                        size="small" 
                        sx={{ 
                          bgcolor: point.status === 'active' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                          color: point.status === 'active' ? '#34d399' : 'text.disabled',
                          fontWeight: 800,
                          borderRadius: 1.5,
                          border: `1px solid ${point.status === 'active' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.1)'}`
                        }} 
                      />
                    </TableCell>
                    <TableCell align="center">
                      <IconButton 
                        size="small" 
                        onClick={() => handleEditClick(point)}
                        sx={{ 
                          color: 'text.secondary',
                          '&:hover': { color: '#6366f1', bgcolor: 'rgba(99, 102, 241, 0.05)' }
                        }}
                      >
                        <IconifyIcon icon="mdi:pencil-outline" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePagination
              component="div"
              count={totalRecords}
              page={page}
              onPageChange={(_, v) => setPage(v)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={[10, 25, 50]}
              sx={{ 
                color: 'text.secondary',
                borderTop: '1px solid rgba(255,255,255,0.05)' 
              }}
            />
          </Paper>
        )}

        {/* Edit Dialog */}
        <Dialog 
          open={!!editingPoint} 
          onClose={() => setEditingPoint(null)} 
          fullWidth 
          maxWidth="sm"
          PaperProps={{
            sx: {
              background: 'rgba(20, 20, 30, 0.7)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 3,
              boxShadow: '0 24px 40px rgba(0, 0, 0, 0.5)',
            }
          }}
        >
          <DialogTitle sx={{ 
            fontWeight: 700, 
            fontSize: '1.25rem', 
            borderBottom: '1px solid rgba(255,255,255,0.05)',
            pb: 2,
            pt: 3,
            px: 4,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5
          }}>
            <IconifyIcon icon="mingcute:edit-line" color="primary.main" fontSize="1.5rem" />
            Edit Access Point
          </DialogTitle>
          <DialogContent sx={{ px: 4, py: 4 }}>
            <Stack direction="column" spacing={3}>
              <Box>
                <InputLabel sx={{ mb: 1, color: 'text.primary', fontWeight: 500, fontSize: '0.875rem' }}>Point Name</InputLabel>
                <TextField
                  fullWidth
                  size="small"
                  variant="outlined"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'rgba(0,0,0,0.2)' } }}
                />
              </Box>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Box sx={{ flex: 1 }}>
                  <InputLabel sx={{ mb: 1, color: 'text.primary', fontWeight: 500, fontSize: '0.875rem' }}>Type</InputLabel>
                  <TextField
                    fullWidth
                    size="small"
                    variant="outlined"
                    value={editFormData.type}
                    onChange={(e) => setEditFormData({ ...editFormData, type: e.target.value })}
                    sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'rgba(0,0,0,0.2)' } }}
                  />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <InputLabel sx={{ mb: 1, color: 'text.primary', fontWeight: 500, fontSize: '0.875rem' }}>Building</InputLabel>
                  <TextField
                    fullWidth
                    size="small"
                    variant="outlined"
                    value={editFormData.building}
                    onChange={(e) => setEditFormData({ ...editFormData, building: e.target.value })}
                    sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'rgba(0,0,0,0.2)' } }}
                  />
                </Box>
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Box sx={{ flex: 1 }}>
                  <InputLabel sx={{ mb: 1, color: 'text.primary', fontWeight: 500, fontSize: '0.875rem' }}>Floor</InputLabel>
                  <TextField
                    fullWidth
                    size="small"
                    variant="outlined"
                    value={editFormData.floor}
                    onChange={(e) => setEditFormData({ ...editFormData, floor: e.target.value })}
                    sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'rgba(0,0,0,0.2)' } }}
                  />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <InputLabel sx={{ mb: 1, color: 'text.primary', fontWeight: 500, fontSize: '0.875rem' }}>Room</InputLabel>
                  <TextField
                    fullWidth
                    size="small"
                    variant="outlined"
                    value={editFormData.room}
                    onChange={(e) => setEditFormData({ ...editFormData, room: e.target.value })}
                    sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'rgba(0,0,0,0.2)' } }}
                  />
                </Box>
              </Stack>
              <Box sx={{ p: 2.5, borderRadius: 2, bgcolor: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
                  <Box>
                    <Typography variant="subtitle2" sx={{ color: 'text.primary', fontWeight: 600 }}>Security Level</Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>Required clearance (1-5)</Typography>
                  </Box>
                  <Rating
                    value={editFormData.required_clearance}
                    max={5}
                    icon={<IconifyIcon icon="mingcute:shield-fill" color="primary.main" fontSize="1.5rem" />}
                    emptyIcon={<IconifyIcon icon="mingcute:shield-line" color="text.secondary" fontSize="1.5rem" sx={{ opacity: 0.3 }} />}
                    onChange={(_, v) => setEditFormData({ ...editFormData, required_clearance: v || 1 })}
                  />
                </Stack>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="subtitle2" sx={{ color: 'text.primary', fontWeight: 600 }}>Highly Restricted Zone</Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>Requires multifactor authentication</Typography>
                  </Box>
                  <Switch
                    checked={editFormData.is_restricted}
                    onChange={(e) => setEditFormData({ ...editFormData, is_restricted: e.target.checked })}
                    color="error"
                  />
                </Stack>
              </Box>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 3, pt: 1, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <Button 
              onClick={() => setEditingPoint(null)} 
              sx={{ color: 'text.secondary', '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' } }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              disabled={editSubmitting}
              onClick={handleUpdateAccessPoint}
              sx={{ 
                borderRadius: 2, 
                px: 4,
                bgcolor: 'primary.main',
                '&:hover': { bgcolor: 'primary.dark' },
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)'
              }}
            >
              {editSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogActions>
        </Dialog>
      </Stack>
    </Paper>
  );
};

export default AccessPointsManagement;