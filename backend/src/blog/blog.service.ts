import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { CommentStatus, PlanStatus, PlanType, PostStatus, Prisma, Role, type User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma.service';
import type {
  AuthPayload,
  AdminPostQuery,
  CreateCommentDto,
  CreatePostDto,
  NotificationItem,
  PersonalPlanPayload,
  PostQuery,
  UpdateProfileDto,
  WeeklyReportPayload,
} from './blog.types';

interface UpsertTaxonomyPayload {
  name: string;
  slug: string;
  description?: string;
}

const defaultAvatar = 'https://api.dicebear.com/8.x/initials/svg?seed=Blog';
const defaultCoverUrl =
  'https://images.unsplash.com/photo-1485988412941-77a35537dae4?auto=format&fit=crop&w=1200&q=80';
const jwtSecret = process.env.JWT_SECRET ?? 'dev-secret-change-me';

const postInclude = {
  category: true,
  author: true,
  tags: { include: { tag: true } },
  favorites: true,
} satisfies Prisma.PostInclude;

@Injectable()
export class BlogService {
  private readonly jwt = new JwtService({ secret: jwtSecret });

  constructor(private readonly prisma: PrismaService) {}

  async register(payload: AuthPayload) {
    const username = payload.username.trim();
    const existingUser = await this.prisma.user.findUnique({ where: { username } });

    if (existingUser) {
      throw new ConflictException('用户名已存在');
    }

    const passwordHash = await bcrypt.hash(payload.password, 10);
    const userCount = await this.prisma.user.count();
    const user = await this.prisma.user.create({
      data: {
        username,
        passwordHash,
        nickname: payload.nickname?.trim() || username,
        avatarUrl: `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(username)}`,
        bio: '这个人还没有填写个人简介。',
        role: userCount === 0 ? Role.ADMIN : Role.USER,
      },
    });

    return this.buildAuthResponse(user);
  }

  async login(payload: AuthPayload) {
    const user = await this.prisma.user.findUnique({ where: { username: payload.username.trim() } });
    const isValid = user ? await bcrypt.compare(payload.password, user.passwordHash) : false;

    if (!user || !isValid) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    return this.buildAuthResponse(user);
  }

  async getMe(token?: string) {
    return this.serializeUser(await this.requireUser(token));
  }

  async updateProfile(payload: UpdateProfileDto, token?: string) {
    const user = await this.requireUser(token);
    const updatedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        nickname: payload.nickname?.trim() || user.nickname,
        avatarUrl: payload.avatarUrl?.trim() || user.avatarUrl || defaultAvatar,
        bio: payload.bio?.trim() || user.bio,
      },
    });

    return this.serializeUser(updatedUser);
  }

  async getPosts(query: PostQuery) {
    const keyword = query.keyword?.trim();
    const includeDrafts = query.includeDrafts === 'true';
    const posts = await this.prisma.post.findMany({
      where: {
        status: includeDrafts ? undefined : PostStatus.PUBLISHED,
        category: query.categorySlug ? { slug: query.categorySlug } : undefined,
        tags: query.tagSlug ? { some: { tag: { slug: query.tagSlug } } } : undefined,
        OR: keyword
          ? [
              { title: { contains: keyword } },
              { summary: { contains: keyword } },
              { content: { contains: keyword } },
            ]
          : undefined,
      },
      include: postInclude,
      orderBy: [{ isTop: 'desc' }, { publishedAt: 'desc' }, { createdAt: 'desc' }],
    });

    return posts.map((post) => this.serializePost(post));
  }

  async getAdminPosts(query: AdminPostQuery, token?: string) {
    await this.requireAdmin(token);
    const keyword = query.keyword?.trim();
    const authorId = Number(query.authorId);
    const page = this.normalizePositiveInteger(query.page, 1, 1, 9999);
    const pageSize = this.normalizePositiveInteger(query.pageSize, 12, 1, 100);
    const where: Prisma.PostWhereInput = {
      status: query.status && Object.values(PostStatus).includes(query.status) ? query.status : undefined,
      authorId: Number.isInteger(authorId) && authorId > 0 ? authorId : undefined,
      OR: keyword
        ? [
            { title: { contains: keyword } },
            { summary: { contains: keyword } },
            { content: { contains: keyword } },
          ]
        : undefined,
    };

    const [posts, total] = await Promise.all([
      this.prisma.post.findMany({
        where,
        include: postInclude,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.post.count({ where }),
    ]);

    return {
      items: posts.map((post) => this.serializePost(post)),
      total,
      page,
      pageSize,
    };
  }

  async getMyDrafts(token?: string) {
    const user = await this.requireUser(token);
    const posts = await this.prisma.post.findMany({
      where: {
        authorId: user.id,
        status: PostStatus.DRAFT,
      },
      include: postInclude,
      orderBy: { updatedAt: 'desc' },
    });

    return posts.map((post) => this.serializePost(post));
  }

  async getMyPosts(token?: string) {
    const user = await this.requireUser(token);
    const posts = await this.prisma.post.findMany({
      where: { authorId: user.id },
      include: postInclude,
      orderBy: { updatedAt: 'desc' },
    });

    return posts.map((post) => this.serializePost(post));
  }

  async getMyNotifications(token?: string): Promise<NotificationItem[]> {
    const user = await this.requireUser(token);
    const notifications = await this.prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return notifications.map((notification) => ({
      id: notification.id,
      title: notification.title,
      content: notification.content,
      isRead: notification.isRead,
      postId: notification.postId,
      createdAt: notification.createdAt.toISOString(),
    }));
  }

  async markMyNotificationsRead(token?: string) {
    const user = await this.requireUser(token);
    await this.prisma.notification.updateMany({
      where: {
        userId: user.id,
        isRead: false,
      },
      data: { isRead: true },
    });

    return { success: true };
  }

  async getReviewLogs(token?: string) {
    await this.requireAdmin(token);
    const logs = await this.prisma.postReviewLog.findMany({
      include: {
        post: true,
        reviewer: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return logs.map((log) => ({
      id: log.id,
      postId: log.postId,
      postTitle: log.post.title,
      reviewerId: log.reviewerId,
      reviewerName: log.reviewer.nickname,
      fromStatus: log.fromStatus,
      toStatus: log.toStatus,
      message: log.message,
      createdAt: log.createdAt.toISOString(),
    }));
  }

  async getPost(slug: string) {
    const post = await this.prisma.post
      .update({
        where: { slug },
        data: { viewCount: { increment: 1 } },
        include: postInclude,
      })
      .catch(() => null);

    if (!post || post.status !== PostStatus.PUBLISHED) {
      throw new NotFoundException('文章不存在');
    }

    return this.serializePost(post);
  }

  async getCategories() {
    return this.prisma.category.findMany({ orderBy: { id: 'asc' } });
  }

  async getAdminCategories(token?: string) {
    await this.requireAdmin(token);
    return this.prisma.category.findMany({
      include: { _count: { select: { posts: true } } },
      orderBy: { id: 'asc' },
    });
  }

  async createCategory(payload: UpsertTaxonomyPayload, token?: string) {
    await this.requireAdmin(token);
    return this.prisma.category
      .create({
        data: {
          name: payload.name.trim(),
          slug: this.normalizeSlug(payload.slug),
          description: payload.description?.trim() ?? '',
        },
      })
      .catch((error) => this.handleUniqueTaxonomyError(error));
  }

  async updateCategory(id: number, payload: UpsertTaxonomyPayload, token?: string) {
    await this.requireAdmin(token);
    return this.prisma.category
      .update({
        where: { id },
        data: {
          name: payload.name.trim(),
          slug: this.normalizeSlug(payload.slug),
          description: payload.description?.trim() ?? '',
        },
      })
      .catch((error) => this.handleTaxonomyMutationError(error, '分类不存在'));
  }

  async deleteCategory(id: number, token?: string) {
    await this.requireAdmin(token);
    const postCount = await this.prisma.post.count({ where: { categoryId: id } });

    if (postCount > 0) {
      throw new ConflictException('该分类下仍有文章，不能删除');
    }

    return this.prisma.category
      .delete({ where: { id } })
      .catch((error) => this.handleTaxonomyMutationError(error, '分类不存在'));
  }

  async getTags() {
    return this.prisma.tag.findMany({ orderBy: { id: 'asc' } });
  }

  async getAdminTags(token?: string) {
    await this.requireAdmin(token);
    return this.prisma.tag.findMany({
      include: { _count: { select: { posts: true } } },
      orderBy: { id: 'asc' },
    });
  }

  async createTag(payload: UpsertTaxonomyPayload, token?: string) {
    await this.requireAdmin(token);
    return this.prisma.tag
      .create({
        data: {
          name: payload.name.trim(),
          slug: this.normalizeSlug(payload.slug),
        },
      })
      .catch((error) => this.handleUniqueTaxonomyError(error));
  }

  async updateTag(id: number, payload: UpsertTaxonomyPayload, token?: string) {
    await this.requireAdmin(token);
    return this.prisma.tag
      .update({
        where: { id },
        data: {
          name: payload.name.trim(),
          slug: this.normalizeSlug(payload.slug),
        },
      })
      .catch((error) => this.handleTaxonomyMutationError(error, '标签不存在'));
  }

  async deleteTag(id: number, token?: string) {
    await this.requireAdmin(token);
    return this.prisma.tag
      .delete({ where: { id } })
      .catch((error) => this.handleTaxonomyMutationError(error, '标签不存在'));
  }

  async getComments(postSlug: string) {
    const comments = await this.prisma.comment.findMany({
      where: {
        status: CommentStatus.APPROVED,
        post: { slug: postSlug },
      },
      orderBy: { createdAt: 'desc' },
    });

    return comments.map((comment) => ({
      id: comment.id,
      postSlug,
      nickname: comment.nickname,
      content: comment.content,
      status: comment.status,
      createdAt: comment.createdAt.toISOString(),
    }));
  }

  async getAdminComments(token?: string) {
    await this.requireAdmin(token);
    const comments = await this.prisma.comment.findMany({
      include: { post: true },
      orderBy: { createdAt: 'desc' },
    });

    return comments.map((comment) => ({
      id: comment.id,
      postSlug: comment.post.slug,
      postTitle: comment.post.title,
      nickname: comment.nickname,
      content: comment.content,
      status: comment.status,
      createdAt: comment.createdAt.toISOString(),
    }));
  }

  async createComment(payload: CreateCommentDto) {
    const post = await this.prisma.post.findUnique({ where: { slug: payload.postSlug } });

    if (!post) {
      throw new NotFoundException('文章不存在');
    }

    const comment = await this.prisma.comment.create({
      data: {
        postId: post.id,
        nickname: payload.nickname.trim(),
        content: payload.content.trim(),
        status: CommentStatus.PENDING,
      },
    });

    return {
      id: comment.id,
      postSlug: payload.postSlug,
      nickname: comment.nickname,
      content: comment.content,
      status: comment.status,
      createdAt: comment.createdAt.toISOString(),
    };
  }

  async updateCommentStatus(id: number, status: CommentStatus, token?: string) {
    await this.requireAdmin(token);
    const comment = await this.prisma.comment
      .update({
        where: { id },
        data: { status },
        include: { post: true },
      })
      .catch(() => null);

    if (!comment) {
      throw new NotFoundException('评论不存在');
    }

    return {
      id: comment.id,
      postSlug: comment.post.slug,
      postTitle: comment.post.title,
      nickname: comment.nickname,
      content: comment.content,
      status: comment.status,
      createdAt: comment.createdAt.toISOString(),
    };
  }

  async createPost(payload: CreatePostDto, token?: string) {
    const user = await this.requireAdmin(token);
    const status = payload.status ?? PostStatus.PUBLISHED;
    return this.createPostForUser(payload, user, status);
  }

  async createMyPost(payload: CreatePostDto, token?: string) {
    const user = await this.requireUser(token);
    const status = payload.status === PostStatus.DRAFT ? PostStatus.DRAFT : PostStatus.PENDING;
    return this.createPostForUser(payload, user, status);
  }

  async updateMyPost(id: number, payload: CreatePostDto, token?: string) {
    const user = await this.requireUser(token);
    const currentPost = await this.prisma.post.findUnique({ where: { id } });

    if (!currentPost || currentPost.authorId !== user.id) {
      throw new NotFoundException('文章不存在');
    }

    if (currentPost.status !== PostStatus.DRAFT && currentPost.status !== PostStatus.REJECTED) {
      throw new BadRequestException('当前状态不允许编辑');
    }

    const status = payload.status === PostStatus.DRAFT ? PostStatus.DRAFT : PostStatus.PENDING;
    return this.updatePostData(id, payload, currentPost, status, {
      reviewMessage: '',
      publishedAt: null,
    });
  }

  private async createPostForUser(payload: CreatePostDto, user: User, status: PostStatus) {
    const category = await this.prisma.category.findUnique({ where: { slug: payload.categorySlug } });

    if (!category) {
      throw new NotFoundException('分类不存在');
    }

    const selectedTags = await this.prisma.tag.findMany({
      where: { slug: { in: payload.tagSlugs ?? [] } },
    });
    const slug = await this.createUniqueSlug(payload.title);
    const post = await this.prisma.post.create({
      data: {
        title: payload.title.trim(),
        slug,
        summary: payload.summary.trim(),
        content: this.normalizeContent(payload.content),
        coverUrl: payload.coverUrl?.trim() || defaultCoverUrl,
        status,
        publishedAt: status === PostStatus.PUBLISHED ? new Date() : null,
        authorId: user.id,
        categoryId: category.id,
        tags: {
          create: selectedTags.map((tag) => ({ tagId: tag.id })),
        },
      },
      include: postInclude,
    });

    return this.serializePost(post);
  }

  async updatePost(id: number, payload: CreatePostDto, token?: string) {
    await this.requireAdmin(token);
    const currentPost = await this.prisma.post.findUnique({ where: { id } });

    if (!currentPost) {
      throw new NotFoundException('文章不存在');
    }

    const status = payload.status ?? currentPost.status;
    return this.updatePostData(id, payload, currentPost, status);
  }

  private async updatePostData(
    id: number,
    payload: CreatePostDto,
    currentPost: Prisma.PostGetPayload<{ include?: undefined }>,
    status: PostStatus,
    extraData: Prisma.PostUncheckedUpdateInput = {},
  ) {
    const category = await this.prisma.category.findUnique({ where: { slug: payload.categorySlug } });

    if (!category) {
      throw new NotFoundException('分类不存在');
    }

    const selectedTags = await this.prisma.tag.findMany({
      where: { slug: { in: payload.tagSlugs ?? [] } },
    });

    await this.prisma.postTag.deleteMany({ where: { postId: id } });
    const data: Prisma.PostUncheckedUpdateInput = {
      title: payload.title.trim(),
      summary: payload.summary.trim(),
      content: this.normalizeContent(payload.content),
      coverUrl: payload.coverUrl?.trim() || currentPost.coverUrl,
      status,
      publishedAt: status === PostStatus.PUBLISHED ? currentPost.publishedAt ?? new Date() : currentPost.publishedAt,
      reviewMessage: status === PostStatus.PUBLISHED ? '' : currentPost.reviewMessage,
      categoryId: category.id,
      ...extraData,
    };

    const post = await this.prisma.post.update({
      where: { id },
      data: {
        ...data,
        tags: {
          create: selectedTags.map((tag) => ({ tagId: tag.id })),
        },
      },
      include: postInclude,
    });

    return this.serializePost(post);
  }

  async updatePostStatus(
    id: number,
    payload: { status: PostStatus; reviewMessage?: string },
    token?: string,
  ) {
    const reviewer = await this.requireAdmin(token);
    const { status } = payload;

    if (!Object.values(PostStatus).includes(status)) {
      throw new BadRequestException('文章状态不正确');
    }

    if (status === PostStatus.REJECTED && !payload.reviewMessage?.trim()) {
      throw new BadRequestException('驳回文章时需要填写原因');
    }

    const reviewMessage = payload.reviewMessage?.trim() ?? '';
    const currentPost = await this.prisma.post.findUnique({ where: { id } });

    if (!currentPost) {
      throw new NotFoundException('文章不存在');
    }

    const post = await this.prisma.$transaction(async (transaction) => {
      const updatedPost = await transaction.post.update({
        where: { id },
        data: {
          status,
          publishedAt: status === PostStatus.PUBLISHED ? new Date() : null,
          reviewMessage: status === PostStatus.REJECTED ? reviewMessage : '',
        },
        include: postInclude,
      });

      await transaction.postReviewLog.create({
        data: {
          postId: id,
          reviewerId: reviewer.id,
          fromStatus: currentPost.status,
          toStatus: status,
          message: status === PostStatus.REJECTED ? reviewMessage : '审核通过',
        },
      });

      await transaction.notification.create({
        data: {
          userId: currentPost.authorId,
          postId: id,
          title: status === PostStatus.PUBLISHED ? '投稿已通过审核' : '投稿已被驳回',
          content:
            status === PostStatus.PUBLISHED
              ? `你的文章《${updatedPost.title}》已通过审核并发布。`
              : `你的文章《${updatedPost.title}》被驳回：${reviewMessage}`,
        },
      });

      return updatedPost;
    });

    if (!post) {
      throw new NotFoundException('文章不存在');
    }

    return this.serializePost(post);
  }

  async updatePostRecommend(id: number, isRecommend: boolean, token?: string) {
    await this.requireAdmin(token);
    const currentPost = await this.prisma.post.findUnique({ where: { id } });

    if (!currentPost) {
      throw new NotFoundException('文章不存在');
    }

    if (isRecommend && currentPost.status !== PostStatus.PUBLISHED) {
      throw new BadRequestException('仅已发布文章可设为推荐');
    }

    const post = await this.prisma.post.update({
      where: { id },
      data: { isRecommend },
      include: postInclude,
    });

    return this.serializePost(post);
  }

  async deletePost(id: number, token?: string) {
    await this.requireAdmin(token);
    const post = await this.prisma.post
      .delete({
        where: { id },
        include: postInclude,
      })
      .catch(() => null);

    if (!post) {
      throw new NotFoundException('文章不存在');
    }

    return this.serializePost(post);
  }

  async toggleFavorite(slug: string, token?: string) {
    const user = await this.requireUser(token);
    const post = await this.prisma.post.findUnique({ where: { slug }, include: postInclude });

    if (!post) {
      throw new NotFoundException('文章不存在');
    }

    const existingFavorite = await this.prisma.favorite.findUnique({
      where: { userId_postId: { userId: user.id, postId: post.id } },
    });

    if (existingFavorite) {
      await this.prisma.favorite.delete({ where: { userId_postId: { userId: user.id, postId: post.id } } });
    } else {
      await this.prisma.favorite.create({ data: { userId: user.id, postId: post.id } });
    }

    const updatedPost = await this.prisma.post.findUniqueOrThrow({ where: { id: post.id }, include: postInclude });
    const favorites = await this.getUserFavoriteSlugs(user.id);

    return {
      post: this.serializePost(updatedPost),
      favorited: !existingFavorite,
      favorites,
    };
  }

  async getMyFavorites(token?: string) {
    const user = await this.requireUser(token);
    const favorites = await this.prisma.favorite.findMany({
      where: { userId: user.id },
      include: { post: { include: postInclude } },
      orderBy: { createdAt: 'desc' },
    });

    return favorites.map((favorite) => this.serializePost(favorite.post));
  }

  async getMyWeeklyReports(token?: string) {
    const user = await this.requireUser(token);
    const reports = await this.prisma.weeklyReport.findMany({
      where: { userId: user.id },
      orderBy: [{ weekStart: 'desc' }, { createdAt: 'desc' }],
    });

    return reports.map((report) => this.serializeWeeklyReport(report));
  }

  async createMyWeeklyReport(payload: WeeklyReportPayload, token?: string) {
    const user = await this.requireUser(token);
    const { weekStart, weekEnd } = this.parseReportRange(payload.weekStart, payload.weekEnd);

    const report = await this.prisma.weeklyReport.create({
      data: {
        title: payload.title.trim(),
        summary: payload.summary?.trim() ?? '',
        content: payload.content.trim(),
        weekStart,
        weekEnd,
        userId: user.id,
      },
    });

    return this.serializeWeeklyReport(report);
  }

  async updateMyWeeklyReport(id: number, payload: WeeklyReportPayload, token?: string) {
    const user = await this.requireUser(token);
    await this.requireOwnedWeeklyReport(id, user.id);
    const { weekStart, weekEnd } = this.parseReportRange(payload.weekStart, payload.weekEnd);
    const report = await this.prisma.weeklyReport.update({
      where: { id },
      data: {
        title: payload.title.trim(),
        summary: payload.summary?.trim() ?? '',
        content: payload.content.trim(),
        weekStart,
        weekEnd,
      },
    });

    return this.serializeWeeklyReport(report);
  }

  async deleteMyWeeklyReport(id: number, token?: string) {
    const user = await this.requireUser(token);
    await this.requireOwnedWeeklyReport(id, user.id);
    await this.prisma.weeklyReport.delete({ where: { id } });

    return { success: true };
  }

  async getMyPlans(token?: string) {
    const user = await this.requireUser(token);
    const plans = await this.prisma.personalPlan.findMany({
      where: { userId: user.id },
      orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
    });

    return plans.map((plan) => this.serializePersonalPlan(plan));
  }

  async createMyPlan(payload: PersonalPlanPayload, token?: string) {
    const user = await this.requireUser(token);
    const plan = await this.prisma.personalPlan.create({
      data: {
        title: payload.title.trim(),
        type: payload.type ?? PlanType.PERSONAL,
        status: payload.status ?? PlanStatus.NOT_STARTED,
        progress: this.normalizeProgress(payload.progress),
        currentPlan: payload.currentPlan?.trim() ?? '',
        nextPlan: payload.nextPlan?.trim() ?? '',
        content: payload.content.trim(),
        userId: user.id,
      },
    });

    return this.serializePersonalPlan(plan);
  }

  async updateMyPlan(id: number, payload: PersonalPlanPayload, token?: string) {
    const user = await this.requireUser(token);
    await this.requireOwnedPlan(id, user.id);
    const plan = await this.prisma.personalPlan.update({
      where: { id },
      data: {
        title: payload.title.trim(),
        type: payload.type ?? PlanType.PERSONAL,
        status: payload.status ?? PlanStatus.NOT_STARTED,
        progress: this.normalizeProgress(payload.progress),
        currentPlan: payload.currentPlan?.trim() ?? '',
        nextPlan: payload.nextPlan?.trim() ?? '',
        content: payload.content.trim(),
      },
    });

    return this.serializePersonalPlan(plan);
  }

  async deleteMyPlan(id: number, token?: string) {
    const user = await this.requireUser(token);
    await this.requireOwnedPlan(id, user.id);
    await this.prisma.personalPlan.delete({ where: { id } });

    return { success: true };
  }

  getPublicConfig() {
    return {
      siteName: '个人博客',
      tagline: '记录工程实践、产品思考和日常学习。',
      owner: '博主',
      email: 'hello@example.com',
    };
  }

  async getDashboardStats() {
    const [posts, comments, categories, tags, viewStats] = await Promise.all([
      this.prisma.post.count(),
      this.prisma.comment.count(),
      this.prisma.category.count(),
      this.prisma.tag.count(),
      this.prisma.post.aggregate({ _sum: { viewCount: true } }),
    ]);

    return {
      posts,
      comments,
      categories,
      tags,
      views: viewStats._sum.viewCount ?? 0,
    };
  }

  private async buildAuthResponse(user: User) {
    return {
      token: await this.jwt.signAsync({ sub: user.id, role: user.role }),
      user: await this.serializeUser(user),
    };
  }

  private async serializeUser(user: User) {
    return {
      id: user.id,
      username: user.username,
      nickname: user.nickname,
      avatarUrl: user.avatarUrl || defaultAvatar,
      bio: user.bio,
      role: user.role,
      favorites: await this.getUserFavoriteSlugs(user.id),
    };
  }

  private async requireUser(token?: string) {
    const rawToken = token?.replace('Bearer ', '');

    if (!rawToken) {
      throw new UnauthorizedException('请先登录');
    }

    try {
      const payload = await this.jwt.verifyAsync<{ sub: number }>(rawToken, { secret: jwtSecret });
      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });

      if (!user) {
        throw new UnauthorizedException('请先登录');
      }

      return user;
    } catch {
      throw new UnauthorizedException('登录状态已失效');
    }
  }

  private async requireAdmin(token?: string) {
    const user = await this.requireUser(token);

    if (user.role !== Role.ADMIN) {
      throw new UnauthorizedException('需要管理员权限');
    }

    return user;
  }

  private async createUniqueSlug(title: string) {
    const baseSlug =
      title
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') || `post-${Date.now()}`;
    let slug = baseSlug;
    let index = 2;

    while (await this.prisma.post.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${index}`;
      index += 1;
    }

    return slug;
  }

  private async getUserFavoriteSlugs(userId: number) {
    const favorites = await this.prisma.favorite.findMany({
      where: { userId },
      include: { post: true },
    });

    return favorites.map((favorite) => favorite.post.slug);
  }

  private serializePost(post: Prisma.PostGetPayload<{ include: typeof postInclude }>) {
    return {
      id: post.id,
      title: post.title,
      slug: post.slug,
      summary: post.summary,
      content: post.content,
      coverUrl: post.coverUrl,
      status: post.status,
      isTop: post.isTop,
      isRecommend: post.isRecommend,
      viewCount: post.viewCount,
      reviewMessage: post.reviewMessage,
      publishedAt: (post.publishedAt ?? post.createdAt).toISOString(),
      category: post.category,
      tags: post.tags.map((postTag) => postTag.tag),
      authorId: post.authorId,
      authorName: post.author.nickname,
      creator: {
        id: post.author.id,
        username: post.author.username,
        nickname: post.author.nickname,
        avatarUrl: post.author.avatarUrl || defaultAvatar,
      },
      favoriteCount: post.favorites.length,
    };
  }

  private normalizeContent(content: string) {
    const htmlContent =
      content.includes('<p>') || content.includes('<h')
        ? content
        : content
            .split(/\n{2,}/)
            .map((paragraph) => `<p>${paragraph.trim()}</p>`)
            .join('');

    return this.sanitizeHtml(htmlContent);
  }

  private normalizeSlug(slug: string) {
    const normalizedSlug = slug
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/-{2,}/g, '-')
      .replace(/(^-|-$)/g, '');

    if (!normalizedSlug) {
      throw new BadRequestException('别名只能包含英文、数字和短横线');
    }

    return normalizedSlug;
  }

  private normalizePositiveInteger(value: string | undefined, fallback: number, min: number, max: number) {
    const parsedValue = Number(value);

    if (!Number.isInteger(parsedValue)) {
      return fallback;
    }

    return Math.min(Math.max(parsedValue, min), max);
  }

  private normalizeProgress(value: number | undefined) {
    if (typeof value !== 'number' || !Number.isInteger(value)) {
      return 0;
    }

    return Math.min(Math.max(value, 0), 100);
  }

  private parseReportRange(weekStartValue: string, weekEndValue: string) {
    const weekStart = new Date(weekStartValue);
    const weekEnd = new Date(weekEndValue);

    if (Number.isNaN(weekStart.getTime()) || Number.isNaN(weekEnd.getTime())) {
      throw new BadRequestException('周报日期不正确');
    }

    if (weekStart > weekEnd) {
      throw new BadRequestException('周报开始日期不能晚于结束日期');
    }

    return { weekStart, weekEnd };
  }

  private async requireOwnedWeeklyReport(id: number, userId: number) {
    const report = await this.prisma.weeklyReport.findFirst({ where: { id, userId } });

    if (!report) {
      throw new NotFoundException('周报不存在');
    }

    return report;
  }

  private async requireOwnedPlan(id: number, userId: number) {
    const plan = await this.prisma.personalPlan.findFirst({ where: { id, userId } });

    if (!plan) {
      throw new NotFoundException('计划不存在');
    }

    return plan;
  }

  private serializeWeeklyReport(report: Prisma.WeeklyReportGetPayload<Record<string, never>>) {
    return {
      id: report.id,
      title: report.title,
      summary: report.summary,
      content: report.content,
      weekStart: report.weekStart.toISOString(),
      weekEnd: report.weekEnd.toISOString(),
      createdAt: report.createdAt.toISOString(),
      updatedAt: report.updatedAt.toISOString(),
    };
  }

  private serializePersonalPlan(plan: Prisma.PersonalPlanGetPayload<Record<string, never>>) {
    return {
      id: plan.id,
      title: plan.title,
      type: plan.type,
      status: plan.status,
      progress: plan.progress,
      currentPlan: plan.currentPlan,
      nextPlan: plan.nextPlan,
      content: plan.content,
      createdAt: plan.createdAt.toISOString(),
      updatedAt: plan.updatedAt.toISOString(),
    };
  }

  private sanitizeHtml(content: string) {
    const allowedTags = new Set(['p', 'br', 'strong', 'b', 'em', 'i', 'u', 'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'h1', 'h2', 'h3', 'h4', 'a']);

    return content.replace(/<\/?([a-z][a-z0-9]*)\b([^>]*)>/gi, (match, tagName: string, attributes: string) => {
      const normalizedTagName = tagName.toLowerCase();

      if (!allowedTags.has(normalizedTagName)) {
        return '';
      }

      if (normalizedTagName !== 'a') {
        return match.startsWith('</') ? `</${normalizedTagName}>` : `<${normalizedTagName}>`;
      }

      if (match.startsWith('</')) {
        return '</a>';
      }

      const hrefMatch = attributes.match(/\shref=["'](https?:\/\/[^"']+)["']/i);
      return hrefMatch ? `<a href="${hrefMatch[1]}" target="_blank" rel="noopener noreferrer">` : '<a>';
    });
  }

  private handleUniqueTaxonomyError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException('名称或别名已存在');
    }

    throw error;
  }

  private handleTaxonomyMutationError(error: unknown, notFoundMessage: string): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      throw new NotFoundException(notFoundMessage);
    }

    return this.handleUniqueTaxonomyError(error);
  }
}
