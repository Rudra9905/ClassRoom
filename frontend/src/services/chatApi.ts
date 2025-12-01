import { apiClient } from './apiClient';
import type { ChatMessage } from '../types/domain';

export const chatApi = {
  async getMessages(classroomId: string): Promise<ChatMessage[]> {
    const { data } = await apiClient.get<ChatMessage[]>(
      `/classrooms/${classroomId}/chat/messages`
    );
    return data;
  },
  async sendMessage(
    classroomId: string,
    payload: { content: string }
  ): Promise<ChatMessage> {
    const { data } = await apiClient.post<ChatMessage>(
      `/classrooms/${classroomId}/chat/messages`,
      payload
    );
    return data;
  },
};
