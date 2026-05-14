<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { NButton, NCard, NEllipsis, NEmpty, NSkeleton, NSpace, NTag, NText } from 'naive-ui'
import { blogApi } from '../api/blog'
import type { Post, PostStatus } from '../types/blog'

const posts = ref<Post[]>([])
const isLoading = ref(true)

const statusLabels: Record<PostStatus, string> = {
  DRAFT: '草稿',
  PENDING: '待审核',
  REJECTED: '已驳回',
  PUBLISHED: '已发布',
  ARCHIVED: '已归档',
}

const statusTypes: Record<PostStatus, 'default' | 'error' | 'success' | 'warning'> = {
  DRAFT: 'warning',
  PENDING: 'warning',
  REJECTED: 'error',
  PUBLISHED: 'success',
  ARCHIVED: 'default',
}

const groupedPosts = computed(() => ({
  editable: posts.value.filter((post) => post.status === 'DRAFT' || post.status === 'REJECTED'),
  reviewing: posts.value.filter((post) => post.status === 'PENDING'),
  published: posts.value.filter((post) => post.status === 'PUBLISHED' || post.status === 'ARCHIVED'),
}))

onMounted(async () => {
  try {
    posts.value = await blogApi.getMyPosts()
  } finally {
    isLoading.value = false
  }
})
</script>

<template>
  <main class="my-posts-page">
    <NCard title="我的投稿">
      <template #header-extra>
        <RouterLink to="/write">
          <NButton type="primary">写文章</NButton>
        </RouterLink>
      </template>

      <NSpace v-if="isLoading" vertical>
        <NSkeleton text :repeat="4" />
      </NSpace>

      <NEmpty v-else-if="posts.length === 0" description="暂时还没有投稿">
        <template #extra>
          <RouterLink to="/write">
            <NButton type="primary">新建文章</NButton>
          </RouterLink>
        </template>
      </NEmpty>

      <TransitionGroup v-else name="my-post-list" tag="div" class="post-list">
        <NCard v-for="post in groupedPosts.editable" :key="`editable-${post.id}`" class="post-item">
          <NSpace align="center" justify="space-between">
            <NSpace align="center" :size="8">
              <NTag size="small" :type="statusTypes[post.status]">{{ statusLabels[post.status] }}</NTag>
              <NText depth="3">{{ new Date(post.publishedAt).toLocaleDateString('zh-CN') }}</NText>
            </NSpace>
            <RouterLink :to="`/write/${post.id}`">
              <NButton size="small" type="primary" secondary>编辑</NButton>
            </RouterLink>
          </NSpace>
          <h2 class="post-title">{{ post.title }}</h2>
          <NText v-if="post.reviewMessage" type="error" class="review-message">驳回原因：{{ post.reviewMessage }}</NText>
          <NText depth="2" class="post-summary">
            <NEllipsis :line-clamp="3">
              {{ post.summary }}
              <template #tooltip>
                <div style="text-align: center; padding: 8px 12px;width: 700px;">
                  {{ post.summary }}
                </div>
              </template>
            </NEllipsis>
          </NText>
        </NCard>

        <NCard v-for="post in groupedPosts.reviewing" :key="`reviewing-${post.id}`" class="post-item">
          <NSpace align="center" :size="8">
            <NTag size="small" :type="statusTypes[post.status]">{{ statusLabels[post.status] }}</NTag>
            <NText depth="3">等待管理员审核</NText>
          </NSpace>
          <h2 class="post-title">{{ post.title }}</h2>
          <NText depth="2" class="post-summary">
            <NEllipsis :line-clamp="3">
              {{ post.summary }}
              <template #tooltip>
                <div style="text-align: center; padding: 8px 12px;width: 700px;">
                  {{ post.summary }}
                </div>
              </template>
            </NEllipsis>
          </NText>
        </NCard>

        <NCard v-for="post in groupedPosts.published" :key="`published-${post.id}`" class="post-item">
          <NSpace align="center" justify="space-between">
            <NSpace align="center" :size="8">
              <NTag size="small" :type="statusTypes[post.status]">{{ statusLabels[post.status] }}</NTag>
              <NText depth="3">{{ post.viewCount }} 次阅读</NText>
            </NSpace>
            <RouterLink v-if="post.status === 'PUBLISHED'" :to="`/posts/${post.slug}`">
              <NButton size="small" secondary>查看</NButton>
            </RouterLink>
          </NSpace>
          <h2 class="post-title">{{ post.title }}</h2>
          <NText depth="2" class="post-summary">
            <NEllipsis :line-clamp="3">
              {{ post.summary }}
              <template #tooltip>
                <div style="text-align: center; padding: 8px 12px;width: 700px;">
                  {{ post.summary }}
                </div>
              </template>
            </NEllipsis>
          </NText>
        </NCard>
      </TransitionGroup>
    </NCard>
  </main>
</template>

<style scoped>
.my-posts-page {
  max-width: 980px;
  margin: 0 auto;
  padding: 32px 24px 56px;
}

.post-list {
  display: grid;
  gap: 18px;
}

.post-item {
  transition: border-color 0.22s ease, box-shadow 0.22s ease, transform 0.22s ease;
}

.post-item:hover {
  transform: translateY(-3px);
}

.my-post-list-enter-active,
.my-post-list-leave-active {
  transition: opacity 0.28s ease, transform 0.28s ease;
}

.my-post-list-enter-from,
.my-post-list-leave-to {
  opacity: 0;
  transform: translateY(12px);
}

.my-post-list-move {
  transition: transform 0.28s ease;
}

.post-title {
  font-size: 22px;
  margin: 12px 0 8px;
}

.post-summary,
.review-message {
  display: block;
  line-height: 1.75;
}

.review-message {
  margin-bottom: 8px;
}
</style>
