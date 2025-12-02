import React, { useEffect, useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Spinner } from '../../components/ui/Spinner';
import { classroomApi } from '../../services/classroomApi';
import type { Classroom } from '../../types/domain';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export const ClassesPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [classes, setClasses] = useState<Classroom[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [joinCode, setJoinCode] = useState('');

  const isTeacher = user?.role === 'TEACHER';

  const load = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await classroomApi.getClassrooms(
        user.role === 'TEACHER'
          ? { teacherId: user.id }
          : { studentId: user.id }
      );
      setClasses(data);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load classes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('You must be logged in to create a class');
      return;
    }
    try {
      await classroomApi.createClassroom(user.id, { name, description });
      toast.success('Class created');
      setCreateOpen(false);
      setName('');
      setDescription('');
      await load();
      // Refresh dashboard if we're on it
      if (window.location.pathname === '/dashboard') {
        window.dispatchEvent(new Event('focus'));
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to create class');
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('You must be logged in to join a class');
      return;
    }
    try {
      await classroomApi.joinClassroom(user.id, joinCode);
      toast.success('Joined class');
      setJoinOpen(false);
      setJoinCode('');
      load();
    } catch (e) {
      console.error(e);
      toast.error('Failed to join class');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">My classes</h1>
          <p className="mt-1 text-sm text-slate-500">
            View and manage your classrooms.
          </p>
        </div>
        <div className="flex gap-2">
          {isTeacher && (
            <Button variant="secondary" onClick={() => setCreateOpen(true)}>
              + Create class
            </Button>
          )}
          <Button onClick={() => setJoinOpen(true)}>Join class</Button>
        </div>
      </div>

      {loading && (
        <div className="py-10 text-center text-sm text-slate-500">
          <Spinner />
        </div>
      )}

      {!loading && (!classes || classes.length === 0) && (
        <Card className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-900">No classes yet</p>
            <p className="text-xs text-slate-500">
              {isTeacher
                ? 'Create a class and share the code with your students.'
                : 'Ask your teacher for a class code to join.'}
            </p>
          </div>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {classes?.map((c) => (
          <Card
            key={c.id}
            className="flex cursor-pointer flex-col justify-between hover:-translate-y-0.5 hover:shadow-lg transition"
            onClick={() => navigate(`/class/${c.id}`)}
          >
            <div>
              <h2 className="text-sm font-semibold text-slate-900">{c.name}</h2>
              <p className="mt-1 text-xs text-slate-500">{c.teacherName}</p>
              {c.description && (
                <p className="mt-2 line-clamp-2 text-xs text-slate-600">{c.description}</p>
              )}
            </div>
            <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
              <span>Class code: {c.code}</span>
              <button 
                className="text-primary-600 hover:text-primary-700"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/class/${c.id}`);
                }}
              >
                Open
              </button>
            </div>
          </Card>
        ))}
      </div>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create class">
        <form className="space-y-4" onSubmit={handleCreate}>
          <Input
            label="Class name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">Description</label>
            <textarea
              className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Create</Button>
          </div>
        </form>
      </Modal>

      <Modal open={joinOpen} onClose={() => setJoinOpen(false)} title="Join class">
        <form className="space-y-4" onSubmit={handleJoin}>
          <Input
            label="Class code"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            required
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setJoinOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Join</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
