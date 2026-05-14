<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  NButton,
  NCard,
  NEmpty,
  NForm,
  NFormItem,
  NImage,
  NInput,
  NModal,
  NSkeleton,
  NSpace,
  NTag,
  NText,
  useMessage,
} from 'naive-ui'
import { blogApi } from '../api/blog'
import type { Post, ReviewLog } from '../types/blog'

const message = useMessage()
const posts = ref<Post[]>([])
const reviewLogs = ref<ReviewLog[]>([])
const previewPost = ref<Post | null>(null)
const rejectingPost = ref<Post | null>(null)
const rejectReason = ref('')
const isLoading = ref(true)
const isSubmitting = ref(false)

const sanitizedPreviewContent = computed(() => sanitizeHtml(previewPost.value?.content ?? ''))
const showPreviewModal = computed({
  get: () => Boolean(previewPost.value),
  set: (value: boolean) => {
    if (!value) previewPost.value = null
  },
})
const showRejectModal = computed({
  get: () => Boolean(rejectingPost.value),
  set: (value: boolean) => {
    if (!value) rejectingPost.value = null
  },
})

onMounted(() => {
  void loadPage()
})

async function loadPage() {
  isLoading.value = true
  try {
    const [postResult, logItems] = await Promise.all([
      blogApi.getAdminPosts({ status: 'PENDING', page: 1, pageSize: 50 }),
      blogApi.getReviewLogs(),
    ])
    posts.value = postResult.items
    reviewLogs.value = logItems
  } finally {
    isLoading.value = false
  }
}

async function approvePost(post: Post) {
  isSubmitting.value = true
  try {
    await blogApi.updatePostStatus(post.id, 'PUBLISHED')
    message.success('文章已审核通过')
    previewPost.value = null
    await loadPage()
  } catch {
    message.error('审核失败，请稍后重试')
  } finally {
    isSubmitting.value = false
  }
}

function openReject(post: Post) {
  rejectingPost.value = post
  rejectReason.value = ''
}

async function rejectPost() {
  if (!rejectingPost.value || !rejectReason.value.trim()) {
    message.warning('请填写驳回原因')
    return
  }

  isSubmitting.value = true
  try {
    await blogApi.updatePostStatus(rejectingPost.value.id, 'REJECTED', rejectReason.value.trim())
    message.success('文章已驳回')
    rejectingPost.value = null
    previewPost.value = null
    await loadPage()
  } catch {
    message.error('审核失败，请稍后重试')
  } finally {
    isSubmitting.value = false
  }
}

function sanitizeHtml(content: string) {
  const allowedTags = new Set(['P', 'BR', 'STRONG', 'B', 'EM', 'I', 'U', 'UL', 'OL', 'LI', 'BLOCKQUOTE', 'PRE', 'CODE', 'H1', 'H2', 'H3', 'H4', 'A'])
  const template = document.createElement('template')
  template.innerHTML = content
  const walker = document.createTreeWalker(template.content, NodeFilter.SHOW_ELEMENT)
  const nodes: Element[] = []

  while (walker.nextNode()) {
    nodes.push(walker.currentNode as Element)
  }

  nodes.forEach((node) => {
    if (!allowedTags.has(node.tagName)) {
      node.replaceWith(document.createTextNode(node.textContent ?? ''))
      return
    }

    Array.from(node.attributes).forEach((attribute) => {
      const isSafeLink = node.tagName === 'A' && attribute.name === 'href' && /^https?:\/\//i.test(attribute.value)
      if (!isSafeLink) {
        node.removeAttribute(attribute.name)
      }
    })
  })

  return template.innerHTML
}
</script>

<template>
  <section class="review-page">
    <NCard title="审核队列">
      <template #header-extra>
        <NButton :loading="isLoading" @click="loadPage">刷新</NButton>
      </template>

      <NSpace v-if="isLoading" vertical>
        <NSkeleton text :repeat="5" />
      </NSpace>

      <NEmpty v-else-if="posts.length === 0" description="暂无待审核文章" />

      <TransitionGroup v-else name="queue-list" tag="div" class="queue-list">
        <NCard v-for="post in posts" :key="post.id" class="queue-card">
          <NSpace justify="space-between" align="start">
            <div>
              <NSpace align="center" :size="8">
                <NTag type="warning" size="small">待审核</NTag>
                <NText depth="3">作者：{{ post.creator.nickname || post.creator.username }}</NText>
                <NText depth="3">{{ new Date(post.publishedAt).toLocaleString('zh-CN') }}</NText>
              </NSpace>
              <h2>{{ post.title }}</h2>
              <p>{{ post.summary }}</p>
            </div>
            <NSpace>
              <NButton @click="previewPost = post">预览</NButton>
              <NButton type="error" secondary @click="openReject(post)">驳回</NButton>
              <NButton type="primary" :loading="isSubmitting" @click="approvePost(post)">通过</NButton>
            </NSpace>
          </NSpace>
        </NCard>
      </TransitionGroup>
    </NCard>

    <NCard title="最近审核记录" class="log-card">
      <NEmpty v-if="!isLoading && reviewLogs.length === 0" description="暂无审核记录" />
      <TransitionGroup v-else name="queue-list" tag="div" class="log-list">
        <div v-for="log in reviewLogs" :key="log.id" class="log-item">
          <NTag size="small" :type="log.toStatus === 'PUBLISHED' ? 'success' : 'error'">
            {{ log.toStatus === 'PUBLISHED' ? '通过' : '驳回' }}
          </NTag>
          <strong>{{ log.postTitle }}</strong>
          <NText depth="3">{{ log.reviewerName }} · {{ new Date(log.createdAt).toLocaleString('zh-CN') }}</NText>
          <NText v-if="log.message" depth="3">{{ log.message }}</NText>
        </div>
      </TransitionGroup>
    </NCard>

    <NModal v-model:show="showPreviewModal" preset="card" title="审核预览" class="review-modal">
      <Transition name="modal-content" appear>
        <article v-if="previewPost" class="preview-article">
        <NImage :src="previewPost.coverUrl" :alt="previewPost.title" preview-disabled object-fit="cover" class="preview-cover" />
        <NSpace align="center" :size="8" wrap>
          <NTag type="warning" size="small">待审核</NTag>
          <NTag type="primary" size="small">{{ previewPost.category.name }}</NTag>
          <NText depth="3">作者：{{ previewPost.creator.nickname || previewPost.creator.username }}</NText>
        </NSpace>
        <h1>{{ previewPost.title }}</h1>
        <p class="preview-summary">{{ previewPost.summary }}</p>
        <div class="preview-content" v-html="sanitizedPreviewContent" />
        <NSpace justify="end">
          <NButton @click="openReject(previewPost)">驳回</NButton>
          <NButton type="primary" :loading="isSubmitting" @click="approvePost(previewPost)">通过审核</NButton>
        </NSpace>
        </article>
      </Transition>
    </NModal>

    <NModal v-model:show="showRejectModal" preset="card" title="驳回文章" class="reject-modal">
      <Transition name="modal-content" appear>
        <NForm v-if="rejectingPost" label-placement="top" @submit.prevent="rejectPost">
        <NFormItem label="驳回原因" required>
          <NInput
            v-model:value="rejectReason"
            type="textarea"
            :autosize="{ minRows: 4, maxRows: 8 }"
            maxlength="500"
            show-count
            placeholder="请说明需要作者修改的内容"
          />
        </NFormItem>
        <NSpace justify="end">
          <NButton @click="rejectingPost = null">取消</NButton>
          <NButton type="error" attr-type="submit" :loading="isSubmitting">确认驳回</NButton>
        </NSpace>
        </NForm>
      </Transition>
    </NModal>
  </section>
</template>

<style scoped>
.review-page {
  display: grid;
  gap: 18px;
}

.queue-list,
.log-list {
  display: grid;
  gap: 16px;
}

.log-list {
  gap: 10px;
}

.queue-card {
  transition: border-color 0.22s ease, box-shadow 0.22s ease, transform 0.22s ease;
}

.queue-card:hover {
  transform: translateY(-3px);
}

.queue-list-enter-active,
.queue-list-leave-active {
  transition: opacity 0.28s ease, transform 0.28s ease;
}

.queue-list-enter-from,
.queue-list-leave-to {
  opacity: 0;
  transform: translateY(12px);
}

.queue-list-move {
  transition: transform 0.28s ease;
}

.modal-content-enter-active,
.modal-content-leave-active {
  transition: opacity 0.22s ease, transform 0.22s ease;
}

.modal-content-enter-from,
.modal-content-leave-to {
  opacity: 0;
  transform: scale(0.98);
}

.queue-card h2,
.preview-article h1 {
  margin: 10px 0 8px;
}

.queue-card p,
.preview-summary {
  color: var(--n-text-color-2);
  line-height: 1.75;
  margin: 0;
}

.log-card {
  margin-top: 4px;
}

.log-item {
  align-items: center;
  display: grid;
  gap: 8px;
  grid-template-columns: auto minmax(160px, 1fr) auto minmax(160px, 1fr);
}

.review-modal {
  max-width: 900px;
  width: 760px;
}

.reject-modal {
  max-width: 620px;
  width: 560px;
}

.preview-article {
  display: grid;
  gap: 16px;
}

.preview-cover {
  border-radius: 8px;
  height: 260px;
  width: 100%;
}

.preview-content {
  line-height: 1.85;
  max-height: 420px;
  overflow: auto;
}
</style>
