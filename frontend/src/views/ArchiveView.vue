<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { NCard, NEmpty, NList, NListItem, NTag, NText, NTimeline, NTimelineItem } from 'naive-ui'
import { blogApi } from '../api/blog'
import type { Post } from '../types/blog'

const posts = ref<Post[]>([])
const groupedPosts = computed(() =>
  posts.value.reduce<Record<string, Post[]>>((groups, post) => {
    const date = new Date(post.publishedAt)
    const key = `${date.getFullYear()} 年 ${String(date.getMonth() + 1).padStart(2, '0')} 月`
    groups[key] = [...(groups[key] ?? []), post]
    return groups
  }, {}),
)

onMounted(async () => {
  posts.value = await blogApi.getPosts()
})
</script>

<template>
  <main class="archive-page">
    <NCard title="文章归档">
      <NEmpty v-if="posts.length === 0" description="暂无归档文章" />
      <NTimeline v-else>
        <NTimelineItem v-for="(items, month) in groupedPosts" :key="month" type="success" :title="month">
          <NList hoverable clickable>
            <NListItem v-for="post in items" :key="post.id">
              <RouterLink :to="`/posts/${post.slug}`" class="archive-link">{{ post.title }}</RouterLink>
              <template #suffix>
                <NTag size="small" round>{{ post.category.name }}</NTag>
              </template>
              <NText depth="3" class="archive-summary">{{ post.summary }}</NText>
            </NListItem>
          </NList>
        </NTimelineItem>
      </NTimeline>
    </NCard>
  </main>
</template>

<style scoped>
.archive-page {
  max-width: 900px;
  margin: 0 auto;
  padding: 32px 24px 56px;
}

.archive-link {
  color: var(--n-text-color);
  font-weight: 750;
  text-decoration: none;
}

.archive-link:hover {
  color: var(--n-primary-color);
}

.archive-summary {
  display: block;
  margin-top: 8px;
}
</style>
