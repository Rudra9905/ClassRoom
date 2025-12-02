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
        <span className="font-medium truncate">{userLabel}</span>
        {isMuted && (
          <span className="ml-2 inline-flex h-4 w-4 items-center justify-center rounded-full bg-black/50 text-[10px] font-semibold">
            M
          </span>
        )}
      </div>
    </div>
  );
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

  const meetingClientRef = React.useRef<MeetingClient | null>(null);
  const cameraStreamRef = React.useRef<MediaStream | null>(null);
  const screenStreamRef = React.useRef<MediaStream | null>(null);
  const meetingContainerRef = React.useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

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

  return (
    <div
      ref={meetingContainerRef}
      className="flex h-screen flex-col bg-slate-900 text-slate-50"
    >
      <header className="flex items-center justify-between border-b border-slate-800 px-4 py-3 md:px-6">
        <div>
          <h1 className="text-sm font-medium text-slate-200">{title}</h1>
          <p className="mt-0.5 text-xs text-slate-400">
            Code: <span className="font-mono">{meetingCode}</span>
          </p>
        </div>
        <Button
          variant="secondary"
          type="button"
          onClick={handleStartCamera}
          className="rounded-full border-slate-700 bg-slate-800/80 px-3 py-1 text-xs text-slate-100 hover:bg-slate-700"
        >
          Start camera
        </Button>
      </header>

      <main className="flex flex-1 flex-col gap-4 px-4 pb-28 pt-4 md:px-8">
        <div className="flex-1 rounded-3xl border border-slate-800 bg-slate-900/60 p-3 md:p-4">
          <div className="grid h-full auto-rows-[minmax(0,1fr)] gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {localStream && (
              <VideoTile userLabel="You" stream={localStream} isMuted={!micEnabled} />
            )}
            {remoteStreams.map((p) => (
              <VideoTile
                key={p.userId}
                userLabel={raisedHands.has(p.userId) ? `${p.userId} ✋` : p.userId}
                stream={p.stream}
              />
            ))}
            {!localStream && remoteStreams.length === 0 && (
              <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-900/60 px-4 text-center text-sm text-slate-400">
                Start your camera and join the meeting to see participants here.
              </div>
            )}
          </div>
        </div>
      </main>

      <div className="pointer-events-none fixed inset-x-0 bottom-4 flex justify-center px-4">
        <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-slate-700 bg-slate-900/95 px-3 py-2 shadow-2xl">
          <Button
            type="button"
            onClick={handleJoin}
            disabled={joining}
            className="h-10 rounded-full bg-slate-100 px-4 text-xs font-medium text-slate-900 hover:bg-white"
          >
            {joining ? (
              <span className="inline-flex items-center gap-2">
                <Spinner size="sm" /> Joining...
              </span>
            ) : (
              'Join'
            )}
          </Button>

          <Button
            type="button"
            variant="secondary"
            onClick={toggleMic}
            className={clsx(
              'flex h-10 w-10 items-center justify-center rounded-full p-0',
              !micEnabled && 'bg-red-600 text-white hover:bg-red-700'
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
              'flex h-10 w-10 items-center justify-center rounded-full p-0',
              !cameraEnabled && 'bg-red-600 text-white hover:bg-red-700'
            )}
            title={cameraEnabled ? 'Turn off camera' : 'Turn on camera'}
          >
            <VideoCameraIcon className="h-5 w-5" />
          </Button>

          <Button
            type="button"
            variant="secondary"
            onClick={isScreenSharing ? stopScreenShare : startScreenShare}
            className="flex h-10 w-10 items-center justify-center rounded-full p-0"
            title={isScreenSharing ? 'Stop presenting' : 'Present screen'}
          >
            <ComputerDesktopIcon className="h-5 w-5" />
          </Button>

          <Button
            type="button"
            variant="secondary"
            onClick={toggleRaiseHand}
            className={clsx(
              'flex h-10 w-10 items-center justify-center rounded-full p-0',
              raisedHands.has(String(user?.id ?? '')) &&
                'bg-amber-500 text-slate-900 hover:bg-amber-600'
            )}
            title="Raise hand"
          >
            <HandRaisedIcon className="h-5 w-5" />
          </Button>

          <Button
            type="button"
            variant="secondary"
            onClick={toggleFullscreen}
            className="flex h-10 w-10 items-center justify-center rounded-full p-0"
            title={isFullscreen ? 'Exit full screen' : 'Full screen'}
          >
            {isFullscreen ? (
              <ArrowsPointingInIcon className="h-5 w-5" />
            ) : (
              <ArrowsPointingOutIcon className="h-5 w-5" />
            )}
          </Button>

          <Button
            type="button"
            onClick={handleLeave}
            className="flex h-10 w-12 items-center justify-center rounded-full bg-red-600 p-0 text-white hover:bg-red-700"
            title="Leave call"
          >
            <PhoneXMarkIcon className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};
