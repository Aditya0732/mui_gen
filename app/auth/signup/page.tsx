'use client';

import React, { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  Divider,
  Link,
  CircularProgress,
} from '@mui/material';
import { Google as GoogleIcon } from '@mui/icons-material';

export default function SignUpPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        // Auto sign in after successful signup
        setTimeout(async () => {
          try {
            const result = await signIn('credentials', {
              email: formData.email,
              password: formData.password,
              redirect: false,
            });

            if (result?.ok && !result?.error) {
              // Successful login - redirect using Next.js router
              router.push('/');
              router.refresh(); // Refresh to update auth state
            } else {
              // If auto-login fails, redirect to signin page
              router.push('/auth/signin');
            }
          } catch (error) {
            console.error('Auto-login error:', error);
            router.push('/auth/signin');
          }
        }, 1500);
      } else {
        setError(data.error || 'Signup failed');
      }
    } catch (error) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const result = await signIn('google', {
        callbackUrl: '/',
        redirect: false,
      });

      if (result?.url && !result?.error) {
        router.push(result.url);
      } else if (result?.error) {
        setError('Google sign-in failed');
        setLoading(false);
      }
    } catch (error) {
      setError('Google sign-in failed');
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Container component='main' maxWidth='sm'>
        <Box
          sx={{
            marginTop: 8,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <Paper elevation={3} sx={{ padding: 4, textAlign: 'center' }}>
            <Typography variant='h4' color='success.main' gutterBottom>
              Account Created!
            </Typography>
            <Typography variant='body1' sx={{ mb: 2 }}>
              Your account has been created successfully. Signing you in...
            </Typography>
            <CircularProgress />
          </Paper>
        </Box>
      </Container>
    );
  }

  return (
    <Container component='main' maxWidth='sm'>
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper
          elevation={3}
          sx={{
            padding: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
          }}
        >
          <Typography component='h1' variant='h4' gutterBottom>
            Sign Up
          </Typography>

          <Typography variant='body2' color='text.secondary' sx={{ mb: 3 }}>
            Create your account to start generating components
          </Typography>

          {error && (
            <Alert severity='error' sx={{ width: '100%', mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box
            component='form'
            onSubmit={handleSubmit}
            sx={{ mt: 1, width: '100%' }}
          >
            <TextField
              margin='normal'
              required
              fullWidth
              id='name'
              label='Full Name'
              name='name'
              autoComplete='name'
              autoFocus
              value={formData.name}
              onChange={handleChange}
              disabled={loading}
            />
            <TextField
              margin='normal'
              required
              fullWidth
              id='email'
              label='Email Address'
              name='email'
              autoComplete='email'
              value={formData.email}
              onChange={handleChange}
              disabled={loading}
            />
            <TextField
              margin='normal'
              required
              fullWidth
              name='password'
              label='Password'
              type='password'
              id='password'
              autoComplete='new-password'
              value={formData.password}
              onChange={handleChange}
              disabled={loading}
            />
            <TextField
              margin='normal'
              required
              fullWidth
              name='confirmPassword'
              label='Confirm Password'
              type='password'
              id='confirmPassword'
              value={formData.confirmPassword}
              onChange={handleChange}
              disabled={loading}
            />

            <Button
              type='submit'
              fullWidth
              variant='contained'
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Sign Up'}
            </Button>

            {/* <Divider sx={{ my: 2 }}>OR</Divider>

            <Button
              fullWidth
              variant='outlined'
              startIcon={<GoogleIcon />}
              onClick={handleGoogleSignIn}
              disabled={loading}
              sx={{ mb: 2 }}
            >
              Continue with Google
            </Button> */}

            <Box sx={{ textAlign: 'center' }}>
              <Typography variant='body2'>
                Already have an account?{' '}
                <Link
                  href='/auth/signin'
                  sx={{
                    textDecoration: 'none',
                    '&:hover': { textDecoration: 'underline' },
                  }}
                >
                  Sign in here
                </Link>
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
}
