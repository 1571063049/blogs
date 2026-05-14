<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { NButton, NCard, NEmpty, NSkeleton, NSpace } from 'naive-ui'
import { blogApi } from '../api/blog'
import PostCard from '../components/PostCard.vue'
import { useAuthStore } from '../stores/auth'
import type { Post } from '../types/blog'

const authStore = useAuthStore()
const posts = ref<Post[]>([])
const isLoading = ref(true)

onMounted(async () => {
  await authStore.loadMe()
  if (authStore.isLoggedIn) {
    posts.value = await blogApi.getMyFavorites()
  }
  isLoading.value = false
})
</script>

<template>
  <main class="list-page">
    <NCard title="我的收藏">
      <template #header-extra>
        <RouterLink to="/">
          <NButton quaternary>继续浏览</NButton>
        </RouterLink>
      </template>

      <NEmpty v-if="!authStore.isLoggedIn" description="请先登录后查看收藏文章">
        <template #extra>
          <RouterLink to="/login">
            <NButton type="primary">前往登录</NButton>
          </RouterLink>
        </template>
      </NEmpty>

      <NSpace v-else-if="isLoading" vertical>
        <NSkeleton text :repeat="4" />
      </NSpace>

      <NEmpty v-else-if="posts.length === 0" description="暂时还没有收藏文章" />
      <NSpace v-else vertical :size="16">
        <PostCard v-for="post in posts" :key="post.id" :post="post" />
      </NSpace>
    </NCard>
  </main>
</template>

<style scoped>
.list-page {
  max-width: 980px;
  margin: 0 auto;
  padding: 32px 24px 56px;
}
</style>
