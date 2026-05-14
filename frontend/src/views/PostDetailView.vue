<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { NButton, NCard, NImage, NSkeleton, NSpace, NTag, NText, useMessage } from 'naive-ui'
import { HeartOutline } from '@vicons/ionicons5'
import { blogApi } from '../api/blog'
import CommentBox from '../components/CommentBox.vue'
import { useAuthStore } from '../stores/auth'
import type { Post } from '../types/blog'

const route = useRoute()
const message = useMessage()
const authStore = useAuthStore()
const post = ref<Post | null>(null)
const isLoading = ref(true)
const isFavoriting = ref(false)

onMounted(async () => {
  await authStore.loadMe()
  try {
    post.value = await blogApi.getPost(String(route.params.slug))
  } finally {
    isLoading.value = false
  }
})

async function toggleFavorite() {
  if (!post.value) return

  if (!authStore.isLoggedIn) {
    message.warning('请先登录后再收藏文章')
    return
  }

  isFavoriting.value = true
  try {
    const result = await blogApi.toggleFavorite(post.value.slug)
    post.value = result.post
    authStore.updateFavorites(result.favorites)
    message.success(result.favorited ? '已加入收藏' : '已取消收藏')
  } finally {
    isFavoriting.value = false
  }
}
</script>

<template>
  <main class="detail-page">
    <NCard v-if="isLoading">
      <NSkeleton text :repeat="6" />
    </NCard>

    <article v-else-if="post">
      <NCard class="article-card">
        <NSpace vertical :size="20">
          <NTag type="primary" round>{{ post.category.name }}</NTag>
          <h1 class="article-title">{{ post.title }}</h1>
          <NText depth="2" class="article-summary">{{ post.summary }}</NText>
          <NSpace align="center">
            <NButton type="primary" :loading="isFavoriting" @click="toggleFavorite">
              <template #icon>
                <HeartOutline />
              </template>
              {{ authStore.user?.favorites.includes(post.slug) ? '取消收藏' : '收藏文章' }}
            </NButton>
            <NText depth="3">{{ post.favoriteCount }} 次收藏</NText>
            <NText depth="3">{{ post.viewCount }} 次阅读</NText>
          </NSpace>
        </NSpace>
      </NCard>

      <NImage :src="post.coverUrl" :alt="post.title" preview-disabled object-fit="cover" class="article-cover" />
      <NCard class="article-content-card">
        <div class="prose-blog" v-html="post.content" />
      </NCard>
      <CommentBox :post-slug="post.slug" />
    </article>
  </main>
</template>

<style scoped>
.detail-page {
  max-width: 880px;
  margin: 0 auto;
  padding: 32px 24px 56px;
}

.article-card {
  margin-bottom: 18px;
}

.article-title {
  margin: 0;
  font-size: clamp(34px, 5vw, 56px);
  font-weight: 900;
  line-height: 1.12;
}

.article-summary {
  display: block;
  font-size: 18px;
  line-height: 1.8;
}

.article-cover {
  width: 100%;
  height: 380px;
  border-radius: 14px;
  overflow: hidden;
  display: flex;
  justify-content: center;
}

.article-content-card {
  margin-top: 18px;
}

@media (max-width: 760px) {
  .article-cover {
    height: 260px;
  }
}
</style>
