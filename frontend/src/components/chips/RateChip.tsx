import Chip from '@mui/material/Chip';

interface RateChipProps {
  rate: string;
  isUp: boolean;
}

const RateChip = ({ rate, isUp }: RateChipProps) => {
  return (
    <Chip
      variant="outlined"
      size="small"
      label={rate}
      sx={{
        px: 0.5,
        minWidth: 62,
        color: isUp ? 'success.main' : 'error.main',
        bgcolor: isUp ? 'transparent.success.main' : 'transparent.error.main',
        borderColor: isUp ? 'transparent.success.main' : 'transparent.error.main',
      }}
    />
  );
};

export default RateChip;
