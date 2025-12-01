import { apiClient } from './apiClient';
import type { Assignment, Submission } from '../types/domain';

export const assignmentApi = {
  async getMyAssignments(): Promise<Assignment[]> {
    const { data } = await apiClient.get<Assignment[]>('/assignments');
    return data;
  },
  async getAssignment(id: string): Promise<Assignment> {
    const { data } = await apiClient.get<Assignment>(`/assignments/${id}`);
    return data;
  },
  async getSubmissions(assignmentId: string): Promise<Submission[]> {
    const { data } = await apiClient.get<Submission[]>(
      `/assignments/${assignmentId}/submissions`
    );
    return data;
  },
  async submitAssignment(
    assignmentId: string,
    payload: { contentUrl?: string; text?: string }
  ): Promise<Submission> {
    const { data } = await apiClient.post<Submission>(
      `/assignments/${assignmentId}/submissions`,
      payload
    );
    return data;
  },
  async gradeSubmission(
    assignmentId: string,
    submissionId: string,
    payload: { marks: number; feedback?: string }
  ): Promise<Submission> {
    const { data } = await apiClient.post<Submission>(
      `/assignments/${assignmentId}/submissions/${submissionId}/grade`,
      payload
    );
    return data;
  },
};
