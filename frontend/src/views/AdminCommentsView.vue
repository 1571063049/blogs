<script setup lang="ts">
import { h, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { NButton, NCard, NDataTable, NEmpty, NSpace, NTag, useMessage, type DataTableColumns } from 'naive-ui'
import { blogApi } from '../api/blog'
import { useAuthStore } from '../stores/auth'
import type { Comment, CommentStatus } from '../types/blog'

const message = useMessage()
const authStore = useAuthStore()
const comments = ref<Comment[]>([])
const isLoading = ref(true)

const statusLabels: Record<CommentStatus, string> = {
  PENDING: '待审核',
  APPROVED: '已通过',
  REJECTED: '已拒绝',
}

const columns: DataTableColumns<Comment> = [
  { title: '文章', key: 'postTitle', minWidth: 180 },
  { title: '昵称', key: 'nickname', width: 120 },
  { title: '内容', key: 'content', minWidth: 260 },
  {
    title: '状态',
    key: 'status',
    width: 110,
    render(row) {
      const type = row.status === 'APPROVED' ? 'success' : row.status === 'PENDING' ? 'warning' : 'error'
      return h(NTag, { size: 'small', round: true, type }, { default: () => statusLabels[row.status] })
    },
  },
  {
    title: '操作',
    key: 'actions',
    width: 180,
    render(row) {
      return h(NSpace, { size: 8 }, () => [
        h(
          NButton,
          {
            size: 'small',
            type: 'success',
            tertiary: true,
            disabled: row.status === 'APPROVED',
            onClick: () => updateStatus(row.id, 'APPROVED'),
          },
          { default: () => '通过' },
        ),
        h(
          NButton,
          {
            size: 'small',
            type: 'error',
            tertiary: true,
            disabled: row.status === 'REJECTED',
            onClick: () => updateStatus(row.id, 'REJECTED'),
          },
          { default: () => '拒绝' },
        ),
      ])
    },
  },
]

async function loadComments() {
  isLoading.value = true
  await authStore.loadMe()
  if (!authStore.isAdmin) {
    isLoading.value = false
    return
  }

  try {
    comments.value = await blogApi.getAdminComments()
  } finally {
    isLoading.value = false
  }
}

async function updateStatus(id: number, status: CommentStatus) {
  try {
    const updatedComment = await blogApi.updateCommentStatus(id, status)
    comments.value = comments.value.map((comment) => (comment.id === id ? updatedComment : comment))
    message.success('评论状态已更新')
  } catch {
    message.error('操作失败，请稍后重试')
  }
}

onMounted(() => {
  void loadComments()
})
</script>

<template>
  <section>
    <NCard v-if="!authStore.isLoggedIn && !isLoading" title="请先登录">
      <NEmpty description="登录后才能审核评论">
        <template #extra>
          <RouterLink to="/login">
            <NButton type="primary">前往登录</NButton>
          </RouterLink>
        </template>
      </NEmpty>
    </NCard>

    <NCard v-else-if="!authStore.isAdmin && !isLoading" title="仅管理员可访问">
      <NEmpty description="评论审核仅管理员可操作。" />
    </NCard>

    <NCard v-else title="评论审核">
      <NDataTable
        :columns="columns"
        :data="comments"
        :loading="isLoading"
        :bordered="false"
        :pagination="{ pageSize: 8 }"
      />
    </NCard>
  </section>
</template>
