<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import {
  NButton,
  NCard,
  NForm,
  NFormItem,
  NGrid,
  NGridItem,
  NInput,
  NSelect,
  NSkeleton,
  NSpace,
  useMessage,
} from 'naive-ui'
import { blogApi } from '../api/blog'
import type { Category, CreatePostPayload, Tag } from '../types/blog'

const router = useRouter()
const route = useRoute()
const message = useMessage()
const categories = ref<Category[]>([])
const tags = ref<Tag[]>([])
const editingPostId = computed(() => Number(route.params.id) || null)
const isLoading = ref(true)
const isSubmitting = ref(false)

const form = ref<CreatePostPayload>({
  title: '',
  summary: '',
  content: '',
  coverUrl: '',
  categorySlug: '',
  tagSlugs: [],
  status: 'DRAFT',
})

const categoryOptions = computed(() => categories.value.map((item) => ({ label: item.name, value: item.slug })))
const tagOptions = computed(() => tags.value.map((item) => ({ label: item.name, value: item.slug })))

onMounted(async () => {
  try {
    const [categoryItems, tagItems, myPosts] = await Promise.all([
      blogApi.getCategories(),
      blogApi.getTags(),
      editingPostId.value ? blogApi.getMyPosts() : Promise.resolve([]),
    ])
    categories.value = categoryItems
    tags.value = tagItems

    const editingPost = editingPostId.value ? myPosts.find((post) => post.id === editingPostId.value) : null
    if (editingPost) {
      form.value = {
        title: editingPost.title,
        summary: editingPost.summary,
        content: editingPost.content,
        coverUrl: editingPost.coverUrl,
        categorySlug: editingPost.category.slug,
        tagSlugs: editingPost.tags.map((tag) => tag.slug),
        status: editingPost.status,
      }
    } else {
      form.value.categorySlug = categoryItems[0]?.slug ?? ''
      form.value.tagSlugs = tagItems[0] ? [tagItems[0].slug] : []
    }
  } finally {
    isLoading.value = false
  }
})

function validateForm() {
  if (!form.value.title.trim() || !form.value.summary.trim() || !form.value.content.trim() || !form.value.categorySlug) {
    message.warning('请填写标题、摘要、正文和分类')
    return false
  }

  return true
}

function buildPayload(status: CreatePostPayload['status']): CreatePostPayload {
  return {
    title: form.value.title,
    summary: form.value.summary,
    content: form.value.content,
    categorySlug: form.value.categorySlug,
    tagSlugs: form.value.tagSlugs,
    status,
    ...(form.value.coverUrl?.trim() ? { coverUrl: form.value.coverUrl.trim() } : {}),
  }
}

async function submitPost(status: CreatePostPayload['status']) {
  if (!validateForm()) return

  isSubmitting.value = true
  try {
    if (editingPostId.value) {
      await blogApi.updateMyPost(editingPostId.value, buildPayload(status))
    } else {
      await blogApi.createMyPost(buildPayload(status))
    }
    message.success(status === 'DRAFT' ? '草稿已保存' : '文章已提交审核')
    await router.push('/posts/mine')
  } catch (error) {
    message.error(error instanceof Error ? error.message : '保存失败，请稍后重试')
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <main class="write-page">
    <NCard :title="editingPostId ? '编辑投稿' : '写文章'">
      <template #header-extra>
        <RouterLink to="/posts/mine">
          <NButton quaternary>我的投稿</NButton>
        </RouterLink>
      </template>

      <NSpace v-if="isLoading" vertical>
        <NSkeleton text :repeat="6" />
      </NSpace>

      <NForm v-else label-placement="top" @submit.prevent="submitPost('PENDING')">
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
            <NFormItem label="标签">
              <NSelect v-model:value="form.tagSlugs" :options="tagOptions" multiple placeholder="请选择标签" />
            </NFormItem>
          </NGridItem>
          <NGridItem :span="2">
            <NFormItem label="正文" required>
              <NInput
                v-model:value="form.content"
                type="textarea"
                :autosize="{ minRows: 10, maxRows: 18 }"
                placeholder="撰写正文。空行会自动分隔为段落。"
              />
            </NFormItem>
          </NGridItem>
        </NGrid>

        <NSpace justify="end">
          <NButton :disabled="isSubmitting" @click="submitPost('DRAFT')">保存草稿</NButton>
          <NButton type="primary" attr-type="submit" :loading="isSubmitting">提交审核</NButton>
        </NSpace>
      </NForm>
    </NCard>
  </main>
</template>

<style scoped>
.write-page {
  max-width: 980px;
  margin: 0 auto;
  padding: 32px 24px 56px;
}
</style>
