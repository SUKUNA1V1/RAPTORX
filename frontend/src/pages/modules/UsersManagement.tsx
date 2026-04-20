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
import IconifyIcon from 'components/base/IconifyIcon';
import { apiClient, UserItem } from 'lib/api';

const UsersManagement = () => {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [view, setView] = useState<'add' | 'review'>('add');
  const [newUser, setNewUser] = useState({
    first_name: '',
    last_name: '',
    badge_id: '',
    role: '',
    department: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [editFormData, setEditFormData] = useState({
    first_name: '',
    last_name: '',
    badge_id: '',
    role: '',
    department: '',
    is_active: true,
  });
  const [editSubmitting, setEditSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await apiClient.getUsers();
        setUsers(data.items);
      } catch {
        setError('Failed to load user management data from backend API.');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const handleAddUser = async () => {
    if (!newUser.first_name || !newUser.last_name || !newUser.badge_id) {
      setError('First name, last name, and badge ID are required.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      setSuccessMsg('');
      
      const response = await apiClient.createUser({
        first_name: newUser.first_name,
        last_name: newUser.last_name,
        badge_id: newUser.badge_id,
        role: newUser.role || 'Employee',
        department: newUser.department || '',
      });

      setSuccessMsg(`User ${response.first_name} ${response.last_name} created successfully!`);
      setNewUser({
        first_name: '',
        last_name: '',
        badge_id: '',
        role: '',
        department: '',
      });

      // Reload users list
      const updated = await apiClient.getUsers();
      setUsers(updated.items);
    } catch (err) {
      const detail = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to create user: ${detail}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReviewUsers = async () => {
    setView('review');
    try {
      const data = await apiClient.getUsers();
      setUsers(data.items);
    } catch {
      setError('Failed to load users.');
    }
  };

  const handleEditUser = (user: UserItem) => {
    setEditingUser(user);
    setEditFormData({
      first_name: user.first_name,
      last_name: user.last_name,
      badge_id: user.badge_id,
      role: user.role,
      department: user.department || '',
      is_active: user.is_active,
    });
  };

  const handleUpdateUser = async () => {
    if (!editingUser || !editFormData.first_name || !editFormData.last_name || !editFormData.badge_id) {
      setError('First name, last name, and badge ID are required.');
      return;
    }

    try {
      setEditSubmitting(true);
      setError('');
      setSuccessMsg('');

      const updated = await apiClient.updateUser(editingUser.id, {
        first_name: editFormData.first_name,
        last_name: editFormData.last_name,
        badge_id: editFormData.badge_id,
        role: editFormData.role || 'Employee',
        department: editFormData.department || '',
        is_active: editFormData.is_active,
      });

      setSuccessMsg(`User ${updated.first_name} ${updated.last_name} updated successfully!`);
      setEditingUser(null);

      // Reload users list
      const reloaded = await apiClient.getUsers();
      setUsers(reloaded.items);
    } catch (err) {
      const detail = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to update user: ${detail}`);
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleCloseEditDialog = () => {
    setEditingUser(null);
  };

  return (
    <Paper sx={{ p: { xs: 3, md: 4 }, borderRadius: 4 }}>
      <Stack spacing={2.5} direction="column" sx={{ width: 1 }}>
        <Stack spacing={0.75}>
          <Typography variant="h3" fontWeight={700}>
            Users Management
          </Typography>
          <Typography variant="body2" color="text.secondary" maxWidth={720}>
            Admin-only workspace for adding, updating, and reviewing user access records.
          </Typography>
        </Stack>

        {error && <Alert severity="error">{error}</Alert>}
        {successMsg && <Alert severity="success">{successMsg}</Alert>}

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <Button 
            variant={view === 'add' ? 'contained' : 'outlined'}
            startIcon={<IconifyIcon icon="mdi:account-plus" />}
            onClick={() => setView('add')}
          >
            Add User
          </Button>
          <Button 
            variant={view === 'review' ? 'contained' : 'outlined'}
            color={view === 'review' ? 'primary' : 'secondary'}
            onClick={() => void handleReviewUsers()}
          >
            Review Existing Users
          </Button>
        </Stack>

        {view === 'add' && (
          <>
            <Divider />
            <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              <Stack spacing={2} direction="column" sx={{ width: 1 }}>
                <Typography variant="h5" fontWeight={700}>
                  Add New User
                </Typography>

                <TextField
                  fullWidth
                  size="small"
                  label="First Name"
                  placeholder="John"
                  value={newUser.first_name}
                  onChange={(e) => setNewUser({ ...newUser, first_name: e.target.value })}
                  disabled={submitting}
                />

                <TextField
                  fullWidth
                  size="small"
                  label="Last Name"
                  placeholder="Doe"
                  value={newUser.last_name}
                  onChange={(e) => setNewUser({ ...newUser, last_name: e.target.value })}
                  disabled={submitting}
                />

                <TextField
                  fullWidth
                  size="small"
                  label="Badge ID"
                  placeholder="BADGE-12345"
                  value={newUser.badge_id}
                  onChange={(e) => setNewUser({ ...newUser, badge_id: e.target.value })}
                  disabled={submitting}
                />

                <TextField
                  fullWidth
                  size="small"
                  label="Role"
                  placeholder="Employee"
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  disabled={submitting}
                />

                <TextField
                  fullWidth
                  size="small"
                  label="Department"
                  placeholder="Engineering"
                  value={newUser.department}
                  onChange={(e) => setNewUser({ ...newUser, department: e.target.value })}
                  disabled={submitting}
                />

                <Button 
                  variant="contained" 
                  onClick={() => void handleAddUser()}
                  disabled={submitting}
                >
                  {submitting ? 'Creating...' : 'Create User'}
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
                  Found {users.length} user(s) in the system.
                </Typography>
                {users.length === 0 ? (
                  <Alert severity="info">No users found. Add one to get started.</Alert>
                ) : (
                  <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5, maxHeight: 500, overflow: 'auto' }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ color: 'black' }}>Name</TableCell>
                          <TableCell sx={{ color: 'black' }}>Role</TableCell>
                          <TableCell sx={{ color: 'black' }}>Department</TableCell>
                          <TableCell sx={{ color: 'black' }}>Badge</TableCell>
                          <TableCell sx={{ color: 'black' }}>Status</TableCell>
                          <TableCell align="center" sx={{ color: 'black' }}>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {users.map((user) => (
                          <TableRow key={user.id} hover>
                            <TableCell>{`${user.first_name} ${user.last_name}`}</TableCell>
                            <TableCell>{user.role}</TableCell>
                            <TableCell>{user.department || 'N/A'}</TableCell>
                            <TableCell>{user.badge_id}</TableCell>
                            <TableCell>
                              <Chip 
                                label={user.is_active ? 'active' : 'inactive'} 
                                size="small" 
                                color={user.is_active ? 'success' : 'default'} 
                              />
                            </TableCell>
                            <TableCell align="center">
                              <IconButton 
                                size="small" 
                                onClick={() => handleEditUser(user)}
                                title="Edit user"
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

        <Dialog open={editingUser !== null} onClose={handleCloseEditDialog} maxWidth="md" fullWidth>
          <DialogTitle sx={{ fontSize: '1.5rem', fontWeight: 700, pb: 2 }}>Edit User</DialogTitle>
          <DialogContent sx={{ pt: 2, pb: 2 }}>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {successMsg && <Alert severity="success" sx={{ mb: 2 }}>{successMsg}</Alert>}
            
            <TextField
              fullWidth
              size="medium"
              label="First Name"
              placeholder="John"
              value={editFormData.first_name}
              onChange={(e) => setEditFormData({ ...editFormData, first_name: e.target.value })}
              disabled={editSubmitting}
              sx={{ mb: 2, mt: 1 }}
            />
            <TextField
              fullWidth
              size="medium"
              label="Last Name"
              placeholder="Doe"
              value={editFormData.last_name}
              onChange={(e) => setEditFormData({ ...editFormData, last_name: e.target.value })}
              disabled={editSubmitting}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              size="medium"
              label="Badge ID"
              placeholder="BADGE-12345"
              value={editFormData.badge_id}
              onChange={(e) => setEditFormData({ ...editFormData, badge_id: e.target.value })}
              disabled={editSubmitting}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              size="medium"
              label="Role"
              placeholder="Employee"
              value={editFormData.role}
              onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
              disabled={editSubmitting}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              size="medium"
              label="Department"
              placeholder="Engineering"
              value={editFormData.department}
              onChange={(e) => setEditFormData({ ...editFormData, department: e.target.value })}
              disabled={editSubmitting}
              sx={{ mb: 2 }}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={editFormData.is_active}
                  onChange={(e) => setEditFormData({ ...editFormData, is_active: e.target.checked })}
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
              onClick={() => void handleUpdateUser()} 
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

export default UsersManagement;