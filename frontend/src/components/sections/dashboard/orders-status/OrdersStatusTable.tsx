import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import IconifyIcon from 'components/base/IconifyIcon';
import DataGridFooter from 'components/common/DataGridFooter';
import {
  DataGrid,
  GridApi,
  GridColDef,
  useGridApiRef,
} from '@mui/x-data-grid';

export interface DataGridRow {
  id: string;
  client: { name: string; email: string };
  date: Date;
  status: string;
  country: string;
  total: string;
  isNew?: boolean;
}

interface OrdersStatusTableProps {
  searchText: string;
  data: DataGridRow[];
}

const OrdersStatusTable = ({ searchText, data }: OrdersStatusTableProps) => {
  const apiRef = useGridApiRef<GridApi>();
  const [rows, setRows] = useState(data);

  useEffect(() => {
    setRows(data);
  }, [data]);

  useEffect(() => {
    apiRef.current.setQuickFilterValues(searchText.split(/\b\W+\b/).filter((word) => word !== ''));
  }, [searchText]);

  const columns: GridColDef[] = [
    {
      field: 'id',
      headerName: 'Request ID',
      minWidth: 80,
      flex: 1,
      resizable: false,
    },
    {
      field: 'client',
      headerName: 'User',
      flex: 2,
      minWidth: 180,
      resizable: false,
      renderHeader: () => (
        <Stack alignItems="center" gap={0.75}>
          <IconifyIcon icon="mingcute:user-2-fill" color="neutral.main" fontSize="body2.fontSize" />
          <Typography variant="caption" mt={0.25} letterSpacing={0.5}>
            User
          </Typography>
        </Stack>
      ),
      valueGetter: (params: { name: string; email: string }) => {
        return `${params.name} ${params.email}`;
      },
      renderCell: (params) => {
        return (
          <Stack direction="column" alignSelf="center" justifyContent="center" sx={{ height: 1 }}>
            <Typography variant="subtitle1" fontSize="caption.fontSize">
              {params.row.client.name}
            </Typography>
            <Typography variant="subtitle2" color="text.secondary" fontSize="caption.fontSize">
              {params.row.client.email}
            </Typography>
          </Stack>
        );
      },
      sortComparator: (v1, v2) => v1.localeCompare(v2),
    },
    {
      field: 'date',
      type: 'date',
      headerName: 'Timestamp',
      minWidth: 100,
      flex: 1,
      resizable: false,
      renderHeader: () => (
        <Stack alignItems="center" gap={0.75}>
          <IconifyIcon icon="mdi:calendar" color="neutral.main" fontSize="body1.fontSize" />
          <Typography mt={0.175} variant="caption" letterSpacing={0.5}>
            Timestamp
          </Typography>
        </Stack>
      ),
      renderCell: (params) => format(new Date(params.value), 'MMM dd, yyyy HH:mm'),
    },
    {
      field: 'status',
      headerName: 'Decision',
      sortable: false,
      minWidth: 120,
      flex: 1,
      resizable: false,
      renderHeader: () => (
        <Stack alignItems="center" gap={0.875}>
          <IconifyIcon
            icon="carbon:checkbox-checked-filled"
            color="neutral.main"
            fontSize="body1.fontSize"
          />
          <Typography mt={0.175} variant="caption" letterSpacing={0.5}>
            Decision
          </Typography>
        </Stack>
      ),
      renderCell: (params) => {
        let label = 'Unknown';
        let colorStr = 'text.secondary';
        let bgStr = 'rgba(255,255,255,0.05)';

        if (params.value === 'delivered') {
          label = 'Granted';
          colorStr = 'success.main';
          bgStr = 'rgba(76, 175, 80, 0.1)';
        } else if (params.value === 'pending') {
          label = 'Delayed';
          colorStr = 'warning.main';
          bgStr = 'rgba(255, 152, 0, 0.1)';
        } else if (params.value === 'canceled') {
          label = 'Denied';
          colorStr = 'error.main';
          bgStr = 'rgba(244, 67, 54, 0.1)';
        }

        return (
          <Stack direction="column" alignSelf="center" justifyContent="center" sx={{ height: 1 }}>
            <Typography
              variant="caption"
              sx={{
                px: 1,
                py: 0.5,
                borderRadius: 1,
                color: colorStr,
                bgcolor: bgStr,
                fontWeight: 600,
                textAlign: 'center',
                textTransform: 'capitalize'
              }}
            >
              {label}
            </Typography>
          </Stack>
        );
      },
    },
    {
      field: 'country',
      headerName: 'Location',
      sortable: false,
      flex: 1,
      minWidth: 120,
      resizable: false,
      renderHeader: () => (
        <Stack alignItems="center" gap={0.75}>
          <IconifyIcon
            icon="healthicons:geo-location"
            color="neutral.main"
            fontSize="h5.fontSize"
          />
          <Typography mt={0.175} variant="caption" letterSpacing={0.5}>
            Location
          </Typography>
        </Stack>
      ),
    },
    {
      field: 'total',
      headerName: 'Risk Score',
      headerAlign: 'right',
      align: 'right',
      sortable: false,
      minWidth: 120,
      flex: 1,
      resizable: false,
    },
  ];

  return (
    <DataGrid
      apiRef={apiRef}
      rows={rows}
      columns={columns}
      rowHeight={80}
      initialState={{
        pagination: {
          paginationModel: {
            pageSize: 6,
          },
        },
      }}
      checkboxSelection={false}
      pageSizeOptions={[6]}
      disableColumnMenu
      disableVirtualization
      disableRowSelectionOnClick
      slots={{
        pagination: DataGridFooter,
      }}
    />
  );
};

export default OrdersStatusTable;
