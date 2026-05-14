import { Body, Controller, Delete, Get, Headers, Param, ParseIntPipe, Post, Put, Query, Req, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { BlogService } from './blog.service';
import { UploadService } from '../upload.service';
import {
  AuthDto,
  CreateCommentDto,
  CreatePostDto,
  UpdateCommentStatusDto,
  UpdatePostRecommendDto,
  UpdatePostStatusDto,
  UpdateProfileDto,
  UpsertPersonalPlanDto,
  UpsertTaxonomyDto,
  UpsertWeeklyReportDto,
} from './blog.dto';
import type { AdminPostQuery, PostQuery, PostStatus } from './blog.types';

function ok<T>(data: T) {
  return {
    code: 0,
    message: 'ok',
    data,
  };
}

@Controller('api/v1')
export class BlogController {
  constructor(
    private readonly blogService: BlogService,
    private readonly uploadService: UploadService,
  ) {}

  @Post('auth/register')
  async register(@Body() payload: AuthDto) {
    return ok(await this.blogService.register(payload));
  }

  @Post('auth/login')
  async login(@Body() payload: AuthDto) {
    return ok(await this.blogService.login(payload));
  }

  @Get('auth/me')
  async getMe(@Headers('authorization') authorization?: string) {
    return ok(await this.blogService.getMe(authorization));
  }

  @Post('auth/profile')
  async updateProfile(@Body() payload: UpdateProfileDto, @Headers('authorization') authorization?: string) {
    return ok(await this.blogService.updateProfile(payload, authorization));
  }

  @Post('auth/avatar')
  @UseInterceptors(FileInterceptor('avatar'))
  async uploadAvatar(
    @UploadedFile() file: Express.Multer.File,
    @Req() request: Request,
    @Headers('authorization') authorization?: string,
  ) {
    const currentUser = await this.blogService.getMe(authorization);
    const requestOrigin = `${request.protocol}://${request.get('host')}`;
    const avatarUrl = this.uploadService.saveAvatar(file, requestOrigin);
    this.uploadService.deletePreviousAvatar(currentUser.avatarUrl);
    return ok(await this.blogService.updateProfile({ avatarUrl }, authorization));
  }

  @Get('posts')
  async getPosts(@Query() query: PostQuery) {
    return ok(await this.blogService.getPosts(query));
  }

  @Get('admin/posts')
  async getAdminPosts(@Query() query: AdminPostQuery, @Headers('authorization') authorization?: string) {
    return ok(await this.blogService.getAdminPosts(query, authorization));
  }

  @Get('me/drafts')
  async getMyDrafts(@Headers('authorization') authorization?: string) {
    return ok(await this.blogService.getMyDrafts(authorization));
  }

  @Get('me/posts')
  async getMyPosts(@Headers('authorization') authorization?: string) {
    return ok(await this.blogService.getMyPosts(authorization));
  }

  @Get('me/notifications')
  async getMyNotifications(@Headers('authorization') authorization?: string) {
    return ok(await this.blogService.getMyNotifications(authorization));
  }

  @Put('me/notifications/read')
  async markMyNotificationsRead(@Headers('authorization') authorization?: string) {
    return ok(await this.blogService.markMyNotificationsRead(authorization));
  }

  @Get('admin/review-logs')
  async getReviewLogs(@Headers('authorization') authorization?: string) {
    return ok(await this.blogService.getReviewLogs(authorization));
  }

  @Get('posts/:slug')
  async getPost(@Param('slug') slug: string) {
    return ok(await this.blogService.getPost(slug));
  }

  @Post('admin/posts')
  async createPost(@Body() payload: CreatePostDto, @Headers('authorization') authorization?: string) {
    return ok(await this.blogService.createPost(payload, authorization));
  }

  @Post('posts')
  async createMyPost(@Body() payload: CreatePostDto, @Headers('authorization') authorization?: string) {
    return ok(await this.blogService.createMyPost(payload, authorization));
  }

  @Put('me/posts/:id')
  async updateMyPost(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: CreatePostDto,
    @Headers('authorization') authorization?: string,
  ) {
    return ok(await this.blogService.updateMyPost(id, payload, authorization));
  }

  @Put('admin/posts/:id')
  async updatePost(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: CreatePostDto,
    @Headers('authorization') authorization?: string,
  ) {
    return ok(await this.blogService.updatePost(id, payload, authorization));
  }

  @Put('admin/posts/:id/status')
  async updatePostStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: UpdatePostStatusDto,
    @Headers('authorization') authorization?: string,
  ) {
    return ok(await this.blogService.updatePostStatus(id, payload, authorization));
  }

  @Put('admin/posts/:id/recommend')
  async updatePostRecommend(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: UpdatePostRecommendDto,
    @Headers('authorization') authorization?: string,
  ) {
    return ok(await this.blogService.updatePostRecommend(id, payload.isRecommend, authorization));
  }

  @Delete('admin/posts/:id')
  async deletePost(@Param('id', ParseIntPipe) id: number, @Headers('authorization') authorization?: string) {
    return ok(await this.blogService.deletePost(id, authorization));
  }

  @Post('posts/:slug/favorite')
  async toggleFavorite(@Param('slug') slug: string, @Headers('authorization') authorization?: string) {
    return ok(await this.blogService.toggleFavorite(slug, authorization));
  }

  @Get('me/favorites')
  async getMyFavorites(@Headers('authorization') authorization?: string) {
    return ok(await this.blogService.getMyFavorites(authorization));
  }

  @Get('me/weekly-reports')
  async getMyWeeklyReports(@Headers('authorization') authorization?: string) {
    return ok(await this.blogService.getMyWeeklyReports(authorization));
  }

  @Post('me/weekly-reports')
  async createMyWeeklyReport(
    @Body() payload: UpsertWeeklyReportDto,
    @Headers('authorization') authorization?: string,
  ) {
    return ok(await this.blogService.createMyWeeklyReport(payload, authorization));
  }

  @Put('me/weekly-reports/:id')
  async updateMyWeeklyReport(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: UpsertWeeklyReportDto,
    @Headers('authorization') authorization?: string,
  ) {
    return ok(await this.blogService.updateMyWeeklyReport(id, payload, authorization));
  }

  @Delete('me/weekly-reports/:id')
  async deleteMyWeeklyReport(@Param('id', ParseIntPipe) id: number, @Headers('authorization') authorization?: string) {
    return ok(await this.blogService.deleteMyWeeklyReport(id, authorization));
  }

  @Get('me/plans')
  async getMyPlans(@Headers('authorization') authorization?: string) {
    return ok(await this.blogService.getMyPlans(authorization));
  }

  @Post('me/plans')
  async createMyPlan(@Body() payload: UpsertPersonalPlanDto, @Headers('authorization') authorization?: string) {
    return ok(await this.blogService.createMyPlan(payload, authorization));
  }

  @Put('me/plans/:id')
  async updateMyPlan(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: UpsertPersonalPlanDto,
    @Headers('authorization') authorization?: string,
  ) {
    return ok(await this.blogService.updateMyPlan(id, payload, authorization));
  }

  @Delete('me/plans/:id')
  async deleteMyPlan(@Param('id', ParseIntPipe) id: number, @Headers('authorization') authorization?: string) {
    return ok(await this.blogService.deleteMyPlan(id, authorization));
  }

  @Get('categories')
  async getCategories() {
    return ok(await this.blogService.getCategories());
  }

  @Get('admin/categories')
  async getAdminCategories(@Headers('authorization') authorization?: string) {
    return ok(await this.blogService.getAdminCategories(authorization));
  }

  @Post('admin/categories')
  async createCategory(@Body() payload: UpsertTaxonomyDto, @Headers('authorization') authorization?: string) {
    return ok(await this.blogService.createCategory(payload, authorization));
  }

  @Put('admin/categories/:id')
  async updateCategory(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: UpsertTaxonomyDto,
    @Headers('authorization') authorization?: string,
  ) {
    return ok(await this.blogService.updateCategory(id, payload, authorization));
  }

  @Delete('admin/categories/:id')
  async deleteCategory(@Param('id', ParseIntPipe) id: number, @Headers('authorization') authorization?: string) {
    return ok(await this.blogService.deleteCategory(id, authorization));
  }

  @Get('tags')
  async getTags() {
    return ok(await this.blogService.getTags());
  }

  @Get('admin/tags')
  async getAdminTags(@Headers('authorization') authorization?: string) {
    return ok(await this.blogService.getAdminTags(authorization));
  }

  @Post('admin/tags')
  async createTag(@Body() payload: UpsertTaxonomyDto, @Headers('authorization') authorization?: string) {
    return ok(await this.blogService.createTag(payload, authorization));
  }

  @Put('admin/tags/:id')
  async updateTag(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: UpsertTaxonomyDto,
    @Headers('authorization') authorization?: string,
  ) {
    return ok(await this.blogService.updateTag(id, payload, authorization));
  }

  @Delete('admin/tags/:id')
  async deleteTag(@Param('id', ParseIntPipe) id: number, @Headers('authorization') authorization?: string) {
    return ok(await this.blogService.deleteTag(id, authorization));
  }

  @Get('comments/:postSlug')
  async getComments(@Param('postSlug') postSlug: string) {
    return ok(await this.blogService.getComments(postSlug));
  }

  @Post('comments')
  async createComment(@Body() payload: CreateCommentDto) {
    return ok(await this.blogService.createComment(payload));
  }

  @Get('admin/comments')
  async getAdminComments(@Headers('authorization') authorization?: string) {
    return ok(await this.blogService.getAdminComments(authorization));
  }

  @Put('admin/comments/:id/status')
  async updateCommentStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: UpdateCommentStatusDto,
    @Headers('authorization') authorization?: string,
  ) {
    return ok(await this.blogService.updateCommentStatus(id, payload.status, authorization));
  }

  @Get('site-configs/public')
  getPublicConfig() {
    return ok(this.blogService.getPublicConfig());
  }

  @Get('admin/stats')
  async getDashboardStats() {
    return ok(await this.blogService.getDashboardStats());
  }
}
