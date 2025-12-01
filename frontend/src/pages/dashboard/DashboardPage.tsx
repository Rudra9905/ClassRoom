import React, { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Card } from '../../components/ui/Card';
import { Spinner } from '../../components/ui/Spinner';
import { classroomApi } from '../../services/classroomApi';
import { assignmentApi } from '../../services/assignmentApi';
import type { Classroom, Assignment } from '../../types/domain';
import { Link } from 'react-router-dom';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [classes, setClasses] = useState<Classroom[] | null>(null);
  const [assignments, setAssignments] = useState<Assignment[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [cls, asg] = await Promise.all([
          classroomApi.getClassrooms(),
          assignmentApi.getMyAssignments(),
        ]);
        setClasses(cls);
        setAssignments(asg);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const pendingAssignments = assignments?.filter((a) => a.status === 'OPEN').length ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Hi, {user?.name.split(' ')[0] ?? 'there'}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Here&apos;s what&apos;s happening in your classes.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            My classes
          </p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">
            {loading ? <Spinner /> : classes?.length ?? 0}
          </p>
          <p className="mt-1 text-xs text-slate-500">Joined or created classrooms</p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Pending assignments
          </p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">
            {loading ? <Spinner /> : pendingAssignments}
          </p>
          <p className="mt-1 text-xs text-slate-500">Assignments still open</p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Upcoming deadlines
          </p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">
            {loading ? <Spinner /> : assignments?.length ?? 0}
          </p>
          <p className="mt-1 text-xs text-slate-500">Within your enrolled classes</p>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">My classes</h2>
            <Link
              to="/classes"
              className="text-xs font-medium text-primary-600 hover:text-primary-700"
            >
              View all
            </Link>
          </div>
          {loading && (
            <div className="py-6 text-center text-sm text-slate-500">
              <Spinner />
            </div>
          )}
          {!loading && (!classes || classes.length === 0) && (
            <p className="py-4 text-sm text-slate-500">No classes yet.</p>
          )}
          <ul className="space-y-3">
            {classes?.slice(0, 4).map((c) => (
              <li key={c.id} className="flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium text-slate-900">{c.name}</p>
                  <p className="text-xs text-slate-500">{c.teacherName}</p>
                </div>
                <Link
                  to={`/classes/${c.id}`}
                  className="text-xs font-medium text-primary-600 hover:text-primary-700"
                >
                  Open
                </Link>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Upcoming assignments</h2>
            <Link
              to="/assignments"
              className="text-xs font-medium text-primary-600 hover:text-primary-700"
            >
              View all
            </Link>
          </div>
          {loading && (
            <div className="py-6 text-center text-sm text-slate-500">
              <Spinner />
            </div>
          )}
          {!loading && (!assignments || assignments.length === 0) && (
            <p className="py-4 text-sm text-slate-500">No assignments yet.</p>
          )}
          <ul className="space-y-3">
            {assignments?.slice(0, 5).map((a) => (
              <li key={a.id} className="flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium text-slate-900">{a.title}</p>
                  <p className="text-xs text-slate-500">
                    Due {new Date(a.dueDate).toLocaleDateString()}
                  </p>
                </div>
                <Link
                  to={`/assignments/${a.id}`}
                  className="text-xs font-medium text-primary-600 hover:text-primary-700"
                >
                  Open
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
};
