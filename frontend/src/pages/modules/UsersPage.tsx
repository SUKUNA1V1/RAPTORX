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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [totalRecords, setTotalRecords] = useState(0);

  // Filter states
  const [searchText, setSearchText] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Pagination states
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);

  const loadWithFilters = async () => {
    try {
      setLoading(true);
      setError('');
      
      const filters: { search?: string; role?: string; department?: string; is_active?: boolean } = {};
      if (searchText) filters.search = searchText;
      if (roleFilter) filters.role = roleFilter;
      if (departmentFilter) filters.department = departmentFilter;
      if (statusFilter) filters.is_active = statusFilter === 'active';

      const response = await apiClient.getUsers(page + 1, rowsPerPage, filters);
      
      setUsers(response.items);
      setTotalRecords(response.total);
    } catch (err) {
      setError('Failed to load users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadWithFilters();
  }, [page, rowsPerPage, roleFilter, departmentFilter, statusFilter]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(0);
      void loadWithFilters();
    }, 500);
    return () => clearTimeout(timer);
  }, [searchText]);

  const roles = ['admin', 'Administrator', 'Researcher', 'Security Guard', 'Senior Admin', 'Student', 'Teacher'];
  const departments = ['computer_science', 'economy', 'research_labs', 'social_sciences', 'sports'];

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
            Users
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary', fontWeight: 500 }}>
            Browse and search the centralized personnel database.
          </Typography>
        </Box>
      </Box>

      {/* Filters Section */}
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
          Search & Filters
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              label="Global Search"
              size="small"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Name or Badge ID..."
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
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
          <Grid item xs={12} sm={6} md={3}>
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
          <Grid item xs={12} sm={6} md={3}>
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
              <MenuItem value="active">Active Only</MenuItem>
              <MenuItem value="inactive">Inactive Only</MenuItem>
            </TextField>
          </Grid>
        </Grid>
      </Box>

      {error && <Alert severity="error" sx={{ borderRadius: 3 }}>{error}</Alert>}

      <Stack spacing={2}>
        <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500 }}>
          Total Database Records: <Typography component="span" fontWeight={700} color="text.primary">{totalRecords}</Typography>
        </Typography>
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
              <CircularProgress size={32} sx={{ color: '#3cba92' }} />
            </Box>
          )}
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
              {users.map((user) => {
                const isActive = user.is_active;
                return (
                  <TableRow 
                    key={user.id}
                    sx={{
                      '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.05)' },
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
                          borderRadius: 1.5,
                        }} 
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
              {users.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                    No users matching your criteria were found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <TablePagination
            component="div"
            count={totalRecords}
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
    </Stack>
  );
};

export default UsersPage;