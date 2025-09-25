'use client';

import { Card, CardContent, Box, Typography } from '@mui/material';
import { ReactNode } from 'react';

interface FeatureCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  color: 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error';
}

export function FeatureCard({ icon, title, description, color }: FeatureCardProps) {
  return (
    <Card
      sx={{
        height: '100%',
        transition: 'all 0.3s ease-in-out',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: (theme) => theme.shadows[8],
        },
      }}
    >
      <CardContent sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 64,
            height: 64,
            borderRadius: 2,
            backgroundColor: `${color}.light`,
            color: `${color}.contrastText`,
            mb: 2,
            mx: 'auto',
          }}
        >
          {icon}
        </Box>

        <Typography
          variant="h6"
          component="h3"
          gutterBottom
          textAlign="center"
          sx={{ fontWeight: 600 }}
        >
          {title}
        </Typography>

        <Typography
          variant="body2"
          color="text.secondary"
          textAlign="center"
          sx={{ flexGrow: 1 }}
        >
          {description}
        </Typography>
      </CardContent>
    </Card>
  );
}
