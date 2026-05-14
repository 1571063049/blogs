import { http } from './http'
import type {
  AuthResponse,
  Category,
  Comment,
  CommentStatus,
  CreatePostPayload,
  DashboardStats,
  NotificationItem,
  PersonalPlan,
  PersonalPlanPayload,
  Post,
  PaginatedResult,
  ReviewLog,
  SiteConfig,
  Tag,
  UpdateProfilePayload,
  UpsertTaxonomyPayload,
  User,
  WeeklyReport,
  WeeklyReportPayload,
} from '../types/blog'

export interface PostQuery {
  keyword?: string
  categorySlug?: string
  tagSlug?: string
}

export interface AdminPostQuery {
  keyword?: string
  status?: Post['status']
  authorId?: number
  page?: number
  pageSize?: number
}

export interface CreateCommentPayload {
  postSlug: string
  nickname: string
  content: string
}

export const blogApi = {
  register: (payload: { username: string; password: string; nickname?: string }) =>
    http.post<never, AuthResponse>('/auth/register', payload),
  login: (payload: { username: string; password: string }) => http.post<never, AuthResponse>('/auth/login', payload),
  getMe: () => http.get<never, User>('/auth/me'),
  updateProfile: (payload: UpdateProfilePayload) => http.post<never, User>('/auth/profile', payload),
  uploadAvatar: (file: File) => {
    const formData = new FormData()
    formData.append('avatar', file)
    return http.post<never, User>('/auth/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  getPosts: (params?: PostQuery) => http.get<never, Post[]>('/posts', { params }),
  getAdminPosts: (params?: AdminPostQuery) => http.get<never, PaginatedResult<Post>>('/admin/posts', { params }),
  getMyDrafts: () => http.get<never, Post[]>('/me/drafts'),
  getMyPosts: () => http.get<never, Post[]>('/me/posts'),
  getMyNotifications: () => http.get<never, NotificationItem[]>('/me/notifications'),
  markMyNotificationsRead: () => http.put<never, { success: boolean }>('/me/notifications/read'),
  getReviewLogs: () => http.get<never, ReviewLog[]>('/admin/review-logs'),
  getPost: (slug: string) => http.get<never, Post>(`/posts/${slug}`),
  createMyPost: (payload: CreatePostPayload) => http.post<never, Post>('/posts', payload),
  updateMyPost: (id: number, payload: CreatePostPayload) => http.put<never, Post>(`/me/posts/${id}`, payload),
  createPost: (payload: CreatePostPayload) => http.post<never, Post>('/admin/posts', payload),
  updatePost: (id: number, payload: CreatePostPayload) => http.put<never, Post>(`/admin/posts/${id}`, payload),
  updatePostStatus: (id: number, status: Post['status'], reviewMessage?: string) =>
    http.put<never, Post>(`/admin/posts/${id}/status`, { status, reviewMessage }),
  updatePostRecommend: (id: number, isRecommend: boolean) =>
    http.put<never, Post>(`/admin/posts/${id}/recommend`, { isRecommend }),
  deletePost: (id: number) => http.delete<never, Post>(`/admin/posts/${id}`),
  toggleFavorite: (slug: string) =>
    http.post<never, { post: Post; favorited: boolean; favorites: string[] }>(`/posts/${slug}/favorite`),
  getMyFavorites: () => http.get<never, Post[]>('/me/favorites'),
  getMyWeeklyReports: () => http.get<never, WeeklyReport[]>('/me/weekly-reports'),
  createMyWeeklyReport: (payload: WeeklyReportPayload) => http.post<never, WeeklyReport>('/me/weekly-reports', payload),
  updateMyWeeklyReport: (id: number, payload: WeeklyReportPayload) =>
    http.put<never, WeeklyReport>(`/me/weekly-reports/${id}`, payload),
  deleteMyWeeklyReport: (id: number) => http.delete<never, { success: boolean }>(`/me/weekly-reports/${id}`),
  getMyPlans: () => http.get<never, PersonalPlan[]>('/me/plans'),
  createMyPlan: (payload: PersonalPlanPayload) => http.post<never, PersonalPlan>('/me/plans', payload),
  updateMyPlan: (id: number, payload: PersonalPlanPayload) => http.put<never, PersonalPlan>(`/me/plans/${id}`, payload),
  deleteMyPlan: (id: number) => http.delete<never, { success: boolean }>(`/me/plans/${id}`),
  getCategories: () => http.get<never, Category[]>('/categories'),
  getAdminCategories: () => http.get<never, Category[]>('/admin/categories'),
  createCategory: (payload: UpsertTaxonomyPayload) => http.post<never, Category>('/admin/categories', payload),
  updateCategory: (id: number, payload: UpsertTaxonomyPayload) =>
    http.put<never, Category>(`/admin/categories/${id}`, payload),
  deleteCategory: (id: number) => http.delete<never, Category>(`/admin/categories/${id}`),
  getTags: () => http.get<never, Tag[]>('/tags'),
  getAdminTags: () => http.get<never, Tag[]>('/admin/tags'),
  createTag: (payload: UpsertTaxonomyPayload) => http.post<never, Tag>('/admin/tags', payload),
  updateTag: (id: number, payload: UpsertTaxonomyPayload) => http.put<never, Tag>(`/admin/tags/${id}`, payload),
  deleteTag: (id: number) => http.delete<never, Tag>(`/admin/tags/${id}`),
  getComments: (postSlug: string) => http.get<never, Comment[]>(`/comments/${postSlug}`),
  createComment: (payload: CreateCommentPayload) => http.post<never, Comment>('/comments', payload),
  getAdminComments: () => http.get<never, Comment[]>('/admin/comments'),
  updateCommentStatus: (id: number, status: CommentStatus) =>
    http.put<never, Comment>(`/admin/comments/${id}/status`, { status }),
  getSiteConfig: () => http.get<never, SiteConfig>('/site-configs/public'),
  getDashboardStats: () => http.get<never, DashboardStats>('/admin/stats'),
}
