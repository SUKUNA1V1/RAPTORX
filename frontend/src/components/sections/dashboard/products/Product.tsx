import { fontFamily } from 'theme/typography';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import IconifyIcon from 'components/base/IconifyIcon';

interface ProductInfoProps {
  data: {
    rank: number;
    name: string;
    inStock: number | string;
    price: number | string;
  };
}

const rankIcons: Record<number, { icon: string; color: string }> = {
  1: { icon: 'noto:1st-place-medal', color: '#FFD700' },
  2: { icon: 'noto:2nd-place-medal', color: '#C0C0C0' },
  3: { icon: 'noto:3rd-place-medal', color: '#CD7F32' },
};

const Product = ({ data }: ProductInfoProps) => {
  const { rank, name, inStock, price } = data;
  const rankConfig = rankIcons[rank] || { icon: 'mdi:medal-outline', color: '#888' };

  return (
    <Stack alignItems="center" justifyContent="space-between">
      <Stack spacing={2} alignItems="center">
        <Box
          height={46}
          width={46}
          display="flex"
          alignItems="center"
          justifyContent="center"
          bgcolor="background.paper"
          borderRadius={1.25}
          sx={{ border: '1px solid', borderColor: 'divider' }}
        >
          <IconifyIcon icon={rankConfig.icon} sx={{ fontSize: 28 }} />
        </Box>

        <Stack direction="column">
          <Typography variant="body2" fontWeight={600}>
            {name}
          </Typography>
          <Typography variant="caption" color="text.secondary" fontWeight={500}>
            Score: {inStock}
          </Typography>
        </Stack>
      </Stack>

      <Typography variant="caption" fontWeight={400} fontFamily={fontFamily.workSans}>
        {price}
      </Typography>
    </Stack>
  );
};

export default Product;
