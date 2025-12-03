import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { createMeetingClient, type MeetingClient } from '../../services/meetingClient';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import {
  ArrowsPointingInIcon,
  ArrowsPointingOutIcon,
  ComputerDesktopIcon,
  HandRaisedIcon,
  MicrophoneIcon,
  PhoneXMarkIcon,
  VideoCameraIcon,
} from '@heroicons/react/24/outline';
import {
  ChatBubbleLeftRightIcon,
  EllipsisHorizontalIcon,
  UserGroupIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/solid';

interface VideoTileProps {
  userLabel: string;
  stream: MediaStream;
  isMuted?: boolean;
}

const VideoTile: React.FC<VideoTileProps> = ({ userLabel, stream, isMuted }) => {
  const ref = React.useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="relative flex h-full min-h-[160px] overflow-hidden rounded-2xl bg-slate-900">
      <video
        ref={ref}
        autoPlay
        playsInline
        muted={userLabel === 'You'}
        className="h-full w-full bg-black object-cover"
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-black/80 via-black/20 to-transparent px-3 py-2 text-xs text-slate-100">
        <span className="truncate font-medium">{userLabel}</span>
        {isMuted && (
          <span className="ml-2 inline-flex h-4 w-4 items-center justify-center rounded-full bg-black/50 text-[10px] font-semibold">
            M
          </span>
        )}
      </div>
    </div>
  );
};

const formatDuration = (totalSeconds: number): string => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts = [
    hours.toString().padStart(2, '0'),
    minutes.toString().padStart(2, '0'),
    seconds.toString().padStart(2, '0'),
  ];

  return parts.join(':');
};

export const MeetingPage: React.FC = () => {
  const { meetingCode } = useParams<{ meetingCode: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<{ userId: string; stream: MediaStream }[]>(
    []
  );
  const [joining, setJoining] = useState(false);
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [raisedHands, setRaisedHands] = useState<Set<string>>(new Set());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showParticipantsPanel, setShowParticipantsPanel] = useState(false);
  const [showChatPanel, setShowChatPanel] = useState(false);
  const [captionsEnabled, setCaptionsEnabled] = useState(false);
  const [isInMeeting, setIsInMeeting] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const meetingClientRef = React.useRef<MeetingClient | null>(null);
  const cameraStreamRef = React.useRef<MediaStream | null>(null);
  const screenStreamRef = React.useRef<MediaStream | null>(null);
  const meetingContainerRef = React.useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  useEffect(() => {
    if (!isInMeeting) return;

    const id = window.setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => {
      window.clearInterval(id);
    };
  }, [isInMeeting]);

  if (!meetingCode) {
    return <p className="text-sm text-slate-500">No meeting code provided.</p>;
  }

  const handleStartCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      cameraStreamRef.current = stream;
      setLocalStream(stream);
      setMicEnabled(true);
      setCameraEnabled(true);

      if (!user) return;
      if (!meetingClientRef.current) {
        meetingClientRef.current = createMeetingClient({
          classroomId: meetingCode,
          user,
          onRemoteStream: (userId, stream) => {
            setRemoteStreams((prev) => {
              const without = prev.filter((p) => p.userId !== userId);
              return [...without, { userId, stream }];
            });
          },
          onRemoteStreamRemoved: (userId) => {
            setRemoteStreams((prev) => prev.filter((p) => p.userId !== userId));
          },
          onRaiseHand: (userId, raised) => {
            setRaisedHands((prev) => {
              const next = new Set(prev);
              if (raised) {
                next.add(userId);
              } else {
                next.delete(userId);
              }
              return next;
            });
          },
        });
      }
      meetingClientRef.current.setLocalStream(stream);
    } catch (e) {
      console.error(e);
      toast.error('Could not access camera or microphone');
    }
  };

  const handleJoin = () => {
    if (!user) {
      toast.error('You must be logged in to join a meeting');
      return;
    }
    if (!meetingClientRef.current) {
      toast.error('Start camera first');
      return;
    }
    setJoining(true);
    setElapsedSeconds(0);
    setIsInMeeting(true);
    meetingClientRef.current.join();
    // Try to enter fullscreen as soon as the user joins the meeting
    toggleFullscreen();
    setTimeout(() => setJoining(false), 500);
  };

  const handleLeave = () => {
    meetingClientRef.current?.leave();
    meetingClientRef.current = null;
    setRemoteStreams([]);
    setRaisedHands(new Set());
    setIsScreenSharing(false);
    setIsInMeeting(false);
    setElapsedSeconds(0);
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((t) => t.stop());
      cameraStreamRef.current = null;
    }
    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop());
    }
    setLocalStream(null);
  };

  const toggleMic = () => {
    setMicEnabled((prev) => {
      const next = !prev;
      localStream?.getAudioTracks().forEach((t) => {
        // enable/disable audio locally and for peers
        t.enabled = next;
      });
      return next;
    });
  };

  const toggleCamera = () => {
    setCameraEnabled((prev) => {
      const next = !prev;
      localStream?.getVideoTracks().forEach((t) => {
        t.enabled = next;
      });
      return next;
    });
  };

  const toggleRaiseHand = () => {
    if (!user || !meetingClientRef.current) return;
    const userId = String(user.id);
    const currentlyRaised = raisedHands.has(userId);

    // Notify server and all other participants via WebSocket
    meetingClientRef.current.raiseHand(!currentlyRaised);

    // Optimistically update local UI state
    setRaisedHands((prev) => {
      const next = new Set(prev);
      if (currentlyRaised) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const toggleCaptions = () => {
    setCaptionsEnabled((prev) => {
      const next = !prev;
      toast(next ? 'Captions turned on (preview only)' : 'Captions turned off');
      return next;
    });
  };

  const startScreenShare = async () => {
    try {
      if (!localStream || !meetingClientRef.current) {
        toast.error('Join the meeting and start camera first');
        return;
      }
      const displayStream = await (navigator.mediaDevices as any).getDisplayMedia({
        video: true,
      });
      screenStreamRef.current = displayStream;
      const audioTracks = localStream.getAudioTracks();
      const combined = new MediaStream([
        ...audioTracks,
        ...displayStream.getVideoTracks(),
      ]);
      setLocalStream(combined);
      meetingClientRef.current.setLocalStream(combined);
      setIsScreenSharing(true);

      const [videoTrack] = displayStream.getVideoTracks();
      if (videoTrack) {
        videoTrack.onended = () => {
          stopScreenShare();
        };
      }
    } catch (e) {
      console.error(e);
      toast.error('Could not start screen sharing');
    }
  };

  const stopScreenShare = () => {
    if (!isScreenSharing) return;
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }
    if (cameraStreamRef.current && meetingClientRef.current) {
      setLocalStream(cameraStreamRef.current);
      meetingClientRef.current.setLocalStream(cameraStreamRef.current);
    }
    setIsScreenSharing(false);
  };

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        const elem = meetingContainerRef.current || document.documentElement;
        await elem.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (e) {
      console.error('Fullscreen toggle failed', e);
    }
  };

  const title = `Meeting ${meetingCode}`;
  const participantCount =
    (localStream ? 1 : 0) + remoteStreams.length;
  const durationLabel = formatDuration(elapsedSeconds);

  return (
    <div
      ref={meetingContainerRef}
      className="flex h-screen flex-col bg-gradient-to-br from-slate-50 via-slate-50 to-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-50"
    >
      {/* Top bar with meeting info */}
      <header className="flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-3 shadow-sm backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/80 md:px-6">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-900 text-xs font-semibold text-slate-50 shadow-sm dark:bg-slate-50 dark:text-slate-900">
              {title.charAt(0)}
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-semibold text-slate-900 dark:text-slate-50">
                {title}
              </h1>
              <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/40">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Ongoing
                </span>
                <span> b</span>
                <span className="tabular-nums">{durationLabel}</span>
                <span> b</span>
                <span>{participantCount || 1} participant{(participantCount || 1) !== 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden text-[11px] text-slate-500 dark:text-slate-400 sm:flex sm:flex-col sm:items-end">
            <span className="uppercase tracking-wide">Meeting code</span>
            <span className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-100">
              {meetingCode}
            </span>
          </div>
          <Button
            variant="secondary"
            type="button"
            onClick={handleStartCamera}
            className="rounded-full bg-blue-600 px-3 py-1 text-xs font-medium text-white shadow-md shadow-blue-500/40 hover:bg-blue-700"
          >
            Start camera
          </Button>
        </div>
      </header>

      {/* Main content area */}
      <main className="relative flex flex-1 gap-3 px-3 pb-28 pt-3 md:px-5 md:pb-28 md:pt-4">
        {/* Video grid */}
        <div className="flex-1 overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 shadow-2xl ring-1 ring-slate-900/60">
          <div className="flex h-full flex-col">
            <div className="flex-1 p-2 sm:p-3 md:p-4">
              <div className="grid h-full auto-rows-[minmax(0,1fr)] grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4 xl:grid-cols-5">
                {localStream && (
                  <VideoTile userLabel="You" stream={localStream} isMuted={!micEnabled} />
                )}
                {remoteStreams.map((p) => (
                  <VideoTile
                    key={p.userId}
                    userLabel={raisedHands.has(p.userId) ? `${p.userId} 4b` : p.userId}
                    stream={p.stream}
                  />
                ))}
                {!localStream && remoteStreams.length === 0 && (
                  <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-slate-600/60 bg-slate-900/60 px-4 text-center text-sm text-slate-200">
                    <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-slate-800 text-2xl font-semibold text-slate-100">
                      {user?.name?.charAt(0)?.toUpperCase() ?? 'U'}
                    </div>
                    <p className="font-medium">You re the first one here</p>
                    <p className="mt-1 text-xs text-slate-300/80">
                      Start your camera and join the meeting to see participants here.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Optional side panels (participants / chat) */}
        {(showParticipantsPanel || showChatPanel) && (
          <aside className="hidden w-72 flex-shrink-0 flex-col rounded-3xl bg-white p-3 text-sm shadow-lg ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800 md:flex">
            {showParticipantsPanel && (
              <div className="mb-3 border-b border-slate-200 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:text-slate-400">
                Participants ({participantCount || 1})
              </div>
            )}
            {showParticipantsPanel && (
              <div className="mb-4 space-y-2 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex items-center justify-between rounded-xl bg-slate-50 px-2 py-1.5 dark:bg-slate-800/70">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-[11px] font-semibold text-slate-50 dark:bg-slate-100 dark:text-slate-900">
                      {user?.name?.charAt(0)?.toUpperCase() ?? 'Y'}
                    </div>
                    <div>
                      <p className="text-xs font-medium">{user?.name ?? 'You'}</p>
                      <p className="text-[10px] text-emerald-600 dark:text-emerald-300">You</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                    Host
                  </span>
                </div>
                {remoteStreams.length === 0 && (
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">
                    Others will appear here as they join.
                  </p>
                )}
              </div>
            )}
            {showChatPanel && (
              <>
                <div className="mb-3 border-b border-slate-200 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  In-call messages
                </div>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  Chat is not fully implemented yet. Use the class chat tab for rich messaging.
                </p>
              </>
            )}
          </aside>
        )}
      </main>

      {/* Floating control bar */}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 flex justify-center px-3 md:px-4">
        <div className="pointer-events-auto flex w-full max-w-3xl items-center justify-between rounded-full bg-white/95 px-3 py-2 shadow-xl shadow-slate-500/20 ring-1 ring-slate-200 backdrop-blur dark:bg-slate-900/95 dark:ring-slate-700">
          {/* Left side: join + media controls */}
          <div className="flex items-center gap-2 md:gap-3">
            <Button
              type="button"
              onClick={handleJoin}
              disabled={joining}
              className="h-9 rounded-full bg-slate-900 px-4 text-xs font-medium text-slate-50 shadow-sm hover:bg-black dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
            >
              {joining ? (
                <span className="inline-flex items-center gap-2">
                  <Spinner size="sm" /> Joining...
                </span>
              ) : (
                'Join now'
              )}
            </Button>

            <Button
              type="button"
              variant="secondary"
              onClick={toggleMic}
              className={clsx(
                'flex h-9 w-9 items-center justify-center rounded-full p-0 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800',
                !micEnabled && 'bg-red-500 text-white hover:bg-red-600'
              )}
              title={micEnabled ? 'Mute microphone' : 'Unmute microphone'}
            >
              <MicrophoneIcon className="h-5 w-5" />
            </Button>

            <Button
              type="button"
              variant="secondary"
              onClick={toggleCamera}
              className={clsx(
                'flex h-9 w-9 items-center justify-center rounded-full p-0 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800',
                !cameraEnabled && 'bg-red-500 text-white hover:bg-red-600'
              )}
              title={cameraEnabled ? 'Turn off camera' : 'Turn on camera'}
            >
              <VideoCameraIcon className="h-5 w-5" />
            </Button>

            <Button
              type="button"
              variant="secondary"
              onClick={isScreenSharing ? stopScreenShare : startScreenShare}
              className="flex h-9 w-9 items-center justify-center rounded-full p-0 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              title={isScreenSharing ? 'Stop presenting' : 'Present screen'}
            >
              <ComputerDesktopIcon className="h-5 w-5" />
            </Button>

            <Button
              type="button"
              variant="secondary"
              onClick={toggleCaptions}
              className={clsx(
                'flex h-9 w-9 items-center justify-center rounded-full p-0 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800',
                captionsEnabled && 'bg-blue-500 text-white hover:bg-blue-600'
              )}
              title="Toggle captions (preview)"
            >
              <span className="text-[11px] font-semibold">CC</span>
            </Button>

            <Button
              type="button"
              variant="secondary"
              onClick={toggleRaiseHand}
              className={clsx(
                'flex h-9 w-9 items-center justify-center rounded-full p-0 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800',
                raisedHands.has(String(user?.id ?? '')) &&
                  'bg-emerald-500 text-white hover:bg-emerald-600'
              )}
              title="Raise hand"
            >
              <HandRaisedIcon className="h-5 w-5" />
            </Button>
          </div>

          {/* Middle: participants / chat / more */}
          <div className="hidden items-center gap-2 md:flex">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowParticipantsPanel((v) => !v)}
              className={clsx(
                'flex h-9 w-9 items-center justify-center rounded-full p-0 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800',
                showParticipantsPanel && 'bg-blue-500 text-white hover:bg-blue-600'
              )}
              title="Show participants"
            >
              <UserGroupIcon className="h-5 w-5" />
            </Button>

            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowChatPanel((v) => !v)}
              className={clsx(
                'flex h-9 w-9 items-center justify-center rounded-full p-0 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800',
                showChatPanel && 'bg-blue-500 text-white hover:bg-blue-600'
              )}
              title="Open meeting chat"
            >
              <ChatBubbleLeftRightIcon className="h-5 w-5" />
            </Button>

            <Button
              type="button"
              variant="secondary"
              className="flex h-9 w-9 items-center justify-center rounded-full p-0 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              title="More options (captions, settings)"
            >
              <EllipsisHorizontalIcon className="h-5 w-5" />
            </Button>

            <Button
              type="button"
              variant="secondary"
              className="flex h-9 w-9 items-center justify-center rounded-full p-0 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              title="Settings"
            >
              <Cog6ToothIcon className="h-5 w-5" />
            </Button>
          </div>

          {/* Right: leave button */}
          <div className="flex items-center justify-end">
            <Button
              type="button"
              onClick={handleLeave}
              className="flex h-9 items-center justify-center rounded-full bg-red-600 px-4 text-xs font-semibold text-white shadow-sm hover:bg-red-700"
              title="Leave call"
            >
              <PhoneXMarkIcon className="mr-1.5 h-4 w-4" />
              Leave
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
