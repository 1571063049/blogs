const { PrismaClient, PostStatus, Role, CommentStatus } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const adminPasswordHash = await bcrypt.hash('admin123', 10);

  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {
      nickname: '管理员',
      role: Role.ADMIN,
    },
    create: {
      username: 'admin',
      passwordHash: adminPasswordHash,
      nickname: '管理员',
      avatarUrl: 'https://api.dicebear.com/8.x/initials/svg?seed=Admin',
      bio: '负责维护博客内容、发布文章和管理站点。',
      role: Role.ADMIN,
    },
  });

  const engineering = await prisma.category.upsert({
    where: { slug: 'engineering' },
    update: {
      name: '工程实践',
      description: '架构设计、实现记录与技术取舍。',
    },
    create: {
      name: '工程实践',
      slug: 'engineering',
      description: '架构设计、实现记录与技术取舍。',
    },
  });

  await prisma.category.upsert({
    where: { slug: 'product' },
    update: {
      name: '产品思考',
      description: '关于产品体验、工作流与需求判断的记录。',
    },
    create: {
      name: '产品思考',
      slug: 'product',
      description: '关于产品体验、工作流与需求判断的记录。',
    },
  });

  const lifeNotes = await prisma.category.upsert({
    where: { slug: 'life-notes' },
    update: {
      name: '生活札记',
      description: '个人反思、日常观察和长期笔记。',
    },
    create: {
      name: '生活札记',
      slug: 'life-notes',
      description: '个人反思、日常观察和长期笔记。',
    },
  });

  const tagData = [
    { name: 'Vue 实战', slug: 'vue' },
    { name: 'NestJS 后端', slug: 'nestjs' },
    { name: 'TypeScript', slug: 'typescript' },
    { name: '写作', slug: 'writing' },
  ];
  const tags = [];

  for (const tag of tagData) {
    tags.push(
      await prisma.tag.upsert({
        where: { slug: tag.slug },
        update: { name: tag.name },
        create: tag,
      }),
    );
  }

  const posts = [
    {
      title: '设计一个容易长期维护的个人博客',
      slug: 'designing-a-calm-blog',
      summary: '从结构、默认配置和写作流程出发，让个人博客真正容易持续更新。',
      content:
        '<p>一个个人博客能否坚持下去，关键在于发布是否足够轻量。技术栈当然重要，但真正影响体验的是清晰的默认值：易读的布局、稳定的路由、明确的内容状态，以及让决策变少的后台界面。</p><h2>从写作流程开始</h2><p>核心流程应该是草稿、预览、发布和修改。当这个流程足够顺畅时，分类、标签、评论和统计才会成为有帮助的支撑，而不是额外负担。</p>',
      coverUrl:
        'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1200&q=80',
      status: PostStatus.PUBLISHED,
      isTop: true,
      isRecommend: true,
      viewCount: 1248,
      publishedAt: new Date('2026-04-18T09:00:00.000Z'),
      categoryId: engineering.id,
      tagSlugs: ['vue', 'typescript', 'writing'],
    },
    {
      title: '内容型应用的一份小而稳的 API 契约',
      slug: 'small-api-contract-content-apps',
      summary: '内容站点早期不需要庞大的后端，真正重要的是一致、类型清晰，并且未来容易接入数据库。',
      content:
        '<p>早期 API 的目标是验证应用形态。稳定的列表接口、详情接口和统一响应结构，能让前端快速推进，同时给后续持久化层留下替换空间。</p><h2>让接口保持朴素</h2><p>朴素的契约是一种礼物。它让项目更容易测试、记录，也更容易在数据库接入时完成迁移。</p>',
      coverUrl:
        'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=1200&q=80',
      status: PostStatus.PUBLISHED,
      isTop: false,
      isRecommend: true,
      viewCount: 731,
      publishedAt: new Date('2026-04-05T09:00:00.000Z'),
      categoryId: engineering.id,
      tagSlugs: ['nestjs', 'typescript'],
    },
    {
      title: '笔记需要一个可以安放的地方',
      slug: 'notes-need-a-place',
      summary: '轻量的发布系统能让想法越过当天的情绪，留下可以反复回看的形状。',
      content:
        '<p>私人笔记很有用，但公开笔记会带来另一种清晰度。它要求一点点结构，让想法更容易被重新阅读，同时又不该把写作变成仪式。</p><h2>降低开始的门槛</h2><p>最好的发布系统，是在很累的一天结束后，你仍然愿意打开使用的那个。</p>',
      coverUrl:
        'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=1200&q=80',
      status: PostStatus.PUBLISHED,
      isTop: false,
      isRecommend: false,
      viewCount: 419,
      publishedAt: new Date('2026-03-21T09:00:00.000Z'),
      categoryId: lifeNotes.id,
      tagSlugs: ['writing'],
    },
  ];

  for (const postData of posts) {
    const { tagSlugs, ...postFields } = postData;
    const post = await prisma.post.upsert({
      where: { slug: postData.slug },
      update: {
        title: postData.title,
        summary: postData.summary,
        content: postData.content,
        coverUrl: postData.coverUrl,
        status: postData.status,
        isTop: postData.isTop,
        isRecommend: postData.isRecommend,
        categoryId: postData.categoryId,
      },
      create: {
        ...postFields,
        authorId: admin.id,
      },
    });

    await prisma.postTag.deleteMany({ where: { postId: post.id } });

    for (const tagSlug of tagSlugs) {
      const tag = tags.find((item) => item.slug === tagSlug);
      if (tag) {
        await prisma.postTag.create({
          data: { postId: post.id, tagId: tag.id },
        });
      }
    }
  }

  const firstPost = await prisma.post.findUnique({ where: { slug: 'designing-a-calm-blog' } });
  if (firstPost) {
    await prisma.favorite.upsert({
      where: { userId_postId: { userId: admin.id, postId: firstPost.id } },
      update: {},
      create: { userId: admin.id, postId: firstPost.id },
    });

    const existingComment = await prisma.comment.findFirst({
      where: { postId: firstPost.id, nickname: '小林' },
    });
    if (!existingComment) {
      await prisma.comment.create({
        data: {
          postId: firstPost.id,
          nickname: '小林',
          content: '草稿、预览、发布这个流程确实是最好的起点。',
          status: CommentStatus.APPROVED,
        },
      });
    }
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
