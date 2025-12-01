import { apiClient } from './apiClient';
import type { Announcement, Assignment, Classroom, Member } from '../types/domain';

export const classroomApi = {
  async getClassrooms(): Promise<Classroom[]> {
    const { data } = await apiClient.get<Classroom[]>('/classrooms');
    return data;
  },
  async createClassroom(payload: { name: string; description?: string }): Promise<Classroom> {
    const { data } = await apiClient.post<Classroom>('/classrooms', payload);
    return data;
  },
  async joinClassroom(code: string): Promise<Classroom> {
    const { data } = await apiClient.post<Classroom>('/classrooms/join', { code });
    return data;
  },
  async getClassroom(id: string): Promise<Classroom> {
    const { data } = await apiClient.get<Classroom>(`/classrooms/${id}`);
    return data;
  },
  async getAnnouncements(classroomId: string): Promise<Announcement[]> {
    const { data } = await apiClient.get<Announcement[]>(
      `/classrooms/${classroomId}/announcements`
    );
    return data;
  },
  async createAnnouncement(
    classroomId: string,
    payload: { title: string; content: string }
  ): Promise<Announcement> {
    const { data } = await apiClient.post<Announcement>(
      `/classrooms/${classroomId}/announcements`,
      payload
    );
    return data;
  },
  async getAssignments(classroomId: string): Promise<Assignment[]> {
    const { data } = await apiClient.get<Assignment[]>(
      `/classrooms/${classroomId}/assignments`
    );
    return data;
  },
  async getMembers(classroomId: string): Promise<Member[]> {
    const { data } = await apiClient.get<Member[]>(`/classrooms/${classroomId}/members`);
    return data;
  },
};
