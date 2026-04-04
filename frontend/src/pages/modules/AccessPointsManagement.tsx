import { useEffect, useState } from 'react';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableBody from '@mui/material/TableBody';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import IconButton from '@mui/material/IconButton';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import Rating from '@mui/material/Rating';
import IconifyIcon from 'components/base/IconifyIcon';
import { AccessPointItem, apiClient } from 'lib/api';

const AccessPointsManagement = () => {
  const [points, setPoints] = useState<AccessPointItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [view, setView] = useState<'add' | 'review'>('add');
  const [newPoint, setNewPoint] = useState({
    name: '',
    type: '',
    status: 'active',
    building: '',
    floor: '',
    room: '',
    zone: '',
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
    required_clearance: 1,
    is_restricted: false,
  });
  const [editSubmitting, setEditSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await apiClient.getAccessPoints();
        setPoints(data);
      } catch {
        setError('Failed to load access points management data from backend API.');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

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
        required_clearance: 0,
        is_restricted: false,
      });

      const updated = await apiClient.getAccessPoints();
      setPoints(updated);
    } catch (err) {
      const detail = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to create access point: ${detail}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReviewAccessPoints = async () => {
    setView('review');
    try {
      const data = await apiClient.getAccessPoints();
      setPoints(data);
    } catch {
      setError('Failed to load access points.');
    }
  };

  const handleEditAccessPoint = (point: AccessPointItem) => {
    setEditingPoint(point);
    setEditFormData({
      name: point.name,
      type: point.type,
      status: point.status,
      building: point.building,
      floor: point.floor || '',
      room: point.room || '',
      zone: point.zone || '',
      required_clearance: point.required_clearance || 0,
      is_restricted: point.is_restricted || false,
    });
  };

  const handleUpdateAccessPoint = async () => {
    if (!editingPoint || !editFormData.name || !editFormData.type || !editFormData.building) {
      setError('Name, type, and building are required.');
      return;
    }

    try {
      setEditSubmitting(true);
      setError('');
      setSuccessMsg('');

      const updated = await apiClient.updateAccessPoint(editingPoint.id, {
        name: editFormData.name,
        type: editFormData.type,
        status: editFormData.status,
        building: editFormData.building,
        floor: editFormData.floor || undefined,
        room: editFormData.room || undefined,
        zone: editFormData.zone || undefined,
        required_clearance: editFormData.required_clearance || 0,
        is_restricted: editFormData.is_restricted,
      });

      setSuccessMsg(`Access point "${updated.name}" updated successfully!`);
      setEditingPoint(null);

      const reloaded = await apiClient.getAccessPoints();
      setPoints(reloaded);
    } catch (err) {
      const detail = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to update access point: ${detail}`);
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleCloseEditDialog = () => {
    setEditingPoint(null);
  };

  return (
    <Paper sx={{ p: { xs: 3, md: 4 }, borderRadius: 4 }}>
      <Stack spacing={2.5} direction="column" sx={{ width: 1 }}>
        <Stack spacing={0.75}>
          <Typography variant="h3" fontWeight={700}>
            Access Points Management
          </Typography>
          <Typography variant="body2" color="text.secondary" maxWidth={720}>
            Admin-only controls for creating and updating reader devices and entry zones.
          </Typography>
        </Stack>

        {error && <Alert severity="error">{error}</Alert>}
        {successMsg && <Alert severity="success">{successMsg}</Alert>}

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <Button 
            variant={view === 'add' ? 'contained' : 'outlined'}
            startIcon={<IconifyIcon icon="mdi:view-grid" />}
            onClick={() => setView('add')}
          >
            Add Access Point
          </Button>
          <Button 
            variant={view === 'review' ? 'contained' : 'outlined'}
            color={view === 'review' ? 'primary' : 'secondary'}
            onClick={() => void handleReviewAccessPoints()}
          >
            Edit Existing Access Points
          </Button>
        </Stack>

        {view === 'add' && (
          <>
            <Divider />
            <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <Stack spacing={2} direction="column" sx={{ width: 1 }}>
                <Typography variant="h5" fontWeight={700}>
                  Add New Access Point
                </Typography>

                <TextField
                  fullWidth
                  size="small"
                  label="Name"
                  placeholder="Main Entrance"
                  value={newPoint.name}
                  onChange={(e) => setNewPoint({ ...newPoint, name: e.target.value })}
                  disabled={submitting}
                />

                <TextField
                  fullWidth
                  size="small"
                  label="Type"
                  placeholder="Badge Reader"
                  value={newPoint.type}
                  onChange={(e) => setNewPoint({ ...newPoint, type: e.target.value })}
                  disabled={submitting}
                />

                <TextField
                  fullWidth
                  size="small"
                  label="Building"
                  placeholder="Building A"
                  value={newPoint.building}
                  onChange={(e) => setNewPoint({ ...newPoint, building: e.target.value })}
                  disabled={submitting}
                />

                <TextField
                  fullWidth
                  size="small"
                  label="Floor"
                  placeholder="1"
                  value={newPoint.floor}
                  onChange={(e) => setNewPoint({ ...newPoint, floor: e.target.value })}
                  disabled={submitting}
                />

                <TextField
                  fullWidth
                  size="small"
                  label="Room"
                  placeholder="101"
                  value={newPoint.room}
                  onChange={(e) => setNewPoint({ ...newPoint, room: e.target.value })}
                  disabled={submitting}
                />

                <TextField
                  fullWidth
                  size="small"
                  label="Zone"
                  placeholder="Lobby"
                  value={newPoint.zone}
                  onChange={(e) => setNewPoint({ ...newPoint, zone: e.target.value })}
                  disabled={submitting}
                />

                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>Required Clearance Level</Typography>
                  <Rating
                    value={newPoint.required_clearance}
                    onChange={(_, val) => setNewPoint({ ...newPoint, required_clearance: val || 1 })}
                    disabled={submitting}
                    size="large"
                    sx={{
                      '& .MuiRating-icon': {
                        fontSize: '2rem',
                      },
                    }}
                  />
                </Box>

                <FormControlLabel
                  control={
                    <Switch
                      checked={newPoint.is_restricted}
                      onChange={(e) => setNewPoint({ ...newPoint, is_restricted: e.target.checked })}
                      disabled={submitting}
                    />
                  }
                  label="Restricted Access"
                />

                <FormControlLabel
                  control={
                    <Switch
                      checked={newPoint.status === 'active'}
                      onChange={(e) => setNewPoint({ ...newPoint, status: e.target.checked ? 'active' : 'inactive' })}
                      disabled={submitting}
                    />
                  }
                  label="Active"
                />

                <Button 
                  variant="contained" 
                  onClick={() => void handleAddAccessPoint()}
                  disabled={submitting}
                >
                  {submitting ? 'Creating...' : 'Create Access Point'}
                </Button>
              </Stack>
            </Box>
          </>
        )}

        {view === 'review' && (
          <>
            <Divider />
            {loading && <CircularProgress size={24} />}
            {!loading && (
              <>
                <Typography variant="body2" color="text.secondary">
                  Found {points.length} access point(s) in the system.
                </Typography>
                {points.length === 0 ? (
                  <Alert severity="info">No access points found. Add one to get started.</Alert>
                ) : (
                  <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5, maxHeight: 500, overflow: 'auto' }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ color: 'black' }}>Name</TableCell>
                          <TableCell sx={{ color: 'black' }}>Type</TableCell>
                          <TableCell sx={{ color: 'black' }}>Building</TableCell>
                          <TableCell sx={{ color: 'black' }}>Floor</TableCell>
                          <TableCell sx={{ color: 'black' }}>Room</TableCell>
                          <TableCell sx={{ color: 'black' }}>Zone</TableCell>
                          <TableCell sx={{ color: 'black' }}>Status</TableCell>
                          <TableCell sx={{ color: 'black' }}>Restricted</TableCell>
                          <TableCell align="center" sx={{ color: 'black' }}>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {points.map((point) => (
                          <TableRow key={point.id} hover>
                            <TableCell>{point.name}</TableCell>
                            <TableCell>{point.type}</TableCell>
                            <TableCell>{point.building}</TableCell>
                            <TableCell>{point.floor || 'N/A'}</TableCell>
                            <TableCell>{point.room || 'N/A'}</TableCell>
                            <TableCell>{point.zone || 'N/A'}</TableCell>
                            <TableCell>
                              <Chip 
                                label={point.status} 
                                size="small" 
                                color={point.status === 'active' ? 'success' : 'default'} 
                              />
                            </TableCell>
                            <TableCell>
                              <Chip 
                                label={point.is_restricted ? 'Yes' : 'No'} 
                                size="small" 
                                color={point.is_restricted ? 'error' : 'default'} 
                              />
                            </TableCell>
                            <TableCell align="center">
                              <IconButton 
                                size="small" 
                                onClick={() => handleEditAccessPoint(point)}
                                title="Edit access point"
                              >
                                <IconifyIcon icon="mdi:pencil-outline" />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Box>
                )}
              </>
            )}
          </>
        )}

        <Dialog open={editingPoint !== null} onClose={handleCloseEditDialog} maxWidth="md" fullWidth>
          <DialogTitle sx={{ fontSize: '1.5rem', fontWeight: 700, pb: 2 }}>Edit Access Point</DialogTitle>
          <DialogContent sx={{ pt: 2, pb: 2 }}>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {successMsg && <Alert severity="success" sx={{ mb: 2 }}>{successMsg}</Alert>}
            
            <TextField
              fullWidth
              size="medium"
              label="Name"
              placeholder="Main Entrance"
              value={editFormData.name}
              onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
              disabled={editSubmitting}
              sx={{ mb: 2, mt: 1 }}
            />
            <TextField
              fullWidth
              size="medium"
              label="Type"
              placeholder="Badge Reader"
              value={editFormData.type}
              onChange={(e) => setEditFormData({ ...editFormData, type: e.target.value })}
              disabled={editSubmitting}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              size="medium"
              label="Building"
              placeholder="Building A"
              value={editFormData.building}
              onChange={(e) => setEditFormData({ ...editFormData, building: e.target.value })}
              disabled={editSubmitting}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              size="medium"
              label="Floor"
              placeholder="1"
              value={editFormData.floor}
              onChange={(e) => setEditFormData({ ...editFormData, floor: e.target.value })}
              disabled={editSubmitting}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              size="medium"
              label="Room"
              placeholder="101"
              value={editFormData.room}
              onChange={(e) => setEditFormData({ ...editFormData, room: e.target.value })}
              disabled={editSubmitting}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              size="medium"
              label="Zone"
              placeholder="Lobby"
              value={editFormData.zone}
              onChange={(e) => setEditFormData({ ...editFormData, zone: e.target.value })}
              disabled={editSubmitting}
              sx={{ mb: 2 }}
            />
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>Required Clearance Level</Typography>
              <Rating
                value={editFormData.required_clearance}
                onChange={(_, val) => setEditFormData({ ...editFormData, required_clearance: val || 1 })}
                disabled={editSubmitting}
                size="large"
                sx={{
                  '& .MuiRating-icon': {
                    fontSize: '2rem',
                  },
                }}
              />
            </Box>
            <FormControlLabel
              control={
                <Switch
                  checked={editFormData.is_restricted}
                  onChange={(e) => setEditFormData({ ...editFormData, is_restricted: e.target.checked })}
                  disabled={editSubmitting}
                />
              }
              label="Restricted Access"
              sx={{ mb: 2 }}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={editFormData.status === 'active'}
                  onChange={(e) => setEditFormData({ ...editFormData, status: e.target.checked ? 'active' : 'inactive' })}
                  disabled={editSubmitting}
                />
              }
              label="Active"
            />
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={handleCloseEditDialog} disabled={editSubmitting}>
              Cancel
            </Button>
            <Button 
              variant="contained" 
              onClick={() => void handleUpdateAccessPoint()} 
              disabled={editSubmitting}
            >
              {editSubmitting ? 'Updating...' : 'Save Changes'}
            </Button>
          </DialogActions>
        </Dialog>
      </Stack>
    </Paper>
  );
};

export default AccessPointsManagement;