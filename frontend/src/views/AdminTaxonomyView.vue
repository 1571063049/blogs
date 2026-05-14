<script setup lang="ts">
import { computed, h, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import {
  NButton,
  NCard,
  NDataTable,
  NEmpty,
  NForm,
  NFormItem,
  NGrid,
  NGridItem,
  NInput,
  NModal,
  NPopconfirm,
  NSpace,
  NTabs,
  NTabPane,
  NTag,
  useMessage,
  type DataTableColumns,
} from 'naive-ui'
import { blogApi } from '../api/blog'
import { useAuthStore } from '../stores/auth'
import type { Category, Tag, UpsertTaxonomyPayload } from '../types/blog'

type TaxonomyType = 'category' | 'tag'
type TaxonomyItem = Category | Tag

const message = useMessage()
const authStore = useAuthStore()
const activeTab = ref<TaxonomyType>('category')
const categories = ref<Category[]>([])
const tags = ref<Tag[]>([])
const isLoading = ref(true)
const isSubmitting = ref(false)
const showEditor = ref(false)
const editingType = ref<TaxonomyType>('category')
const editingId = ref<number | null>(null)
const form = ref<UpsertTaxonomyPayload>({
  name: '',
  slug: '',
  description: '',
})

const editorTitle = computed(() => {
  const typeLabel = editingType.value === 'category' ? '分类' : '标签'
  return editingId.value ? `编辑${typeLabel}` : `新建${typeLabel}`
})

const categoryColumns: DataTableColumns<Category> = [
  {
    title: '名称',
    key: 'name',
    minWidth: 160,
    render(row) {
      return h('strong', row.name)
    },
  },
  {
    title: '别名',
    key: 'slug',
    minWidth: 140,
    render(row) {
      return h(NTag, { size: 'small', round: true }, { default: () => row.slug })
    },
  },
  { title: '描述', key: 'description', minWidth: 220 },
  {
    title: '文章数',
    key: 'posts',
    width: 100,
    render(row) {
      return row._count?.posts ?? 0
    },
  },
  {
    title: '操作',
    key: 'actions',
    width: 180,
    render(row) {
      return renderActions(row, 'category')
    },
  },
]

const tagColumns: DataTableColumns<Tag> = [
  {
    title: '名称',
    key: 'name',
    minWidth: 160,
    render(row) {
      return h('strong', row.name)
    },
  },
  {
    title: '别名',
    key: 'slug',
    minWidth: 140,
    render(row) {
      return h(NTag, { size: 'small', round: true, type: 'info' }, { default: () => row.slug })
    },
  },
  {
    title: '文章数',
    key: 'posts',
    width: 100,
    render(row) {
      return row._count?.posts ?? 0
    },
  },
  {
    title: '操作',
    key: 'actions',
    width: 180,
    render(row) {
      return renderActions(row, 'tag')
    },
  },
]

function renderActions(row: TaxonomyItem, type: TaxonomyType) {
  return h(NSpace, { size: 8 }, () => [
    h(NButton, { size: 'small', tertiary: true, onClick: () => openEditor(type, row) }, { default: () => '编辑' }),
    h(
      NPopconfirm,
      {
        positiveText: '删除',
        negativeText: '取消',
        onPositiveClick: () => deleteTaxonomy(type, row.id),
      },
      {
        trigger: () => h(NButton, { size: 'small', type: 'error', tertiary: true }, { default: () => '删除' }),
        default: () =>
          type === 'category' ? '确认删除该分类？分类下有文章时不能删除。' : '确认删除该标签？文章关联会同步移除。',
      },
    ),
  ])
}

async function loadPage() {
  isLoading.value = true
  await authStore.loadMe()

  if (!authStore.isAdmin) {
    isLoading.value = false
    return
  }

  try {
    const [categoryItems, tagItems] = await Promise.all([blogApi.getAdminCategories(), blogApi.getAdminTags()])
    categories.value = categoryItems
    tags.value = tagItems
  } catch {
    message.error('加载分类标签失败，请稍后重试')
  } finally {
    isLoading.value = false
  }
}

function resetForm(type: TaxonomyType) {
  editingType.value = type
  editingId.value = null
  form.value = {
    name: '',
    slug: '',
    description: '',
  }
}

function openEditor(type: TaxonomyType, item?: TaxonomyItem) {
  resetForm(type)

  if (item) {
    editingId.value = item.id
    form.value = {
      name: item.name,
      slug: item.slug,
      description: 'description' in item ? item.description : '',
    }
  }

  showEditor.value = true
}

function syncSlug() {
  if (editingId.value || form.value.slug) return
  form.value.slug = form.value.name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/(^-|-$)/g, '')
}

async function submitTaxonomy() {
  if (!form.value.name.trim() || !form.value.slug.trim()) {
    message.warning('请填写名称和别名')
    return
  }

  isSubmitting.value = true
  try {
    if (editingType.value === 'category') {
      const saved = editingId.value
        ? await blogApi.updateCategory(editingId.value, form.value)
        : await blogApi.createCategory(form.value)
      categories.value = upsertItem(categories.value, saved)
    } else {
      const saved = editingId.value
        ? await blogApi.updateTag(editingId.value, form.value)
        : await blogApi.createTag(form.value)
      tags.value = upsertItem(tags.value, saved)
    }

    showEditor.value = false
    message.success(editingId.value ? '已更新' : '已创建')
    resetForm(editingType.value)
  } catch (error) {
    message.error(readErrorMessage(error, '保存失败，请稍后重试'))
  } finally {
    isSubmitting.value = false
  }
}

async function deleteTaxonomy(type: TaxonomyType, id: number) {
  try {
    if (type === 'category') {
      await blogApi.deleteCategory(id)
      categories.value = categories.value.filter((item) => item.id !== id)
    } else {
      await blogApi.deleteTag(id)
      tags.value = tags.value.filter((item) => item.id !== id)
    }

    message.success('已删除')
  } catch (error) {
    message.error(readErrorMessage(error, '删除失败，请稍后重试'))
  }
}

function upsertItem<T extends TaxonomyItem>(items: T[], item: T) {
  return [item, ...items.filter((current) => current.id !== item.id)]
}

function readErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) {
    return error.message || fallback
  }

  return fallback
}

onMounted(() => {
  void loadPage()
})
</script>

<template>
  <section>
    <NCard v-if="!authStore.isLoggedIn && !isLoading" title="请先登录">
      <NEmpty description="登录后才能管理分类和标签">
        <template #extra>
          <RouterLink to="/login">
            <NButton type="primary">前往登录</NButton>
          </RouterLink>
        </template>
      </NEmpty>
    </NCard>

    <NCard v-else-if="!authStore.isAdmin && !isLoading" title="仅管理员可访问">
      <NEmpty description="分类标签管理仅管理员可操作。" />
    </NCard>

    <NCard v-else title="分类标签">
      <template #header-extra>
        <NSpace>
          <NButton secondary @click="openEditor('tag')">新建标签</NButton>
          <NButton type="primary" @click="openEditor('category')">新建分类</NButton>
        </NSpace>
      </template>

      <NTabs v-model:value="activeTab" type="line" animated>
        <NTabPane name="category" tab="分类管理">
          <NDataTable
            :columns="categoryColumns"
            :data="categories"
            :loading="isLoading"
            :bordered="false"
            :pagination="{ pageSize: 8 }"
          />
        </NTabPane>
        <NTabPane name="tag" tab="标签管理">
          <NDataTable
            :columns="tagColumns"
            :data="tags"
            :loading="isLoading"
            :bordered="false"
            :pagination="{ pageSize: 8 }"
          />
        </NTabPane>
      </NTabs>
    </NCard>

    <NModal v-model:show="showEditor" preset="card" :title="editorTitle" class="taxonomy-modal">
      <NForm label-placement="top" @submit.prevent="submitTaxonomy">
        <NGrid :cols="2" :x-gap="16" responsive="screen">
          <NGridItem>
            <NFormItem label="名称" required>
              <NInput v-model:value="form.name" clearable placeholder="请输入显示名称" @blur="syncSlug" />
            </NFormItem>
          </NGridItem>
          <NGridItem>
            <NFormItem label="别名" required>
              <NInput v-model:value="form.slug" clearable placeholder="英文、数字或短横线，例如 engineering" />
            </NFormItem>
          </NGridItem>
          <NGridItem v-if="editingType === 'category'" :span="2">
            <NFormItem label="描述">
              <NInput
                v-model:value="form.description"
                type="textarea"
                :autosize="{ minRows: 3, maxRows: 5 }"
                placeholder="用于说明该分类的内容范围"
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
  </section>
</template>

<style scoped>
.taxonomy-modal {
  max-width: 700px;
  width: 700px;
}
</style>
