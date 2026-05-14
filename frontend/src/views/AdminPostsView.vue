<script setup lang="ts">
import { computed, h, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import {
  NButton,
  NCard,
  NDataTable,
  NEmpty,
  NEllipsis,
  NForm,
  NFormItem,
  NGrid,
  NGridItem,
  NImage,
  NInput,
  NModal,
  NPopconfirm,
  NSelect,
  NSpace,
  NTag,
  useMessage,
  type DataTableColumns,
} from 'naive-ui'
import { blogApi } from '../api/blog'
import { useAuthStore } from '../stores/auth'
import type { Category, CreatePostPayload, Post, PostStatus, Tag } from '../types/blog'

const message = useMessage()
const authStore = useAuthStore()
const posts = ref<Post[]>([])
const knownAuthors = ref(new Map<number, string>())
const categories = ref<Category[]>([])
const tags = ref<Tag[]>([])
const editingPostId = ref<number | null>(null)
const reviewingPostId = ref<number | null>(null)
const previewPost = ref<Post | null>(null)
const keyword = ref('')
const allOptionValue = 'ALL'
const statusFilter = ref<PostStatus | typeof allOptionValue>(allOptionValue)
const authorFilter = ref<number | typeof allOptionValue>(allOptionValue)
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)
const isLoading = ref(true)
const isSubmitting = ref(false)
const showEditor = ref(false)
const showRejectModal = ref(false)
const showPreviewModal = ref(false)
const rejectReason = ref('')

const form = ref<CreatePostPayload>({
  title: '',
  summary: '',
  content: '',
  coverUrl: '',
  categorySlug: '',
  tagSlugs: [],
  status: 'PUBLISHED',
})

const statusLabels: Record<PostStatus, string> = {
  DRAFT: '草稿',
  PENDING: '待审核',
  REJECTED: '已驳回',
  PUBLISHED: '已发布',
  ARCHIVED: '已归档',
}

const statusOptions = [
  { label: '草稿', value: 'DRAFT' },
  { label: '待审核', value: 'PENDING' },
  { label: '已驳回', value: 'REJECTED' },
  { label: '发布', value: 'PUBLISHED' },
  { label: '归档', value: 'ARCHIVED' },
]
const categoryOptions = computed(() => categories.value.map((item) => ({ label: item.name, value: item.slug })))
const tagOptions = computed(() => tags.value.map((item) => ({ label: item.name, value: item.slug })))
const filterStatusOptions = computed(() => [{ label: '全部状态', value: allOptionValue }, ...statusOptions])
const authorOptions = computed(() => {
  return [
    { label: '全部作者', value: allOptionValue },
    ...Array.from(knownAuthors.value.entries()).map(([value, label]) => ({ label, value })),
  ]
})
const sanitizedPreviewContent = computed(() => sanitizeHtml(previewPost.value?.content ?? ''))

const columns: DataTableColumns<Post> = [
  {
    title: '标题',
    key: 'title',
    minWidth: 240,
    render(row) {
      return h('strong', row.title)
    },
  },
  {
    title: '分类',
    key: 'category',
    width: 130,
    render(row) {
      return h(NTag, { size: 'small', round: true, type: 'primary' }, { default: () => row.category.name })
    },
  },
  {
    title: '作者',
    key: 'creator',
    width: 130,
    render(row) {
      return h(NEllipsis, { style: 'max-width: 100px' }, { default: () => row.creator.nickname || row.creator.username })
    },
  },
  {
    title: '状态',
    key: 'status',
    width: 110,
    render(row) {
      const type =
        row.status === 'PUBLISHED'
          ? 'success'
          : row.status === 'REJECTED'
            ? 'error'
          : row.status === 'PENDING' || row.status === 'DRAFT'
            ? 'warning'
            : 'default'
      return h(NTag, { size: 'small', round: true, type }, { default: () => statusLabels[row.status] })
    },
  },
  { title: '阅读量', key: 'viewCount', width: 100 },
  { title: '收藏数', key: 'favoriteCount', width: 100 },
  {
    title: '推荐',
    key: 'isRecommend',
    width: 90,
    render(row) {
      return row.isRecommend
        ? h(NTag, { size: 'small', round: true, type: 'success' }, { default: () => '推荐' })
        : h(NTag, { size: 'small', round: true }, { default: () => '普通' })
    },
  },
  {
    title: '操作',
    key: 'actions',
    width: 320,
    render(row) {
      return h(NSpace, { size: 8 }, () => [
        h(NButton, { size: 'small', tertiary: true, onClick: () => openPreview(row) }, { default: () => '预览' }),
        h(
          NButton,
          {
            size: 'small',
            type: row.isRecommend ? 'warning' : 'success',
            tertiary: true,
            disabled: row.status !== 'PUBLISHED',
            onClick: () => toggleRecommend(row),
          },
          { default: () => (row.isRecommend ? '取消推荐' : '推荐') },
        ),
        row.status === 'PENDING'
          ? h(
              NButton,
              { size: 'small', type: 'primary', tertiary: true, onClick: () => reviewPost(row.id, 'PUBLISHED') },
              { default: () => '通过' },
            )
          : null,
        row.status === 'PENDING'
          ? h(
              NButton,
              { size: 'small', type: 'error', tertiary: true, onClick: () => openRejectModal(row.id) },
              { default: () => '驳回' },
            )
          : null,
        h(NButton, { size: 'small', tertiary: true, onClick: () => openEditor(row) }, { default: () => '编辑' }),
        h(
          NPopconfirm,
          {
            positiveText: '删除',
            negativeText: '取消',
            onPositiveClick: () => deletePost(row.id),
          },
          {
            trigger: () => h(NButton, { size: 'small', type: 'error', tertiary: true }, { default: () => '删除' }),
            default: () => '确认删除这篇文章吗？',
          },
        ),
      ])
    },
  },
]

async function loadPage() {
  isLoading.value = true
  await authStore.loadMe()
  if (!authStore.isAdmin) {
    isLoading.value = false
    return
  }

  try {
    const [postItems, categoryItems, tagItems] = await Promise.all([
      blogApi.getAdminPosts(buildQuery()),
      blogApi.getCategories(),
      blogApi.getTags(),
    ])
    setPostResult(postItems)
    categories.value = categoryItems
    tags.value = tagItems
    resetForm()
  } finally {
    isLoading.value = false
  }
}

function buildQuery() {
  return {
    keyword: keyword.value.trim() || undefined,
    status: statusFilter.value === allOptionValue ? undefined : statusFilter.value,
    authorId: authorFilter.value === allOptionValue ? undefined : authorFilter.value,
    page: page.value,
    pageSize: pageSize.value,
  }
}

function setPostResult(result: Awaited<ReturnType<typeof blogApi.getAdminPosts>>) {
  posts.value = result.items
  total.value = result.total
  page.value = result.page
  pageSize.value = result.pageSize
  result.items.forEach((post) => {
    knownAuthors.value.set(post.creator.id, post.creator.nickname || post.creator.username)
  })
}

async function loadPosts() {
  isLoading.value = true
  try {
    setPostResult(await blogApi.getAdminPosts(buildQuery()))
  } finally {
    isLoading.value = false
  }
}

function searchPosts() {
  page.value = 1
  void loadPosts()
}

function resetFilters() {
  keyword.value = ''
  statusFilter.value = allOptionValue
  authorFilter.value = allOptionValue
  page.value = 1
  void loadPosts()
}

function showPendingQueue() {
  statusFilter.value = 'PENDING'
  page.value = 1
  void loadPosts()
}

function resetForm() {
  editingPostId.value = null
  form.value = {
    title: '',
    summary: '',
    content: '',
    coverUrl: '',
    categorySlug: categories.value[0]?.slug ?? '',
    tagSlugs: tags.value[0] ? [tags.value[0].slug] : [],
    status: 'PUBLISHED',
  }
}

function openEditor(post?: Post) {
  if (post) {
    editingPostId.value = post.id
    form.value = {
      title: post.title,
      summary: post.summary,
      content: post.content,
      coverUrl: post.coverUrl,
      categorySlug: post.category.slug,
      tagSlugs: post.tags.map((tag) => tag.slug),
      status: post.status,
    }
  } else {
    resetForm()
  }
  showEditor.value = true
}

function buildPayload(): CreatePostPayload {
  return {
    title: form.value.title,
    summary: form.value.summary,
    content: form.value.content,
    categorySlug: form.value.categorySlug,
    tagSlugs: form.value.tagSlugs,
    status: form.value.status,
    ...(form.value.coverUrl?.trim() ? { coverUrl: form.value.coverUrl.trim() } : {}),
  }
}

async function submitPost() {
  if (!form.value.title.trim() || !form.value.summary.trim() || !form.value.content.trim() || !form.value.categorySlug) {
    message.warning('请填写标题、摘要、正文和分类')
    return
  }

  isSubmitting.value = true
  try {
    const payload = buildPayload()
    const post = editingPostId.value
      ? await blogApi.updatePost(editingPostId.value, payload)
      : await blogApi.createPost(payload)
    knownAuthors.value.set(post.creator.id, post.creator.nickname || post.creator.username)
    const wasEditing = Boolean(editingPostId.value)
    resetForm()
    showEditor.value = false
    await loadPosts()
    message.success(wasEditing ? '文章已更新' : '文章已保存')
  } catch {
    message.error('保存失败，请稍后重试')
  } finally {
    isSubmitting.value = false
  }
}

function openPreview(post: Post) {
  previewPost.value = post
  showPreviewModal.value = true
}

function openRejectModal(id: number) {
  reviewingPostId.value = id
  rejectReason.value = ''
  showRejectModal.value = true
}

async function reviewPost(id: number, status: PostStatus, reviewMessage?: string) {
  try {
    const post = await blogApi.updatePostStatus(id, status, reviewMessage)
    posts.value = posts.value.map((item) => (item.id === post.id ? post : item))
    await loadPosts()
    message.success(status === 'PUBLISHED' ? '文章已审核通过' : '文章已驳回')
  } catch {
    message.error('审核失败，请稍后重试')
  }
}

async function toggleRecommend(post: Post) {
  try {
    const updatedPost = await blogApi.updatePostRecommend(post.id, !post.isRecommend)
    posts.value = posts.value.map((item) => (item.id === updatedPost.id ? updatedPost : item))
    message.success(updatedPost.isRecommend ? '文章已设为推荐' : '文章已取消推荐')
  } catch {
    message.error('推荐状态更新失败，请稍后重试')
  }
}

async function rejectPost() {
  if (!reviewingPostId.value || !rejectReason.value.trim()) {
    message.warning('请填写驳回原因')
    return
  }

  await reviewPost(reviewingPostId.value, 'REJECTED', rejectReason.value.trim())
  reviewingPostId.value = null
  showRejectModal.value = false
}

async function deletePost(id: number) {
  try {
    await blogApi.deletePost(id)
    await loadPosts()
    message.success('文章已删除')
  } catch {
    message.error('删除失败，请稍后重试')
  }
}

function sanitizeHtml(content: string) {
  if (typeof window === 'undefined') return ''

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

    if (node.tagName === 'A') {
      node.setAttribute('target', '_blank')
      node.setAttribute('rel', 'noopener noreferrer')
    }
  })

  return template.innerHTML
}

onMounted(() => {
  void loadPage()
})
</script>

<template>
  <section>
    <NCard v-if="!authStore.isLoggedIn && !isLoading" title="请先登录">
      <NEmpty description="登录后才能管理文章">
        <template #extra>
          <RouterLink to="/login">
            <NButton type="primary">前往登录</NButton>
          </RouterLink>
        </template>
      </NEmpty>
    </NCard>

    <NCard v-else-if="!authStore.isAdmin && !isLoading" title="仅管理员可访问">
      <NEmpty description="普通注册用户可以收藏文章，发布与删除文章仅管理员可操作。" />
    </NCard>

    <NCard v-else title="文章管理" class="post-container">
      <template #header-extra>
        <NSpace>
          <NButton secondary @click="showPendingQueue">待审核队列</NButton>
          <NButton type="primary" @click="openEditor()">新建文章</NButton>
        </NSpace>
      </template>
      <NCard class="filter-card" embedded>
        <NGrid :cols="8" :x-gap="12" :y-gap="12" responsive="screen">
          <NGridItem :span="2" :md="1">
            <NInput v-model:value="keyword" clearable placeholder="搜索标题或摘要" @keyup.enter="searchPosts" />
          </NGridItem>
          <NGridItem :span="2" :md="1">
            <NSelect v-model:value="statusFilter" :options="filterStatusOptions" clearable placeholder="状态筛选" />
          </NGridItem>
          <NGridItem :span="2" :md="1">
            <NSelect v-model:value="authorFilter" :options="authorOptions" clearable placeholder="作者筛选" />
          </NGridItem>
          <NGridItem :span="2" :md="1">
            <NSpace justify="end">
              <NButton type="primary" @click="searchPosts">查询</NButton>
              <NButton @click="resetFilters">重置</NButton>
            </NSpace>
          </NGridItem>
        </NGrid>
      </NCard>
      <NDataTable
        class="post-table"
        :columns="columns"
        :data="posts"
        :loading="isLoading"
        :bordered="false"
        remote
        :pagination="{
          page,
          pageSize,
          itemCount: total,
          showSizePicker: true,
          pageSizes: [10, 12, 20, 50],
          onUpdatePage: (nextPage: number) => {
            page = nextPage
            loadPosts()
          },
          onUpdatePageSize: (nextPageSize: number) => {
            pageSize = nextPageSize
            page = 1
            loadPosts()
          },
        }"
      />
    </NCard>

    <NModal v-model:show="showEditor" preset="card" :title="editingPostId ? '编辑文章' : '新建文章'" class="post-modal">
      <NForm label-placement="top" @submit.prevent="submitPost">
        <NGrid :cols="2" :x-gap="16" responsive="screen">
          <NGridItem :span="2">
            <NFormItem label="文章标题" required>
              <NInput v-model:value="form.title" clearable placeholder="请输入文章标题" />
            </NFormItem>
          </NGridItem>
          <NGridItem :span="2">
            <NFormItem label="文章摘要" required>
              <NInput v-model:value="form.summary" clearable placeholder="请输入文章摘要" />
            </NFormItem>
          </NGridItem>
          <NGridItem :span="2">
            <NFormItem label="封面图片地址">
              <NInput v-model:value="form.coverUrl" clearable placeholder="可选，留空使用默认封面" />
            </NFormItem>
          </NGridItem>
          <NGridItem :span="1">
            <NFormItem label="分类" required>
              <NSelect v-model:value="form.categorySlug" :options="categoryOptions" placeholder="请选择分类" />
            </NFormItem>
          </NGridItem>
          <NGridItem :span="1">
            <NFormItem label="状态" required>
              <NSelect v-model:value="form.status" :options="statusOptions" />
            </NFormItem>
          </NGridItem>
          <NGridItem :span="2">
            <NFormItem label="标签">
              <NSelect v-model:value="form.tagSlugs" :options="tagOptions" multiple placeholder="请选择标签" />
            </NFormItem>
          </NGridItem>
          <NGridItem :span="2">
            <NFormItem label="正文" required>
              <NInput
                v-model:value="form.content"
                type="textarea"
                :autosize="{ minRows: 8, maxRows: 14 }"
                placeholder="撰写正文。空行会自动分隔为段落。"
              />
            </NFormItem>
          </NGridItem>
        </NGrid>
        <NSpace justify="end">
          <NButton :disabled="isSubmitting" @click="showEditor = false">取消</NButton>
          <NButton type="primary" attr-type="submit" :loading="isSubmitting">保存</NButton>
        </NSpace>
      </NForm>
    </NModal>

    <NModal v-model:show="showRejectModal" preset="card" title="驳回文章" class="reject-modal">
      <NForm label-placement="top" @submit.prevent="rejectPost">
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
          <NButton @click="showRejectModal = false">取消</NButton>
          <NButton type="error" attr-type="submit">确认驳回</NButton>
        </NSpace>
      </NForm>
    </NModal>

    <NModal v-model:show="showPreviewModal" preset="card" title="文章预览" class="preview-modal">
      <article v-if="previewPost" class="preview-article">
        <NImage :src="previewPost.coverUrl" :alt="previewPost.title" preview-disabled object-fit="cover" class="preview-cover" />
        <NSpace align="center" :size="8" wrap class="preview-meta">
          <NTag size="small" :type="previewPost.status === 'PUBLISHED' ? 'success' : previewPost.status === 'REJECTED' ? 'error' : 'warning'">
            {{ statusLabels[previewPost.status] }}
          </NTag>
          <NTag size="small" type="primary">{{ previewPost.category.name }}</NTag>
          <span>作者：{{ previewPost.creator.nickname || previewPost.creator.username }}</span>
          <span>{{ new Date(previewPost.publishedAt).toLocaleDateString('zh-CN') }}</span>
        </NSpace>
        <h1>{{ previewPost.title }}</h1>
        <p class="preview-summary">{{ previewPost.summary }}</p>
        <NSpace :size="8" wrap>
          <NTag v-for="tag in previewPost.tags" :key="tag.id" size="small">{{ tag.name }}</NTag>
        </NSpace>
        <div class="preview-content" v-html="sanitizedPreviewContent" />
        <NSpace v-if="previewPost.status === 'PENDING'" justify="end">
          <NButton @click="openRejectModal(previewPost.id); showPreviewModal = false">驳回</NButton>
          <NButton type="primary" @click="reviewPost(previewPost.id, 'PUBLISHED'); showPreviewModal = false">
            通过审核
          </NButton>
        </NSpace>
      </article>
    </NModal>
  </section>
</template>

<style scoped>
.n-data-table-base-table{
  height: 700px;
  overflow: auto;
}
.post-container{
  height: 970px;
  overflow: hidden;
}
.filter-card {
  margin-bottom: 16px;
}

.post-modal {
  max-width: 820px;
  width: 700px;
}

.reject-modal {
  max-width: 620px;
  width: 560px;
}

.preview-modal {
  max-width: 900px;
  width: 760px;
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

.preview-meta {
  color: var(--n-text-color-3);
}

.preview-article h1 {
  font-size: 30px;
  line-height: 1.25;
  margin: 0;
}

.preview-summary {
  color: var(--n-text-color-2);
  font-size: 16px;
  line-height: 1.75;
  margin: 0;
}

.preview-content {
  line-height: 1.85;
  max-height: 420px;
  overflow: auto;
}

.preview-content :deep(p) {
  margin: 0 0 14px;
}
</style>
