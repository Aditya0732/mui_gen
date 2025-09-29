import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth';
import { NextRequest } from 'next/server';

export async function getAuthUser(request?: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    return session?.user || null;
  } catch (error) {
    console.error('Error getting auth user:', error);
    return null;
  }
}

export async function requireAuth(request?: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) {
    throw new Error('Authentication required');
  }
  return user;
}
