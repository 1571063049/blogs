<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { NAvatar, NCard, NEllipsis, NImage, NSpace, NTag, NText, NFlex } from 'naive-ui'
import type { Post } from '../types/blog'
import { resolveAssetUrl } from '../utils/url'

defineProps<{ post: Post }>()
</script>

<template>
  <NCard hoverable class="post-card" content-style="padding: 0">
    <div class="post-card-grid">
      <NImage
        :src="post.coverUrl"
        :alt="post.title"
        class="post-cover"
        object-fit="cover"
        preview-disabled
      />
      <div class="post-body">
        <NSpace align="center" :size="8" wrap>
          <NTag size="small" type="primary" round>{{ post.category.name }}</NTag>
          <NText depth="3">{{ new Date(post.publishedAt).toLocaleDateString('zh-CN') }}</NText>
          <NText depth="3">{{ post.viewCount }} 次阅读</NText>
        </NSpace>

        <RouterLink :to="`/posts/${post.slug}`" class="post-title">
          <NEllipsis :line-clamp="2">
            {{ post.title }}
            <template #tooltip>
              <div style="text-align: center; padding: 8px 12px;width: 300px;">
                {{ post.title }}
              </div>
            </template>
          </NEllipsis>
        </RouterLink>

        <NText depth="2" class="post-summary">
          <NEllipsis :line-clamp="4">
            {{ post.summary }}
            <template #tooltip>
              <div style="text-align: center; padding: 8px 12px;width: 700px;">
                {{ post.summary }}
              </div>
            </template>
          </NEllipsis>
        </NText>

        <NFlex justify="space-between">
          <NSpace :size="8" wrap>
            <RouterLink v-for="tag in post.tags" :key="tag.id" :to="`/tag/${tag.slug}`" class="tag-link">
              <NTag size="small" round>{{ tag.name }}</NTag>
            </RouterLink>
          </NSpace>
          <NSpace align="center" :size="8" class="author-meta">
            <NAvatar round :size="26" :src="resolveAssetUrl(post.creator.avatarUrl)" />
            <NText depth="3">{{ post.creator.nickname || post.authorName }}</NText>
          </NSpace>
        </NFlex>
      </div>
    </div>
  </NCard>
</template>

<style scoped>
.post-card {
  overflow: hidden;
  animation: card-enter 0.36s ease both;
  transition: border-color 0.22s ease, box-shadow 0.22s ease, transform 0.22s ease;
  will-change: transform;
}

.post-card:hover {
  transform: translateY(-4px);
}

.post-card-grid {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
}

.post-cover {
  width: 100%;
  height: 100%;
  min-height: 190px;
  transition: transform 0.32s ease;
}

.post-card:hover .post-cover {
  transform: scale(1.035);
}

.post-body {
  display: grid;
  gap: 14px;
  padding: 22px;
}

.post-title {
  color: var(--n-text-color);
  font-size: 24px;
  font-weight: 800;
  line-height: 1.28;
  text-decoration: none;
}

.post-title:hover {
  color: var(--n-primary-color);
}

.post-summary {
  display: block;
  line-height: 1.75;
}

.tag-link {
  text-decoration: none;
}

.author-meta {
  flex-shrink: 0;
}

@keyframes card-enter {
  from {
    opacity: 0;
    transform: translateY(14px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 760px) {
  .post-card-grid {
    grid-template-columns: 1fr;
  }

  .post-cover {
    height: 220px;
  }
}
</style>
