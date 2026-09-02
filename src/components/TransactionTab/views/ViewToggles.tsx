import Box from '@mui/material/Box';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import type { FC } from 'react';

interface ViewTogglesProps {
  value: number;
  onChange: (value: number) => void;
}

export const ViewToggles: FC<ViewTogglesProps> = ({ value, onChange }) => {
  return (
    <Box
      sx={{
        bgcolor: 'background.paper',
        borderBottom: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        overflow: 'hidden',
      }}
    >
      <Tabs
        value={value}
        onChange={(_, newValue) => onChange(newValue)}
        indicatorColor="primary"
        textColor="primary"
        variant="fullWidth"
        aria-label="View mode navigation tabs"
        sx={{
          WebkitTapHighlightColor: 'transparent',
          '& .MuiTab-root': {
            fontWeight: 600,
            textTransform: 'none',
            color: 'text.secondary',
            '&.Mui-selected': {
              color: 'primary.main',
            },
          },
        }}
      >
        <Tab label="Daily" value={0} />
        <Tab label="Monthly" value={1} />
        <Tab label="Yearly" value={2} />
      </Tabs>
    </Box>
  );
};

export default ViewToggles;