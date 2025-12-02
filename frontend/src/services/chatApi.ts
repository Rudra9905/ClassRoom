import { apiClient } from './apiClient';
import type { ChatMessage } from '../types/domain';

type ChatMessageResponseDTO = {
  id: number;
  classroomId: number;
  sender: {
    id: number;
    name: string;
    email: string;
    role: string;
  };
  content: string;
  createdAt: string;
};

const mapChatMessage = (dto: ChatMessageResponseDTO): ChatMessage => ({
  id: String(dto.id),
  classroomId: String(dto.classroomId),
  senderName: dto.sender.name,
  content: dto.content,
  createdAt: dto.createdAt,
});

export const chatApi = {
  async getMessages(classroomId: string): Promise<ChatMessage[]> {
    const { data } = await apiClient.get<ChatMessageResponseDTO[]>(
      `/classrooms/${classroomId}/chat/messages`
    );
    return data.map(mapChatMessage);
  },
  async sendMessage(
    classroomId: string,
    senderId: string,
    payload: { content: string }
  ): Promise<ChatMessage> {
    const { data } = await apiClient.post<ChatMessageResponseDTO>(
      `/classrooms/${classroomId}/chat/messages`,
      payload,
      { params: { senderId } }
    );
    return mapChatMessage(data);
  },
};
