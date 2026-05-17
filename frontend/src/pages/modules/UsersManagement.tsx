import { useEffect, useState } from 'react';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import TextField from '@mui/material/TextField';
import InputLabel from '@mui/material/InputLabel';
import Rating from '@mui/material/Rating';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import IconButton from '@mui/material/IconButton';
import Switch from '@mui/material/Switch';
import MenuItem from '@mui/material/MenuItem';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableBody from '@mui/material/TableBody';
import TablePagination from '@mui/material/TablePagination';
import IconifyIcon from 'components/base/IconifyIcon';
import { apiClient, UserItem } from 'lib/api';

const UsersManagement = () => {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [view, setView] = useState<'add' | 'review'>('add');
  const [totalRecords, setTotalRecords] = useState(0);
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 25,
  });

  // Filter states
  const [searchText, setSearchText] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [newUser, setNewUser] = useState({
    first_name: '',
    last_name: '',
    badge_id: '',
    role: '',
    department: '',
    clearance_level: 1,
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
    clearance_level: 1,
    is_active: true,
  });
  const [editSubmitting, setEditSubmitting] = useState(false);

  const loadUsers = async () => {
    try {
      setLoading(true);
      
      const filters: { role?: string; department?: string; is_active?: boolean; search?: string } = {};
      if (roleFilter) filters.role = roleFilter;
      if (deptFilter) filters.department = deptFilter;
      if (statusFilter) filters.is_active = statusFilter === 'true';
      if (searchText) filters.search = searchText;

      const data = await apiClient.getUsers(paginationModel.page + 1, paginationModel.pageSize, filters);
      setUsers(data.items);
      setTotalRecords(data.total);
    } catch {
      setError('Failed to load user management data from backend API.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (view === 'review') {
      void loadUsers();
    }
  }, [paginationModel, view, roleFilter, deptFilter, statusFilter]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPaginationModel((prev) => ({ ...prev, page: 0 }));
      if (view === 'review') {
        void loadUsers();
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchText]);

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
        clearance_level: Number(newUser.clearance_level),
      });

      setSuccessMsg(`User ${response.first_name} ${response.last_name} created successfully!`);
      setNewUser({
        first_name: '',
        last_name: '',
        badge_id: '',
        role: '',
        department: '',
        clearance_level: 1,
      });

      if (view === 'review') {
        void loadUsers();
      }
    } catch (err) {
      const detail = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to create user: ${detail}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReviewUsers = () => {
    setView('review');
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
  };

  const handleEditUser = (user: UserItem) => {
    setEditingUser(user);
    setEditFormData({
      first_name: user.first_name,
      last_name: user.last_name,
      badge_id: user.badge_id,
      role: user.role,
      department: user.department || '',
      clearance_level: user.clearance_level ?? 1,
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
        clearance_level: Number(editFormData.clearance_level),
        is_active: editFormData.is_active,
      });

      setSuccessMsg(`User ${updated.first_name} ${updated.last_name} updated successfully!`);
      setEditingUser(null);
      void loadUsers();
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
            onClick={handleReviewUsers}
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
                  select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  disabled={submitting}
                >
                  {['admin', 'Administrator', 'Researcher', 'Security Guard', 'Senior Admin', 'Student', 'Teacher'].map((r) => (
                    <MenuItem key={r} value={r}>{r}</MenuItem>
                  ))}
                </TextField>

                <TextField
                  fullWidth
                  size="small"
                  label="Department"
                  select
                  value={newUser.department}
                  onChange={(e) => setNewUser({ ...newUser, department: e.target.value })}
                  disabled={submitting}
                >
                  {['computer_science', 'economy', 'research_labs', 'social_sciences', 'sports'].map((d) => (
                    <MenuItem key={d} value={d}>{d}</MenuItem>
                  ))}
                </TextField>

                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label="Clearance Level"
                  inputProps={{ min: 1, max: 5 }}
                  value={newUser.clearance_level}
                  onChange={(e) => setNewUser({ ...newUser, clearance_level: Number(e.target.value) })}
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
            <Stack spacing={2}>
              <Typography variant="body2" color="text.secondary">
                Total users in system: <Typography component="span" fontWeight={700} color="text.primary">{totalRecords}</Typography>
              </Typography>

              <Paper 
                sx={{ 
                  borderRadius: 4, 
                  overflow: 'hidden',
                  background: 'rgba(255, 255, 255, 0.02)', 
                  backdropFilter: 'blur(10px)', 
                  border: '1px solid rgba(255,255,255,0.05)',
                  boxShadow: '0 4px 24px rgba(0,0,0,0.2)',
                  position: 'relative',
                  mt: 1
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
                      <TableCell align="center" sx={{ fontWeight: 600, color: 'text.secondary', py: 1.5 }}>Name</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 600, color: 'text.secondary', py: 1.5 }}>Role</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 600, color: 'text.secondary', py: 1.5 }}>Department</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 600, color: 'text.secondary', py: 1.5 }}>Clearance</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 600, color: 'text.secondary', py: 1.5 }}>Badge ID</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 600, color: 'text.secondary', py: 1.5 }}>Status</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 600, color: 'text.secondary', py: 1.5 }}>Actions</TableCell>
                    </TableRow>
                    <TableRow sx={{ bgcolor: 'rgba(255, 255, 255, 0.01)' }}>
                      <TableCell align="center" sx={{ py: 1 }}>
                        <TextField
                          fullWidth
                          size="small"
                          placeholder="Search..."
                          value={searchText}
                          onChange={(e) => setSearchText(e.target.value)}
                          sx={{ 
                            '& .MuiOutlinedInput-root': { 
                              bgcolor: 'rgba(0,0,0,0.2)',
                              borderRadius: 1.5
                            } 
                          }}
                        />
                      </TableCell>
                      <TableCell align="center" sx={{ py: 1 }}>
                        <TextField
                          fullWidth
                          size="small"
                          select
                          value={roleFilter}
                          onChange={(e) => setRoleFilter(e.target.value)}
                          sx={{ 
                            '& .MuiOutlinedInput-root': { 
                              bgcolor: 'rgba(0,0,0,0.2)',
                              borderRadius: 1.5
                            } 
                          }}
                        >
                          <MenuItem value="">All</MenuItem>
                          {['admin', 'Administrator', 'Researcher', 'Security Guard', 'Senior Admin', 'Student', 'Teacher'].map((r) => (
                            <MenuItem key={r} value={r}>{r}</MenuItem>
                          ))}
                        </TextField>
                      </TableCell>
                      <TableCell align="center" sx={{ py: 1 }}>
                        <TextField
                          fullWidth
                          size="small"
                          select
                          value={deptFilter}
                          onChange={(e) => setDeptFilter(e.target.value)}
                          sx={{ 
                            '& .MuiOutlinedInput-root': { 
                              bgcolor: 'rgba(0,0,0,0.2)',
                              borderRadius: 1.5
                            } 
                          }}
                        >
                          <MenuItem value="">All</MenuItem>
                          {['computer_science', 'economy', 'research_labs', 'social_sciences', 'sports'].map((d) => (
                            <MenuItem key={d} value={d}>{d}</MenuItem>
                          ))}
                        </TextField>
                      </TableCell>
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
                          <MenuItem value="true">Active</MenuItem>
                          <MenuItem value="false">Inactive</MenuItem>
                        </TextField>
                      </TableCell>
                      <TableCell align="center" sx={{ py: 1 }}></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow 
                        key={user.id}
                        sx={{
                          '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.05)' },
                          '&:last-child td, &:last-child th': { border: 0 }
                        }}
                      >
                        <TableCell align="center" sx={{ fontWeight: 600 }}>{`${user.first_name} ${user.last_name}`}</TableCell>
                        <TableCell align="center" sx={{ color: 'text.secondary' }}>{user.role}</TableCell>
                        <TableCell align="center" sx={{ color: 'text.secondary' }}>{user.department || 'N/A'}</TableCell>
                        <TableCell align="center" sx={{ color: 'text.secondary' }}>
                          {user.clearance_level}
                        </TableCell>
                        <TableCell align="center" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>{user.badge_id}</TableCell>
                        <TableCell align="center">
                          <Chip 
                            label={user.is_active ? 'ACTIVE' : 'INACTIVE'} 
                            size="small" 
                            sx={{ 
                              bgcolor: user.is_active ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                              color: user.is_active ? '#34d399' : 'text.disabled',
                              fontWeight: 800,
                              borderRadius: 1.5,
                              border: `1px solid ${user.is_active ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.1)'}`
                            }} 
                          />
                        </TableCell>
                        <TableCell align="center">
                          <IconButton 
                            size="small" 
                            onClick={() => handleEditUser(user)}
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
                  page={paginationModel.page}
                  onPageChange={(_e, newPage) => setPaginationModel(prev => ({ ...prev, page: newPage }))}
                  rowsPerPage={paginationModel.pageSize}
                  onRowsPerPageChange={(e) => setPaginationModel(prev => ({ ...prev, pageSize: parseInt(e.target.value, 10), page: 0 }))}
                  rowsPerPageOptions={[10, 25, 50, 100]}
                  sx={{
                    color: 'text.secondary',
                    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                  }}
                />
              </Paper>
            </Stack>
          </>
        )}

        <Dialog 
          open={editingUser !== null} 
          onClose={handleCloseEditDialog} 
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
            <IconifyIcon icon="mingcute:user-edit-line" color="primary.main" fontSize="1.5rem" />
            Edit User
          </DialogTitle>
          <DialogContent sx={{ px: 4, py: 4 }}>
            {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
            {successMsg && <Alert severity="success" sx={{ mb: 3 }}>{successMsg}</Alert>}
            
            <Stack direction="column" spacing={3}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Box sx={{ flex: 1 }}>
                  <InputLabel sx={{ mb: 1, color: 'text.primary', fontWeight: 500, fontSize: '0.875rem' }}>First Name</InputLabel>
                  <TextField
                    fullWidth
                    size="small"
                    variant="outlined"
                    placeholder="John"
                    value={editFormData.first_name}
                    onChange={(e) => setEditFormData({ ...editFormData, first_name: e.target.value })}
                    disabled={editSubmitting}
                    sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'rgba(0,0,0,0.2)' } }}
                  />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <InputLabel sx={{ mb: 1, color: 'text.primary', fontWeight: 500, fontSize: '0.875rem' }}>Last Name</InputLabel>
                  <TextField
                    fullWidth
                    size="small"
                    variant="outlined"
                    placeholder="Doe"
                    value={editFormData.last_name}
                    onChange={(e) => setEditFormData({ ...editFormData, last_name: e.target.value })}
                    disabled={editSubmitting}
                    sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'rgba(0,0,0,0.2)' } }}
                  />
                </Box>
              </Stack>
              
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Box sx={{ flex: 1 }}>
                  <InputLabel sx={{ mb: 1, color: 'text.primary', fontWeight: 500, fontSize: '0.875rem' }}>Badge ID</InputLabel>
                  <TextField
                    fullWidth
                    size="small"
                    variant="outlined"
                    placeholder="BADGE-12345"
                    value={editFormData.badge_id}
                    onChange={(e) => setEditFormData({ ...editFormData, badge_id: e.target.value })}
                    disabled={editSubmitting}
                    sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'rgba(0,0,0,0.2)' } }}
                  />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <InputLabel sx={{ mb: 1, color: 'text.primary', fontWeight: 500, fontSize: '0.875rem' }}>Role</InputLabel>
                  <TextField
                    fullWidth
                    size="small"
                    variant="outlined"
                    select
                    value={editFormData.role}
                    onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
                    disabled={editSubmitting}
                    sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'rgba(0,0,0,0.2)' } }}
                  >
                    {['admin', 'Administrator', 'Researcher', 'Security Guard', 'Senior Admin', 'Student', 'Teacher'].map((r) => (
                      <MenuItem key={r} value={r}>{r}</MenuItem>
                    ))}
                  </TextField>
                </Box>
              </Stack>

              <Box>
                <InputLabel sx={{ mb: 1, color: 'text.primary', fontWeight: 500, fontSize: '0.875rem' }}>Department</InputLabel>
                <TextField
                  fullWidth
                  size="small"
                  variant="outlined"
                  select
                  value={editFormData.department}
                  onChange={(e) => setEditFormData({ ...editFormData, department: e.target.value })}
                  disabled={editSubmitting}
                  sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'rgba(0,0,0,0.2)' } }}
                >
                  {['computer_science', 'economy', 'research_labs', 'social_sciences', 'sports'].map((d) => (
                    <MenuItem key={d} value={d}>{d}</MenuItem>
                  ))}
                </TextField>
              </Box>

              <Box sx={{ p: 2.5, borderRadius: 2, bgcolor: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
                  <Box>
                    <Typography variant="subtitle2" sx={{ color: 'text.primary', fontWeight: 600 }}>Clearance Level</Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>Granted authorization (1-5)</Typography>
                  </Box>
                  <Rating
                    value={editFormData.clearance_level}
                    max={5}
                    icon={<IconifyIcon icon="mingcute:shield-fill" color="primary.main" fontSize="1.5rem" />}
                    emptyIcon={<IconifyIcon icon="mingcute:shield-line" color="text.secondary" fontSize="1.5rem" sx={{ opacity: 0.3 }} />}
                    onChange={(_, v) => setEditFormData({ ...editFormData, clearance_level: v || 1 })}
                    disabled={editSubmitting}
                  />
                </Stack>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="subtitle2" sx={{ color: 'text.primary', fontWeight: 600 }}>Active Status</Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>Allow user to authenticate</Typography>
                  </Box>
                  <Switch
                    checked={editFormData.is_active}
                    onChange={(e) => setEditFormData({ ...editFormData, is_active: e.target.checked })}
                    disabled={editSubmitting}
                    color="success"
                  />
                </Stack>
              </Box>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 3, pt: 1, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <Button 
              onClick={handleCloseEditDialog} 
              disabled={editSubmitting}
              sx={{ color: 'text.secondary', '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' } }}
            >
              Cancel
            </Button>
            <Button 
              variant="contained" 
              onClick={() => void handleUpdateUser()} 
              disabled={editSubmitting}
              sx={{ 
                borderRadius: 2, 
                px: 4,
                bgcolor: 'primary.main',
                '&:hover': { bgcolor: 'primary.dark' },
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)'
              }}
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