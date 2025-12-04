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
  MicrophoneIcon,
  VideoCameraIcon,
  PhoneXMarkIcon,
  UserGroupIcon,
  Cog6ToothIcon,
  ChatBubbleLeftRightIcon,
  HandRaisedIcon,
  VideoCameraSlashIcon,
  MicrophoneIcon as MicrophoneSlashIcon,
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
    <div className="relative flex h-full min-h-[96px] overflow-hidden rounded-xl bg-slate-900">
      <video
        ref={ref}
        autoPlay
        playsInline
        muted={userLabel === 'You'}
        className="h-full w-full bg-slate-800 object-cover"
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-black/80 to-transparent px-2 py-1.5 text-xs text-white">
        <span className="truncate font-medium">{userLabel}</span>
        {isMuted && (
          <span className="ml-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-black/50 text-[10px] font-medium">
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
      // Request camera and microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true, 
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        } 
      });
      
      // Store the stream reference
      cameraStreamRef.current = stream;
      setLocalStream(stream);
      setMicEnabled(true);
      setCameraEnabled(true);

      if (!user) {
        toast.error('You must be logged in to start a meeting');
        return;
      }

      // Initialize meeting client if not already done
      if (!meetingClientRef.current) {
        try {
          meetingClientRef.current = createMeetingClient({
            classroomId: meetingCode,
            user,
            onRemoteStream: (userId, stream) => {
              console.log('Received remote stream from user:', userId);
              setRemoteStreams((prev) => {
                const without = prev.filter((p) => p.userId !== userId);
                return [...without, { userId, stream }];
              });
              toast.success(`User ${userId} joined the meeting`);
            },
            onRemoteStreamRemoved: (userId) => {
              console.log('Remote stream removed for user:', userId);
              setRemoteStreams((prev) => prev.filter((p) => p.userId !== userId));
              toast.info(`User ${userId} left the meeting`);
            },
            onRaiseHand: (userId, raised) => {
              console.log(`User ${userId} ${raised ? 'raised' : 'lowered'} hand`);
              setRaisedHands((prev) => {
                const next = new Set(prev);
                if (raised) {
                  next.add(userId);
                  toast.info(`User ${userId} raised their hand`);
                } else {
                  next.delete(userId);
                }
                return next;
              });
            },
          });
          
          // Set up error handling for the meeting client
          meetingClientRef.current.onerror = (error) => {
            console.error('Meeting client error:', error);
            toast.error(`Connection error: ${error.message || 'Unknown error'}`);
          };
          
          // Auto-join the meeting after a short delay to ensure everything is ready
          setTimeout(handleJoin, 500);
          
        } catch (error) {
          console.error('Failed to create meeting client:', error);
          toast.error('Failed to initialize meeting. Please try again.');
          // Clean up on error
          stream.getTracks().forEach(track => track.stop());
          setLocalStream(null);
          return;
        }
      }
      
      // Set the local stream for the meeting client
      meetingClientRef.current.setLocalStream(stream);
      
    } catch (error) {
      console.error('Error accessing media devices:', error);
      let errorMessage = 'Could not access camera or microphone';
      
      if (error instanceof DOMException) {
        if (error.name === 'NotAllowedError') {
          errorMessage = 'Permission denied. Please allow camera and microphone access to continue.';
        } else if (error.name === 'NotFoundError') {
          errorMessage = 'No camera or microphone found. Please connect a device and try again.';
        } else if (error.name === 'NotReadableError') {
          errorMessage = 'Could not access camera or microphone. Another application might be using it.';
        }
      }
      
      toast.error(errorMessage);
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
    
    try {
      meetingClientRef.current.join();
      setIsInMeeting(true);
      toast.success('Successfully joined the meeting!');
      
      // Try to enter fullscreen as soon as the user joins the meeting
      toggleFullscreen().catch(error => {
        console.warn('Could not enter fullscreen:', error);
        // Not a critical error, so just log it
      });
      
    } catch (error) {
      console.error('Failed to join meeting:', error);
      toast.error('Failed to join meeting. Please try again.');
      setIsInMeeting(false);
    } finally {
      setJoining(false);
    }
  };

  const handleLeave = async () => {
    try {
      // Notify the server and other participants that we're leaving
      if (meetingClientRef.current) {
        meetingClientRef.current.leave();
        meetingClientRef.current = null;
      }
      
      // Stop all media tracks
      const stopAllTracks = (stream: MediaStream | null) => {
        if (stream) {
          stream.getTracks().forEach(track => {
            track.stop();
            stream.removeTrack(track);
          });
        }
      };
      
      stopAllTracks(screenStreamRef.current);
      screenStreamRef.current = null;
      
      stopAllTracks(cameraStreamRef.current);
      cameraStreamRef.current = null;
      
      stopAllTracks(localStream);
      
      // Exit fullscreen if we're in it
      if (document.fullscreenElement) {
        try {
          await document.exitFullscreen();
        } catch (error) {
          console.warn('Error exiting fullscreen:', error);
        }
      }
      
      // Reset all state
      setRemoteStreams([]);
      setRaisedHands(new Set());
      setIsScreenSharing(false);
      setIsInMeeting(false);
      setElapsedSeconds(0);
      setLocalStream(null);
      
      toast.success('You have left the meeting');
      
    } catch (error) {
      console.error('Error leaving meeting:', error);
      toast.error('Error leaving meeting');
    }
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

  const participantCount =
    (localStream ? 1 : 0) + remoteStreams.length;
  const durationLabel = formatDuration(elapsedSeconds);

  return (
    <div ref={meetingContainerRef} className="flex h-screen flex-col bg-white">
      {/* Top bar with meeting info */}
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-xs font-semibold text-white">
            SC
          </div>
          <div>
            <h1 className="text-sm font-medium text-slate-900">Smart Classroom</h1>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>{meetingCode}</span>
              <span>•</span>
              <span>{participantCount} {participantCount === 1 ? 'participant' : 'participants'}</span>
              <span>•</span>
              <span className="font-medium">{durationLabel}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={toggleFullscreen}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
          >
            {isFullscreen ? 
              <ArrowsPointingInIcon className="h-4 w-4" /> : 
              <ArrowsPointingOutIcon className="h-4 w-4" />
            }
          </button>
          <button 
            onClick={handleLeave}
            className="flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-100"
          >
            <PhoneXMarkIcon className="h-4 w-4" />
            <span>End</span>
          </button>
        </div>
      </header>

      {/* Main content area */}
      <main className="relative flex flex-1 overflow-hidden">
        {/* Video grid */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="mx-auto max-w-6xl">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
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
                <div className="col-span-full flex h-64 flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-6 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                    <VideoCameraSlashIcon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-3 text-sm font-medium text-slate-900">No active video</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Start your camera to begin the meeting
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Optional side panels (participants / chat) */}
        {(showParticipantsPanel || showChatPanel) && (
          <aside className="w-80 flex-shrink-0 flex-col border-l border-slate-200 bg-white text-sm md:flex">
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
      <footer className="fixed bottom-0 left-0 right-0 z-10 border-t border-slate-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-1">
            <button
              onClick={toggleMic}
              className={`flex h-10 w-10 items-center justify-center rounded-full text-slate-700 hover:bg-slate-100 ${!micEnabled ? 'bg-red-50 text-red-600 hover:bg-red-50' : ''}`}
            >
              {micEnabled ? (
                <MicrophoneIcon className="h-5 w-5" />
              ) : (
                <MicrophoneSlashIcon className="h-5 w-5" />
              )}
            </button>
            <button
              onClick={toggleCamera}
              className={`flex h-10 w-10 items-center justify-center rounded-full text-slate-700 hover:bg-slate-100 ${!cameraEnabled ? 'bg-red-50 text-red-600 hover:bg-red-50' : ''}`}
            >
              {cameraEnabled ? (
                <VideoCameraSlashIcon className="h-5 w-5" />
              ) : (
                <VideoCameraSlashIcon className="h-5 w-5" />
              )}
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={isScreenSharing ? stopScreenShare : startScreenShare}
              className={`flex h-10 w-10 items-center justify-center rounded-full ${isScreenSharing ? 'bg-blue-50 text-blue-600' : 'text-slate-700 hover:bg-slate-100'}`}
            >
              <ComputerDesktopIcon className="h-5 w-5" />
            </button>
            <button
              onClick={toggleRaiseHand}
              className={`flex h-10 w-10 items-center justify-center rounded-full ${raisedHands.has(String(user?.id)) ? 'bg-yellow-50 text-yellow-600' : 'text-slate-700 hover:bg-slate-100'}`}
            >
              <HandRaisedIcon className="h-5 w-5" />
            </button>
            <button
              onClick={() => {
                setShowParticipantsPanel(!showParticipantsPanel);
                if (showChatPanel) setShowChatPanel(false);
              }}
              className={`flex h-10 w-10 items-center justify-center rounded-full ${showParticipantsPanel ? 'bg-blue-50 text-blue-600' : 'text-slate-700 hover:bg-slate-100'}`}
            >
              <UserGroupIcon className="h-5 w-5" />
            </button>
            <button
              onClick={() => {
                setShowChatPanel(!showChatPanel);
                if (showParticipantsPanel) setShowParticipantsPanel(false);
              }}
              className={`flex h-10 w-10 items-center justify-center rounded-full ${showChatPanel ? 'bg-blue-50 text-blue-600' : 'text-slate-700 hover:bg-slate-100'}`}
            >
              <ChatBubbleLeftRightIcon className="h-5 w-5" />
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button className="flex h-10 w-10 items-center justify-center rounded-full text-slate-700 hover:bg-slate-100">
              <Cog6ToothIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
