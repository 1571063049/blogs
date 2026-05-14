<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { NButton, NCard, NEmpty, NSkeleton, NSpace, NTag, NText, useMessage } from 'naive-ui'
import { blogApi } from '../api/blog'
import type { NotificationItem } from '../types/blog'

const message = useMessage()
const notifications = ref<NotificationItem[]>([])
const isLoading = ref(true)
const unreadCount = computed(() => notifications.value.filter((item) => !item.isRead).length)

onMounted(() => {
  void loadNotifications()
})

async function loadNotifications() {
  isLoading.value = true
  try {
    notifications.value = await blogApi.getMyNotifications()
  } finally {
    isLoading.value = false
  }
}

async function markAllRead() {
  await blogApi.markMyNotificationsRead()
  notifications.value = notifications.value.map((item) => ({ ...item, isRead: true }))
  message.success('通知已全部标记为已读')
}
</script>

<template>
  <main class="notifications-page">
    <NCard title="通知中心">
      <template #header-extra>
        <NButton :disabled="unreadCount === 0" @click="markAllRead">全部已读</NButton>
      </template>

      <NSpace v-if="isLoading" vertical>
        <NSkeleton text :repeat="4" />
      </NSpace>

      <NEmpty v-else-if="notifications.length === 0" description="暂无通知" />

      <NSpace v-else vertical :size="14">
        <NCard v-for="notification in notifications" :key="notification.id" embedded>
          <NSpace align="center" :size="8">
            <NTag size="small" :type="notification.isRead ? 'default' : 'success'">
              {{ notification.isRead ? '已读' : '未读' }}
            </NTag>
            <NText depth="3">{{ new Date(notification.createdAt).toLocaleString('zh-CN') }}</NText>
          </NSpace>
          <h2>{{ notification.title }}</h2>
          <p>{{ notification.content }}</p>
          <RouterLink to="/posts/mine">
            <NButton size="small" secondary>查看我的投稿</NButton>
          </RouterLink>
        </NCard>
      </NSpace>
    </NCard>
  </main>
</template>

<style scoped>
.notifications-page {
  max-width: 900px;
  margin: 0 auto;
  padding: 32px 24px 56px;
}

h2 {
  font-size: 20px;
  margin: 12px 0 8px;
}

p {
  color: var(--n-text-color-2);
  line-height: 1.75;
}
</style>
