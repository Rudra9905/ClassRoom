import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Tabs } from '../../components/ui/Tabs';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Spinner } from '../../components/ui/Spinner';
import { Badge } from '../../components/ui/Badge';
import { classroomApi } from '../../services/classroomApi';
import { chatApi } from '../../services/chatApi';
import { assignmentApi } from '../../services/assignmentApi';
import { fileApi } from '../../services/fileApi';
import { Link } from 'react-router-dom';
import type {
  Classroom,
  Announcement,
  Assignment,
  Member,
  ChatMessage,
} from '../../types/domain';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const TAB_IDS = {
  STREAM: 'stream',
  ASSIGNMENTS: 'assignments',
  MEMBERS: 'members',
  CHAT: 'chat',
  LIVE: 'live',
} as const;

export const ClassDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isTeacher = user?.role === 'TEACHER';

  const [activeTab, setActiveTab] = useState<string>(TAB_IDS.STREAM);
  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[] | null>(null);
  const [assignments, setAssignments] = useState<Assignment[] | null>(null);
  const [members, setMembers] = useState<Member[] | null>(null);
  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const [loading, setLoading] = useState(true);

  const [newAnnouncementTitle, setNewAnnouncementTitle] = useState('');
  const [newAnnouncementContent, setNewAnnouncementContent] = useState('');
  const [announcementFile, setAnnouncementFile] = useState<File | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [joinMeetingCode, setJoinMeetingCode] = useState('');
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [assignmentTitle, setAssignmentTitle] = useState('');
  const [assignmentDescription, setAssignmentDescription] = useState('');
  const [assignmentDueDate, setAssignmentDueDate] = useState('');
  const [assignmentMaxMarks, setAssignmentMaxMarks] = useState('');
  const [assignmentFile, setAssignmentFile] = useState<File | null>(null);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      try {
        const [cls, anns, asg, mem, msgs] = await Promise.all([
          classroomApi.getClassroom(id),
          classroomApi.getAnnouncements(id),
          classroomApi.getAssignments(id),
          classroomApi.getMembers(id),
          chatApi.getMessages(id),
        ]);
        setClassroom(cls);
        setAnnouncements(anns);
        setAssignments(asg);
        setMembers(mem);
        setMessages(msgs);
      } catch (e) {
        console.error(e);
        toast.error('Failed to load classroom');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    if (!user) return;
    try {
      let attachmentUrl: string | undefined;
      if (announcementFile) {
        const ext = announcementFile.name.split('.').pop()?.toLowerCase();
        const allowed = ['pdf', 'zip', 'jpg', 'jpeg', 'png', 'gif', 'webp'];
        if (!ext || !allowed.includes(ext)) {
          toast.error('Only PDF, image, or ZIP files are allowed');
          return;
        }
        attachmentUrl = await fileApi.upload(announcementFile);
      }
      const created = await classroomApi.createAnnouncement(id, user.id, {
        title: newAnnouncementTitle,
        content: newAnnouncementContent,
        attachmentUrl,
      });
      setAnnouncements((prev) => (prev ? [created, ...prev] : [created]));
      setNewAnnouncementTitle('');
      setNewAnnouncementContent('');
      setAnnouncementFile(null);
      toast.success('Announcement posted');
    } catch (e) {
      console.error(e);
      toast.error('Failed to post announcement');
    }
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !user) {
      toast.error('Missing classroom or user information');
      return;
    }

    const due = new Date(assignmentDueDate);
    if (Number.isNaN(due.getTime()) || due.getTime() <= Date.now()) {
      toast.error('Due date must be in the future');
      return;
    }

    try {
      let attachmentUrl: string | undefined;
      if (assignmentFile) {
        const ext = assignmentFile.name.split('.').pop()?.toLowerCase();
        const allowed = ['pdf', 'zip', 'jpg', 'jpeg', 'png', 'gif', 'webp'];
        if (!ext || !allowed.includes(ext)) {
          toast.error('Only PDF, image, or ZIP files are allowed');
          return;
        }
        attachmentUrl = await fileApi.upload(assignmentFile);
      }

      const created = await classroomApi.createAssignment(id, user.id, {
        title: assignmentTitle,
        description: assignmentDescription,
        dueDate: new Date(assignmentDueDate).toISOString(),
        maxMarks: parseInt(assignmentMaxMarks, 10),
        attachmentUrl,
      });
      setAssignments((prev) => (prev ? [created, ...prev] : [created]));
      setShowAssignmentModal(false);
      setAssignmentTitle('');
      setAssignmentDescription('');
      setAssignmentDueDate('');
      setAssignmentMaxMarks('');
      setAssignmentFile(null);
      toast.success('Assignment created');
      // Refresh dashboard if we're on it
      if (window.location.pathname === '/dashboard') {
        window.dispatchEvent(new Event('focus'));
      }
    } catch (e: any) {
      console.error('Error creating assignment:', e);
      const errorMessage = e.response?.data?.message || e.message || 'Failed to create assignment';
      toast.error(errorMessage);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !chatInput.trim() || !user) return;
    try {
      const created = await chatApi.sendMessage(id, user.id, { content: chatInput.trim() });
      setMessages((prev) => (prev ? [...prev, created] : [created]));
      setChatInput('');
    } catch (e) {
      console.error(e);
      toast.error('Failed to send message');
    }
  };

  const generateMeetingCode = () => {
    // 6-digit numeric code as string
    const n = Math.floor(100000 + Math.random() * 900000);
    return String(n);
  };

  const handleStartNewMeeting = () => {
    if (!isTeacher) {
      toast.error('Only teachers can start meetings');
      return;
    }
    const code = generateMeetingCode();
    toast.success(`Meeting code: ${code}`);
    navigate(`/meet/${code}`);
  };

  const handleJoinByCode = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = joinMeetingCode.trim();
    if (!trimmed) {
      toast.error('Enter a meeting code');
      return;
    }
    navigate(`/meet/${trimmed}`);
  };

  if (loading) {
    return (
      <div className="py-10 text-center text-sm text-slate-500">
        <Spinner />
      </div>
    );
  }

  if (!classroom) {
    return <p className="text-sm text-slate-500">Classroom not found.</p>;
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{classroom.name}</h1>
          <p className="mt-1 text-sm text-slate-500">{classroom.teacherName}</p>
          {classroom.description && (
            <p className="mt-2 text-xs text-slate-600 max-w-xl">{classroom.description}</p>
          )}
        </div>
        <div className="space-y-1 text-right text-xs text-slate-500">
          <p>
            Class code: <span className="font-mono font-medium">{classroom.code}</span>
          </p>
          {!isTeacher && user && (
            <button
              type="button"
              className="mt-1 text-xs text-red-600 hover:text-red-700"
              onClick={async () => {
                if (!id || !user) return;
                if (!confirm('Leave this class? You will lose access to all assignments and materials.')) return;
                try {
                  await classroomApi.leaveClassroom(id, user.id);
                  toast.success('Left class');
                  navigate('/classes');
                } catch (err: any) {
                  console.error(err);
                  toast.error(err.response?.data?.message || 'Failed to leave class');
                }
              }}
            >
              Leave class
            </button>
          )}
        </div>
      </header>

      <Tabs
        tabs={[
          { id: TAB_IDS.STREAM, label: 'Stream' },
          { id: TAB_IDS.ASSIGNMENTS, label: 'Assignments' },
          { id: TAB_IDS.MEMBERS, label: 'Members' },
          { id: TAB_IDS.CHAT, label: 'Chat' },
          { id: TAB_IDS.LIVE, label: 'Live' },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {activeTab === TAB_IDS.STREAM && (
        <section className="space-y-4">
          {isTeacher && (
            <Card>
              <form className="space-y-3" onSubmit={handleCreateAnnouncement}>
                <Input
                  label="Title"
                  value={newAnnouncementTitle}
                  onChange={(e) => setNewAnnouncementTitle(e.target.value)}
                  required
                />
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-slate-700">
                    Announcement
                  </label>
                  <textarea
                    className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                    rows={3}
                    value={newAnnouncementContent}
                    onChange={(e) => setNewAnnouncementContent(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-slate-700">
                    Attachment (optional)
                  </label>
                  <input
                    type="file"
                    accept="application/pdf,image/*,application/zip"
                    className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border file:border-slate-200 file:bg-slate-50 file:px-3 file:py-1 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-100"
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;
                      setAnnouncementFile(file);
                    }}
                  />
                </div>
                <div className="flex justify-end">
                  <Button type="submit">Post</Button>
                </div>
              </form>
            </Card>
          )}

          {(!announcements || announcements.length === 0) && (
            <p className="text-sm text-slate-500">No announcements yet.</p>
          )}
          <div className="space-y-3">
            {announcements?.map((a) => (
              <Card key={a.id} className="space-y-1">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <p>
                    <span className="font-medium text-slate-900">{a.title}</span>  b7{' '}
                    {a.authorName}
                  </p>
                  <div className="flex items-center gap-2">
                    <p>{new Date(a.createdAt).toLocaleString()}</p>
                    {isTeacher && (
                      <button
                        type="button"
                        className="text-xs text-red-600 hover:text-red-700"
                        onClick={async () => {
                          if (!id) return;
                          if (!confirm('Delete this announcement? This cannot be undone.')) return;
                          try {
                            await classroomApi.deleteAnnouncement(id, a.id);
                            setAnnouncements((prev) => prev?.filter((ann) => ann.id !== a.id) ?? []);
                            toast.success('Announcement deleted');
                          } catch (err) {
                            console.error(err);
                            toast.error('Failed to delete announcement');
                          }
                        }}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
                <p className="mt-1 text-sm text-slate-700">{a.content}</p>
                {a.attachmentUrl && (
                  <div className="mt-2 flex items-center gap-2">
                    <a
                      href={a.attachmentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-medium text-primary-600 hover:text-primary-700"
                    >
                      Open attachment
                    </a>
                    {isTeacher && (
                      <button
                        type="button"
                        className="text-xs text-slate-400 hover:text-red-600"
                        onClick={async () => {
                          if (!id) return;
                          try {
                            const updated = await classroomApi.clearAnnouncementAttachment(
                              id,
                              a.id
                            );
                            setAnnouncements((prev) =>
                              prev?.map((ann) => (ann.id === updated.id ? updated : ann)) ?? []
                            );
                            toast.success('Attachment removed');
                          } catch (err) {
                            console.error(err);
                            toast.error('Failed to remove attachment');
                          }
                        }}
                      >
                        Remove material
                      </button>
                    )}
                  </div>
                )}
              </Card>
            ))}
          </div>
        </section>
      )}

      {activeTab === TAB_IDS.ASSIGNMENTS && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Assignments</h2>
            {isTeacher && (
              <Button onClick={() => setShowAssignmentModal(true)}>Create assignment</Button>
            )}
          </div>

          {showAssignmentModal && (
            <Card className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">New Assignment</h3>
                <button
                  onClick={() => setShowAssignmentModal(false)}
                  className="text-xs text-slate-500 hover:text-slate-700"
                >
                  Cancel
                </button>
              </div>
              <form className="space-y-3" onSubmit={handleCreateAssignment}>
                <Input
                  label="Title"
                  value={assignmentTitle}
                  onChange={(e) => setAssignmentTitle(e.target.value)}
                  required
                />
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-slate-700">
                    Description
                  </label>
                  <textarea
                    className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                    rows={3}
                    value={assignmentDescription}
                    onChange={(e) => setAssignmentDescription(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-slate-700">
                      Due Date
                    </label>
                    <input
                      type="datetime-local"
                      className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                      value={assignmentDueDate}
                      onChange={(e) => setAssignmentDueDate(e.target.value)}
                      required
                    />
                  </div>
                  <Input
                    label="Max Marks"
                    type="number"
                    value={assignmentMaxMarks}
                    onChange={(e) => setAssignmentMaxMarks(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-slate-700">
                    Attachment (optional)
                  </label>
                  <input
                    type="file"
                    accept="application/pdf,image/*,application/zip"
                    className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border file:border-slate-200 file:bg-slate-50 file:px-3 file:py-1 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-100"
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;
                      setAssignmentFile(file);
                    }}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShowAssignmentModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">Create</Button>
                </div>
              </form>
            </Card>
          )}

          {(!assignments || assignments.length === 0) && (
            <p className="text-sm text-slate-500">No assignments yet.</p>
          )}
          <div className="space-y-3">
            {assignments?.map((a) => (
              <Card key={a.id} className="flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium text-slate-900">{a.title}</p>
                  <p className="text-xs text-slate-500">
                    Due {new Date(a.dueDate).toLocaleDateString()}  b7 Max {a.maxMarks} marks
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={a.status === 'OPEN' ? 'success' : 'default'}>
                    {a.status ?? 'OPEN'}
                  </Badge>
                  <Link
                    to={`/assignments/${a.id}`}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                  >
                    OPEN
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {activeTab === TAB_IDS.MEMBERS && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Members</h2>
          </div>
          {(!members || members.length === 0) && (
            <p className="text-sm text-slate-500">No members yet.</p>
          )}
          <ul className="divide-y divide-slate-100 rounded-2xl bg-white shadow-soft ring-1 ring-slate-100">
            {members?.map((m) => (
              <li key={m.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <div>
                  <p className="font-medium text-slate-900">{m.name}</p>
                  <p className="text-xs text-slate-500">
                    Joined {new Date(m.joinedAt).toLocaleDateString()}
                  </p>
                </div>
                <Badge variant={m.role === 'TEACHER' ? 'outline' : 'default'}>
                  {m.role === 'TEACHER' ? 'Teacher' : 'Student'}
                </Badge>
              </li>
            ))}
          </ul>
        </section>
      )}

      {activeTab === TAB_IDS.CHAT && (
        <section className="grid h-[480px] grid-rows-[1fr_auto] rounded-2xl bg-white p-4 shadow-soft ring-1 ring-slate-100">
          <div className="space-y-2 overflow-y-auto pr-1 text-sm">
            {(!messages || messages.length === 0) && (
              <p className="text-sm text-slate-500">No messages yet.</p>
            )}
            {messages?.map((m) => (
              <div key={m.id} className="rounded-xl bg-slate-50 px-3 py-2">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="font-medium text-slate-800">{m.senderName}</span>
                  <span>{new Date(m.createdAt).toLocaleTimeString()}</span>
                </div>
                <p className="mt-1 text-sm text-slate-800">{m.content}</p>
              </div>
            ))}
          </div>
          <form className="mt-3 flex gap-2" onSubmit={handleSendMessage}>
            <input
              className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-primary-500 focus:bg-white focus:ring-1 focus:ring-primary-500"
              placeholder="Write a message"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
            />
            <Button type="submit" disabled={!chatInput.trim()}>
              Send
            </Button>
          </form>
        </section>
      )}

      {activeTab === TAB_IDS.LIVE && (
        <section className="space-y-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-slate-900">Live meeting</h2>
              <p className="text-xs text-slate-500 max-w-sm">
                Teachers can start a new live meeting and share the meeting code. Students can
                join using the code.
              </p>
            </div>
            <div className="flex flex-col gap-3 md:items-end">
              {isTeacher && (
                <Button type="button" onClick={handleStartNewMeeting}>
                  Start new meeting
                </Button>
              )}
              {!isTeacher && (
                <p className="text-xs text-slate-500 text-right">
                  Ask your teacher for a meeting code and join below.
                </p>
              )}
            </div>
          </div>

          <Card className="max-w-md">
            <form className="flex flex-col gap-3 sm:flex-row sm:items-center" onSubmit={handleJoinByCode}>
              <div className="flex-1">
                <input
                  className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                  placeholder="Enter meeting code"
                  value={joinMeetingCode}
                  onChange={(e) => setJoinMeetingCode(e.target.value)}
                />
              </div>
              <Button type="submit" className="shrink-0">
                Join by code
              </Button>
            </form>
          </Card>
        </section>
      )}
    </div>
  );
};
