import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Max,
  Min,
} from 'class-validator';
import { CommentStatus, PlanStatus, PlanType, PostStatus } from '@prisma/client';

export class AuthDto {
  @IsString()
  @Length(3, 32)
  username!: string;

  @IsString()
  @Length(6, 64)
  password!: string;

  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value))
  @IsOptional()
  @IsString()
  @Length(1, 32)
  nickname?: string;
}

export class UpdateProfileDto {
  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value))
  @IsOptional()
  @IsString()
  @Length(1, 32)
  nickname?: string;

  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value))
  @IsOptional()
  @IsUrl({ require_protocol: true })
  avatarUrl?: string;

  @IsOptional()
  @IsString()
  @Length(0, 240)
  bio?: string;
}

export class CreateCommentDto {
  @IsString()
  @IsNotEmpty()
  postSlug!: string;

  @IsString()
  @Length(1, 32)
  nickname!: string;

  @IsString()
  @Length(1, 1000)
  content!: string;
}

export class CreatePostDto {
  @IsString()
  @Length(1, 160)
  title!: string;

  @IsString()
  @Length(1, 500)
  summary!: string;

  @IsString()
  @Length(1, 20000)
  content!: string;

  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value))
  @IsOptional()
  @IsUrl({ require_protocol: true })
  coverUrl?: string;

  @IsString()
  @IsNotEmpty()
  categorySlug!: string;

  @IsArray()
  @ArrayMaxSize(8)
  @IsString({ each: true })
  tagSlugs!: string[];

  @IsOptional()
  @IsIn(Object.values(PostStatus))
  status?: PostStatus;
}

export class UpsertTaxonomyDto {
  @IsString()
  @Length(1, 50)
  name!: string;

  @IsString()
  @Length(1, 80)
  slug!: string;

  @IsOptional()
  @IsString()
  @Length(0, 240)
  description?: string;
}

export class UpdateCommentStatusDto {
  @IsIn(Object.values(CommentStatus))
  status!: CommentStatus;
}

export class UpdatePostStatusDto {
  @IsIn(Object.values(PostStatus))
  status!: PostStatus;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  reviewMessage?: string;
}

export class UpdatePostRecommendDto {
  @IsBoolean()
  isRecommend!: boolean;
}

export class UpsertWeeklyReportDto {
  @IsString()
  @Length(1, 160)
  title!: string;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  summary?: string;

  @IsString()
  @Length(1, 50000)
  content!: string;

  @IsDateString()
  weekStart!: string;

  @IsDateString()
  weekEnd!: string;
}

export class UpsertPersonalPlanDto {
  @IsString()
  @Length(1, 160)
  title!: string;

  @IsOptional()
  @IsIn(Object.values(PlanType))
  type?: PlanType;

  @IsOptional()
  @IsIn(Object.values(PlanStatus))
  status?: PlanStatus;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  progress?: number;

  @IsOptional()
  @IsString()
  @Length(0, 2000)
  currentPlan?: string;

  @IsOptional()
  @IsString()
  @Length(0, 2000)
  nextPlan?: string;

  @IsString()
  @Length(1, 50000)
  content!: string;
}
