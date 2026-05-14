<script setup lang="ts">
import { ref } from 'vue'
import { NButton, NCard, NEmpty, NForm, NFormItem, NInput, NSpace, NText, useMessage } from 'naive-ui'
import { blogApi } from '../api/blog'
import type { Comment } from '../types/blog'

const props = defineProps<{ postSlug: string }>()
const message = useMessage()
const comments = ref<Comment[]>([])
const nickname = ref('')
const content = ref('')
const isLoading = ref(true)
const isSubmitting = ref(false)

async function loadComments() {
  isLoading.value = true
  try {
    comments.value = await blogApi.getComments(props.postSlug)
  } finally {
    isLoading.value = false
  }
}

async function submitComment() {
  if (!nickname.value.trim() || !content.value.trim()) {
    message.warning('请填写昵称和评论内容')
    return
  }

  isSubmitting.value = true
  try {
    const comment = await blogApi.createComment({
      postSlug: props.postSlug,
      nickname: nickname.value,
      content: content.value,
    })
    comments.value = [comment, ...comments.value]
    nickname.value = ''
    content.value = ''
    message.success('评论已发布')
  } catch {
    message.error('评论发布失败，请稍后重试')
  } finally {
    isSubmitting.value = false
  }
}

void loadComments()
</script>

<template>
  <NCard title="评论" class="comment-card">
    <NForm label-placement="top" @submit.prevent="submitComment">
      <NFormItem label="昵称" required>
        <NInput v-model:value="nickname" clearable placeholder="请输入你的昵称" />
      </NFormItem>
      <NFormItem label="评论内容" required>
        <NInput
          v-model:value="content"
          type="textarea"
          :autosize="{ minRows: 4, maxRows: 8 }"
          placeholder="写下你的想法"
        />
      </NFormItem>
      <NSpace justify="end">
        <NButton :disabled="isSubmitting" @click="content = ''">清空</NButton>
        <NButton type="primary" attr-type="submit" :loading="isSubmitting">发布评论</NButton>
      </NSpace>
    </NForm>

    <NSpace vertical :size="12" class="comment-list">
      <NEmpty v-if="!isLoading && comments.length === 0" description="暂无评论" />
      <NCard v-for="comment in comments" v-else :key="comment.id" size="small" embedded>
        <NText strong>{{ comment.nickname }}</NText>
        <NText depth="2" class="comment-content">{{ comment.content }}</NText>
      </NCard>
    </NSpace>
  </NCard>
</template>

<style scoped>
.comment-card {
  margin-top: 28px;
}

.comment-list {
  margin-top: 24px;
}

.comment-content {
  display: block;
  margin-top: 8px;
  line-height: 1.75;
}
</style>
