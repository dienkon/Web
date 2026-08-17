import React, { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { User } from '@/types';

export default function ProfileSetup() {
  const { user, setUser } = useAuthStore();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !user) return;
    
    setLoading(true);
    try {
      const lowerName = name.trim().toLowerCase();
      const isAdmin = lowerName === 'admin' || lowerName === 'dienkon';
      const role = isAdmin ? 'admin' : 'user';

      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        displayName: name.trim(),
        role: role
      });
      setUser({ ...user, displayName: name.trim(), role: role } as User);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Welcome!</CardTitle>
          <CardDescription>Please enter your display name to continue.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Display Name
              </label>
              <Input
                id="name"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>
            <Button type="submit" className="w-full" disabled={!name.trim() || loading}>
              {loading ? 'Saving...' : 'Start'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
