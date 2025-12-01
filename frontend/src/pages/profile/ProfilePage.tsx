import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Avatar } from '../../components/ui/Avatar';
import toast from 'react-hot-toast';

export const ProfilePage: React.FC = () => {
  const { user, login, token } = useAuth();
  const [name, setName] = useState(user?.name ?? '');

  if (!user) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, call profile update API; for now just update local auth state
    login({ ...user, name }, token ?? '');
    toast.success('Profile updated');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Profile</h1>
        <p className="mt-1 text-sm text-slate-500">Manage your basic information.</p>
      </div>
      <Card className="flex flex-col gap-6 md:flex-row md:items-start">
        <div className="flex flex-col items-center gap-2 md:w-48">
          <Avatar name={user.name} size="lg" />
          <p className="text-xs text-slate-500 capitalize">{user.role.toLowerCase()}</p>
        </div>
        <form className="flex-1 space-y-4" onSubmit={handleSave}>
          <Input
            label="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Input label="Email" value={user.email} disabled />
          <div>
            <Button type="submit">Save changes</Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
