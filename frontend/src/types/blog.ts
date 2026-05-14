export type PostStatus = 'DRAFT' | 'PENDING' | 'REJECTED' | 'PUBLISHED' | 'ARCHIVED'
export type PlanType = 'PERSONAL' | 'WORK' | 'TRAVEL' | 'STUDY' | 'OTHER'
export type PlanStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'DONE' | 'PAUSED' | 'CANCELED'

export interface Creator {
  id: number
  username: string
  nickname: string
  avatarUrl: string
}

export interface Category {
  id: number
  name: string
  slug: string
  description: string
  _count?: {
    posts: number
  }
}

export interface Tag {
  id: number
  name: string
  slug: string
  _count?: {
    posts: number
  }
}

export interface Post {
  id: number
  title: string
  slug: string
  summary: string
  content: string
  coverUrl: string
  status: PostStatus
  isTop: boolean
  isRecommend: boolean
  viewCount: number
  reviewMessage: string
  publishedAt: string
  category: Category
  tags: Tag[]
  authorId: number
  authorName: string
  creator: Creator
  favoriteCount: number
}

export interface Comment {
  id: number
  postSlug: string
  postTitle?: string
  nickname: string
  content: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  createdAt: string
}

export interface DashboardStats {
  posts: number
  comments: number
  views: number
  categories: number
  tags?: number
}

export interface SiteConfig {
  siteName: string
  tagline: string
  owner: string
  email: string
}

export interface User {
  id: number
  username: string
  nickname: string
  avatarUrl: string
  bio: string
  role: 'ADMIN' | 'USER'
  favorites: string[]
}

export interface UpdateProfilePayload {
  nickname: string
  avatarUrl: string
  bio: string
}

export interface AuthResponse {
  token: string
  user: User
}

export interface CreatePostPayload {
  title: string
  summary: string
  content: string
  coverUrl?: string
  categorySlug: string
  tagSlugs: string[]
  status?: PostStatus
}

export interface WeeklyReport {
  id: number
  title: string
  summary: string
  content: string
  weekStart: string
  weekEnd: string
  createdAt: string
  updatedAt: string
}

export interface WeeklyReportPayload {
  title: string
  summary?: string
  content: string
  weekStart: string
  weekEnd: string
}

export interface PersonalPlan {
  id: number
  title: string
  type: PlanType
  status: PlanStatus
  progress: number
  currentPlan: string
  nextPlan: string
  content: string
  createdAt: string
  updatedAt: string
}

export interface PersonalPlanPayload {
  title: string
  type?: PlanType
  status?: PlanStatus
  progress?: number
  currentPlan?: string
  nextPlan?: string
  content: string
}

export interface UpsertTaxonomyPayload {
  name: string
  slug: string
  description?: string
}

export type CommentStatus = Comment['status']

export interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

export interface PaginatedResult<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export interface NotificationItem {
  id: number
  title: string
  content: string
  isRead: boolean
  postId: number | null
  createdAt: string
}

export interface ReviewLog {
  id: number
  postId: number
  postTitle: string
  reviewerId: number
  reviewerName: string
  fromStatus: PostStatus
  toStatus: PostStatus
  message: string
  createdAt: string
}
