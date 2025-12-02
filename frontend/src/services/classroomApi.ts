import { apiClient } from './apiClient';
import type { Announcement, Assignment, Classroom, Member, UserRole } from '../types/domain';

type ClassroomResponseDTO = {
  id: number;
  name: string;
  description?: string | null;
  code: string;
  teacher: {
    id: number;
    name: string;
    email: string;
    role: UserRole;
  };
};

type ClassroomMemberResponseDTO = {
  id: number;
  classroomId: number;
  user: {
    id: number;
    name: string;
    email: string;
    role: UserRole;
  };
  roleInClass: string;
  joinedAt: string;
};

type AnnouncementResponseDTO = {
  id: number;
  classroomId: number;
  author: {
    id: number;
    name: string;
    email: string;
    role: UserRole;
  };
  title: string;
  content: string;
  createdAt: string;
};

const mapClassroom = (dto: ClassroomResponseDTO): Classroom => ({
  id: String(dto.id),
  name: dto.name,
  description: dto.description ?? undefined,
  code: dto.code,
  teacherName: dto.teacher.name,
});

const mapMember = (dto: ClassroomMemberResponseDTO): Member => ({
  id: String(dto.id),
  name: dto.user.name,
  role: dto.user.role,
  joinedAt: dto.joinedAt,
});

const mapAnnouncement = (dto: AnnouncementResponseDTO): Announcement => ({
  id: String(dto.id),
  title: dto.title,
  content: dto.content,
  authorName: dto.author.name,
  createdAt: dto.createdAt,
});

export const classroomApi = {
  async getClassrooms(params?: { teacherId?: string; studentId?: string }): Promise<Classroom[]> {
    const { data } = await apiClient.get<ClassroomResponseDTO[]>('/classrooms', {
      params: {
        teacherId: params?.teacherId,
        studentId: params?.studentId,
      },
    });
    return data.map(mapClassroom);
  },
  async createClassroom(
    teacherId: string,
    payload: { name: string; description?: string }
  ): Promise<Classroom> {
    const { data } = await apiClient.post<ClassroomResponseDTO>('/classrooms', payload, {
      params: { teacherId },
    });
    return mapClassroom(data);
  },
  async joinClassroom(userId: string, code: string): Promise<Classroom> {
    const { data } = await apiClient.post<ClassroomResponseDTO>(
      '/classrooms/join',
      { code },
      { params: { userId } }
    );
    return mapClassroom(data);
  },
  async getClassroom(id: string): Promise<Classroom> {
    const { data } = await apiClient.get<ClassroomResponseDTO>(`/classrooms/${id}`);
    return mapClassroom(data);
  },
  async getAnnouncements(classroomId: string): Promise<Announcement[]> {
    const { data } = await apiClient.get<AnnouncementResponseDTO[]>(
      `/classrooms/${classroomId}/announcements`
    );
    return data.map(mapAnnouncement);
  },
  async createAnnouncement(
    classroomId: string,
    authorId: string,
    payload: { title: string; content: string }
  ): Promise<Announcement> {
    const { data } = await apiClient.post<AnnouncementResponseDTO>(
      `/classrooms/${classroomId}/announcements`,
      payload,
      { params: { authorId } }
    );
    return mapAnnouncement(data);
  },
  async getAssignments(classroomId: string): Promise<Assignment[]> {
    const { data } = await apiClient.get<Assignment[]>(
      `/classrooms/${classroomId}/assignments`
    );
    return data;
  },
  async getMembers(classroomId: string): Promise<Member[]> {
    const { data } = await apiClient.get<ClassroomMemberResponseDTO[]>(
      `/classrooms/${classroomId}/members`
    );
    return data.map(mapMember);
  },
};
