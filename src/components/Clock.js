import React, { useState, useEffect } from 'react';
import { Box, Typography } from '@mui/joy';

const Clock = () => {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <Box sx={{ mb: 1 }}>
      <Typography level="body3" sx={{ mb: 0.5 }}>
        {time.toLocaleTimeString()}
      </Typography>
      <Typography level="body2" sx={{ color: 'text.secondary' }}>
        {time.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
      </Typography>
    </Box>
  );
};

export default React.memo(Clock);
