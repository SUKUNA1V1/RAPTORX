import { useEffect, useState } from 'react';
import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableBody from '@mui/material/TableBody';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Chip from '@mui/material/Chip';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import TablePagination from '@mui/material/TablePagination';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import IconifyIcon from 'components/base/IconifyIcon';
import { apiClient, UserItem } from 'lib/api';

const UsersPage = () => {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filter states
  const [searchText, setSearchText] = useState('');
  const [badgeSearch, setBadgeSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Pagination states
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);

  // Get unique values for filters
  const roles = [...new Set(users.map(u => u.role))].sort();
  const departments = [...new Set(users.map(u => u.department).filter(Boolean))].sort() as string[];

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await apiClient.getUsers();
        setUsers(data);
      } catch {
        setError('Failed to load users from backend API.');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  // Apply filters
  useEffect(() => {
    let filtered = users;

    if (searchText) {
      const lower = searchText.toLowerCase();
      filtered = filtered.filter(u =>
        `${u.first_name} ${u.last_name}`.toLowerCase().includes(lower)
      );
    }

    if (badgeSearch) {
      filtered = filtered.filter(u => u.badge_id.includes(badgeSearch));
    }

    if (roleFilter) {
      filtered = filtered.filter(u => u.role === roleFilter);
    }

    if (departmentFilter) {
      filtered = filtered.filter(u => u.department === departmentFilter);
    }

    if (statusFilter) {
      const isActive = statusFilter === 'active';
      filtered = filtered.filter(u => u.is_active === isActive);
    }

    setFilteredUsers(filtered);
    setPage(0); // Reset pagination on filter change
  }, [users, searchText, badgeSearch, roleFilter, departmentFilter, statusFilter]);

  return (
    <Stack spacing={4} sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
        <Box
          sx={{
            width: 56,
            height: 56,
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #0ba360 0%, #3cba92 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            boxShadow: '0 8px 32px rgba(60, 186, 146, 0.3)',
          }}
        >
          <IconifyIcon icon="mdi:account-outline" sx={{ fontSize: '2rem' }} />
        </Box>
        <Box>
          <Typography variant="h3" fontWeight={800} sx={{ background: 'linear-gradient(to right, #fff, #a1a1aa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', mb: 0.5 }}>
            User Management
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary', fontWeight: 500 }}>
            Monitor and manage physical access permissions across the organization.
          </Typography>
        </Box>
      </Box>

      {/* Filters Section */}
      {!loading && !error && users.length > 0 && (
        <Box 
          sx={{ 
            p: 3, 
            bgcolor: 'rgba(255, 255, 255, 0.02)', 
            borderRadius: 4, 
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.2)'
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 1 }}>
            Filters
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={2.4}>
              <TextField
                fullWidth
                label="Search Name"
                size="small"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Type to search..."
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2.4}>
              <TextField
                fullWidth
                label="Badge ID"
                size="small"
                value={badgeSearch}
                onChange={(e) => setBadgeSearch(e.target.value)}
                placeholder="Search badge..."
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2.4}>
              <TextField
                fullWidth
                label="Role"
                size="small"
                select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              >
                <MenuItem value="">All Roles</MenuItem>
                {roles.map(role => (
                  <MenuItem key={role} value={role}>{role}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6} md={2.4}>
              <TextField
                fullWidth
                label="Department"
                size="small"
                select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              >
                <MenuItem value="">All Departments</MenuItem>
                {departments.map(dept => (
                  <MenuItem key={dept} value={dept}>{dept}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6} md={2.4}>
              <TextField
                fullWidth
                label="Status"
                size="small"
                select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              >
                <MenuItem value="">All Status</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
              </TextField>
            </Grid>
          </Grid>
        </Box>
      )}

      {loading && (
        <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 4, background: 'rgba(255, 255, 255, 0.01)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <CircularProgress size={48} sx={{ color: '#3cba92' }} />
          <Typography variant="body1" sx={{ mt: 3, color: 'text.secondary', fontWeight: 500 }}>
            Loading users...
          </Typography>
        </Paper>
      )}
      {error && <Alert severity="error" sx={{ borderRadius: 3, bgcolor: 'rgba(211, 47, 47, 0.1)', color: '#ff8a80' }}>{error}</Alert>}
      {!loading && !error && users.length === 0 && (
        <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 4, bgcolor: 'rgba(255, 255, 255, 0.01)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <IconifyIcon icon="mdi:inbox-outline" sx={{ fontSize: 3, color: 'text.disabled', mb: 2 }} />
          <Typography variant="body1" sx={{ color: 'text.secondary', mb: 1, fontWeight: 500 }}>
            No users found.
          </Typography>
        </Paper>
      )}

      {!loading && !error && users.length > 0 && (
        <Stack spacing={2}>
          <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
            Showing {filteredUsers.length} of {users.length} users
          </Typography>
          <Paper 
            sx={{ 
              borderRadius: 4, 
              overflow: 'hidden',
              background: 'rgba(255, 255, 255, 0.02)', 
              backdropFilter: 'blur(10px)', 
              border: '1px solid rgba(255,255,255,0.05)',
              boxShadow: '0 4px 24px rgba(0,0,0,0.2)'
            }}
          >
            <Table size="medium">
              <TableHead>
                <TableRow sx={{ bgcolor: 'rgba(255, 255, 255, 0.03)' }}>
                  <TableCell sx={{ fontWeight: 600, color: 'text.secondary', py: 2 }}>Name</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: 'text.secondary', py: 2 }}>Role</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: 'text.secondary', py: 2 }}>Department</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: 'text.secondary', py: 2 }}>Badge ID</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: 'text.secondary', py: 2 }}>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredUsers.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((user) => {
                  const isActive = user.is_active;
                  return (
                    <TableRow 
                      key={user.id}
                      sx={{
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        cursor: 'default',
                        '&:hover': { 
                          bgcolor: 'rgba(255, 255, 255, 0.05)',
                          transform: 'translateY(-1px)',
                        },
                        '&:last-child td, &:last-child th': { border: 0 }
                      }}
                    >
                      <TableCell sx={{ fontWeight: 600, color: '#e2e8f0' }}>{`${user.first_name} ${user.last_name}`}</TableCell>
                      <TableCell sx={{ fontWeight: 500 }}>{user.role}</TableCell>
                      <TableCell sx={{ color: 'text.secondary' }}>{user.department || '—'}</TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', color: '#94a3b8' }}>{user.badge_id}</TableCell>
                      <TableCell>
                        <Chip 
                          label={isActive ? 'ACTIVE' : 'INACTIVE'} 
                          size="small" 
                          sx={{ 
                            bgcolor: isActive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                            color: isActive ? '#34d399' : 'text.disabled',
                            fontWeight: 800,
                            border: `1px solid ${isActive ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
                            borderRadius: 1.5,
                            boxShadow: isActive ? '0 0 10px rgba(16, 185, 129, 0.1)' : 'none'
                          }} 
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <TablePagination
              component="div"
              count={filteredUsers.length}
              page={page}
              onPageChange={(_, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={[20, 50, 100]}
              sx={{
                color: 'text.secondary',
                borderTop: '1px solid rgba(255, 255, 255, 0.05)',
              }}
            />
          </Paper>
        </Stack>
      )}
    </Stack>
  );
};

export default UsersPage;