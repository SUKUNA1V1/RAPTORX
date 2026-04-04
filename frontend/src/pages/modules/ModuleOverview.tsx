import Stack from '@mui/material/Stack';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';

interface ModuleOverviewProps {
  title: string;
  description: string;
}

const ModuleOverview = ({ title, description }: ModuleOverviewProps) => {
  return (
    <Paper sx={{ p: { xs: 3, md: 4 }, borderRadius: 4 }}>
      <Stack spacing={1.5}>
        <Typography variant="h3" fontWeight={700}>
          {title}
        </Typography>
        <Typography variant="body1" color="text.secondary" maxWidth={720}>
          {description}
        </Typography>
        <Typography variant="body2" color="text.secondary" mt={1}>
          This page is connected to the new template shell and ready for RaptorX module data wiring.
        </Typography>
      </Stack>
    </Paper>
  );
};

export default ModuleOverview;