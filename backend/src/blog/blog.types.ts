export type PostStatus = 'DRAFT' | 'PENDING' | 'REJECTED' | 'PUBLISHED' | 'ARCHIVED';
export type CommentStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type PlanType = 'PERSONAL' | 'WORK' | 'TRAVEL' | 'STUDY' | 'OTHER';
export type PlanStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'DONE' | 'PAUSED' | 'CANCELED';

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
}

export interface Tag {
  id: number;
  name: string;
  slug: string;
}

export interface Post {
  id: number;
  title: string;
  slug: string;
  summary: string;
  content: string;
  coverUrl: string;
  status: PostStatus;
  isTop: boolean;
  isRecommend: boolean;
  viewCount: number;
  reviewMessage: string;
  publishedAt: string;
  category: Category;
  tags: Tag[];
  authorId: number;
  authorName: string;
  creator: Pick<User, 'id' | 'username' | 'nickname' | 'avatarUrl'>;
  favoriteCount: number;
}

export interface Comment {
  id: number;
  postSlug: string;
  nickname: string;
  content: string;
  status: CommentStatus;
  createdAt: string;
}

export interface CreateCommentDto {
  postSlug: string;
  nickname: string;
  content: string;
}

export interface User {
  id: number;
  username: string;
  password: string;
  nickname: string;
  avatarUrl: string;
  bio: string;
  role: 'ADMIN' | 'USER';
  favorites: string[];
}

export interface AuthPayload {
  username: string;
  password: string;
  nickname?: string;
}

export interface UpdateProfileDto {
  nickname?: string;
  avatarUrl?: string;
  bio?: string;
}

export interface CreatePostDto {
  title: string;
  summary: string;
  content: string;
  coverUrl?: string;
  categorySlug: string;
  tagSlugs: string[];
  status?: PostStatus;
}

export interface PostQuery {
  keyword?: string;
  categorySlug?: string;
  tagSlug?: string;
  includeDrafts?: string;
}

export interface AdminPostQuery {
  keyword?: string;
  status?: PostStatus;
  authorId?: string;
  page?: string;
  pageSize?: string;
}

export interface WeeklyReportPayload {
  title: string;
  summary?: string;
  content: string;
  weekStart: string;
  weekEnd: string;
}

export interface PersonalPlanPayload {
  title: string;
  type?: PlanType;
  status?: PlanStatus;
  progress?: number;
  currentPlan?: string;
  nextPlan?: string;
  content: string;
}

export interface NotificationItem {
  id: number;
  title: string;
  content: string;
  isRead: boolean;
  postId: number | null;
  createdAt: string;
}
