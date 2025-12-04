import type { User } from '../types/domain';

const WS_BASE_URL = import.meta.env.VITE_WS_URL || `ws://${window.location.host}/ws`;

export type MeetingSignalMessage = {
  type: string;
  classroomId: string;
  fromUserId?: string;
  toUserId?: string;
  participants?: (string | number)[];
  payload?: any;
  userId?: string | number;
};

interface MeetingClientOptions {
  classroomId: string;
  user: User;
  onRemoteStream: (userId: string, stream: MediaStream) => void;
  onRemoteStreamRemoved: (userId: string) => void;
  onRaiseHand?: (userId: string, raised: boolean) => void;
}

export interface MeetingClient {
  setLocalStream(stream: MediaStream | null): void;
  join(): void;
  leave(): void;
  raiseHand(raised: boolean): void;
}

export function createMeetingClient(options: MeetingClientOptions): MeetingClient {
  const { classroomId, user, onRemoteStream, onRemoteStreamRemoved, onRaiseHand } = options;

  let socket: WebSocket | null = null;
  let localStream: MediaStream | null = null;
  const peers = new Map<string, RTCPeerConnection>();

  const iceServers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
  ];

  function send(message: Omit<MeetingSignalMessage, 'classroomId' | 'fromUserId'> & {
    toUserId?: string;
  }) {
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    const full: MeetingSignalMessage = {
      classroomId,
      fromUserId: user.id,
      ...message,
    } as MeetingSignalMessage;
    socket.send(JSON.stringify(full));
  }

  function createPeerConnection(remoteUserId: string, isInitiator: boolean) {
    if (peers.has(remoteUserId)) return peers.get(remoteUserId)!;

    const pc = new RTCPeerConnection({ iceServers });

    if (localStream) {
      localStream.getTracks().forEach((track) => pc.addTrack(track, localStream!));
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        send({
          type: 'ice-candidate',
          toUserId: remoteUserId,
          payload: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      const [stream] = event.streams;
      if (stream) {
        onRemoteStream(remoteUserId, stream);
      }
    };

    peers.set(remoteUserId, pc);

    if (isInitiator) {
      pc
        .createOffer()
        .then((offer) => pc.setLocalDescription(offer))
        .then(() => {
          if (pc.localDescription) {
            send({
              type: 'offer',
              toUserId: remoteUserId,
              payload: pc.localDescription,
            });
          }
        })
        .catch((err) => console.error('Error creating offer', err));
    }

    return pc;
  }

  function updateSendersForNewStream() {
    if (!localStream) return;
    
    const videoTrack = localStream.getVideoTracks()[0];
    const audioTrack = localStream.getAudioTracks()[0];

    peers.forEach((pc) => {
      const senders = pc.getSenders();
      let hasVideoSender = false;
      let hasAudioSender = false;

      senders.forEach((sender) => {
        if (sender.track?.kind === 'video') {
          hasVideoSender = true;
          if (videoTrack) {
            sender.replaceTrack(videoTrack).catch((err) =>
              console.error('Error replacing video track', err)
            );
          } else {
            sender.replaceTrack(null).catch((err) =>
              console.error('Error removing video track', err)
            );
          }
        }
        if (sender.track?.kind === 'audio') {
          hasAudioSender = true;
          if (audioTrack) {
            sender.replaceTrack(audioTrack).catch((err) =>
              console.error('Error replacing audio track', err)
            );
          } else {
            sender.replaceTrack(null).catch((err) =>
              console.error('Error removing audio track', err)
            );
          }
        }
      });

      if (!hasVideoSender && videoTrack && localStream) {
        pc.addTrack(videoTrack, localStream);
      }
      if (!hasAudioSender && audioTrack && localStream) {
        pc.addTrack(audioTrack, localStream);
      }
    });
  }

  function handleMessage(raw: MessageEvent<string>) {
    let msg: MeetingSignalMessage;
    try {
      msg = JSON.parse(raw.data);
    } catch (e) {
      console.error('Invalid meeting message', raw.data, e);
      return;
    }

    if (String(msg.classroomId) !== String(classroomId)) return;

    switch (msg.type) {
      case 'existing-participants': {
        const participants = (msg.participants ?? []).map(String);
        participants.forEach((remoteId) => {
          if (remoteId === user.id) return;
          createPeerConnection(remoteId, true);
        });
        break;
      }
      case 'offer': {
        if (!msg.fromUserId || !msg.payload) return;
        const remoteId = String(msg.fromUserId);
        const pc = createPeerConnection(remoteId, false);
        pc
          .setRemoteDescription(new RTCSessionDescription(msg.payload))
          .then(() => pc.createAnswer())
          .then((answer) => pc.setLocalDescription(answer))
          .then(() => {
            if (pc.localDescription) {
              send({
                type: 'answer',
                toUserId: remoteId,
                payload: pc.localDescription,
              });
            }
          })
          .catch((err) => console.error('Error handling offer', err));
        break;
      }
      case 'answer': {
        if (!msg.fromUserId || !msg.payload) return;
        const remoteId = String(msg.fromUserId);
        const pc = peers.get(remoteId);
        if (!pc) return;
        pc
          .setRemoteDescription(new RTCSessionDescription(msg.payload))
          .catch((err) => console.error('Error handling answer', err));
        break;
      }
      case 'ice-candidate': {
        if (!msg.fromUserId || !msg.payload) return;
        const remoteId = String(msg.fromUserId);
        const pc = peers.get(remoteId);
        if (!pc) return;
        pc
          .addIceCandidate(new RTCIceCandidate(msg.payload))
          .catch((err) => console.error('Error handling ICE candidate', err));
        break;
      }
      case 'participant-left': {
        const remoteId = String(msg.userId ?? '');
        const pc = peers.get(remoteId);
        if (pc) {
          pc.close();
          peers.delete(remoteId);
        }
        onRemoteStreamRemoved(remoteId);
        break;
      }
      case 'raise-hand': {
        if (!onRaiseHand || !msg.fromUserId) return;
        const raised = Boolean(msg.payload?.raised ?? true);
        onRaiseHand(String(msg.fromUserId), raised);
        break;
      }
      default:
        break;
    }
  }

  function cleanup() {
    peers.forEach((pc) => pc.close());
    peers.clear();
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.close();
    }
    socket = null;
  }

  return {
    setLocalStream(stream: MediaStream | null) {
      localStream = stream;
      if (peers.size > 0 && localStream) {
        updateSendersForNewStream();
      }
    },
    join() {
      if (socket && socket.readyState === WebSocket.OPEN) return;

      const wsUrl = `${WS_BASE_URL}/meet`;
      console.log('Connecting to WebSocket:', wsUrl);
      socket = new WebSocket(wsUrl);
      socket.onopen = () => {
        const joinMsg: MeetingSignalMessage = {
          type: 'join',
          classroomId,
          fromUserId: user.id,
        };
        socket?.send(JSON.stringify(joinMsg));
      };
      socket.onmessage = handleMessage as (ev: MessageEvent) => void;
      socket.onclose = () => {
        cleanup();
      };
      socket.onerror = (e) => {
        console.error('Meeting WebSocket error', e);
      };
    },
    leave() {
      if (socket && socket.readyState === WebSocket.OPEN) {
        const leaveMsg: MeetingSignalMessage = {
          type: 'leave',
          classroomId,
          fromUserId: user.id,
        };
        socket.send(JSON.stringify(leaveMsg));
      }
      cleanup();
    },
    raiseHand(raised: boolean) {
      send({
        type: 'raise-hand',
        payload: { raised },
      });
    },
  };
}
