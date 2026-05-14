<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import {
  NAvatar,
  NButton,
  NCard,
  NEmpty,
  NFlex,
  NGrid,
  NGridItem,
  NImage,
  NInput,
  NSkeleton,
  NSpace,
  NStatistic,
  NTag,
  NText,
} from 'naive-ui'
import { SearchOutline } from '@vicons/ionicons5'
import { blogApi } from '../api/blog'
import PostCard from '../components/PostCard.vue'
import ScrollView from '../baseui/ScrollView.vue'
import { useAuthStore } from '../stores/auth'
import type { Category, Post, Tag } from '../types/blog'
import { resolveAssetUrl } from '../utils/url'

const route = useRoute()
const authStore = useAuthStore()
const posts = ref<Post[]>([])
const categories = ref<Category[]>([])
const tags = ref<Tag[]>([])
const keyword = ref('')
const sortMode = ref<'latest' | 'hot' | 'recommend'>('latest')
const isLoading = ref(true)

const featuredPost = computed(() => posts.value.find((post) => post.isTop) ?? posts.value[0])
const totalViews = computed(() => posts.value.reduce((sum, post) => sum + post.viewCount, 0))
const recommendPosts = computed(() =>
  // posts.value.filter((post) => post.isRecommend && post.slug !== featuredPost.value?.slug).slice(0, 3),
  posts.value.filter((post) => post.isRecommend && post.slug !== featuredPost.value?.slug)
)
const hotPosts = computed(() =>
  [...posts.value]
    .sort((currentPost, nextPost) => nextPost.viewCount + nextPost.favoriteCount - (currentPost.viewCount + currentPost.favoriteCount))
    .slice(0, 5),
)
const regularPosts = computed(() => {
  const postItems = posts.value.filter((post) => post.slug !== featuredPost.value?.slug)

  if (sortMode.value === 'hot') {
    return [...postItems].sort(
      (currentPost, nextPost) =>
        nextPost.viewCount + nextPost.favoriteCount - (currentPost.viewCount + currentPost.favoriteCount),
    )
  }

  if (sortMode.value === 'recommend') {
    return postItems.filter((post) => post.isRecommend)
  }

  return postItems
})

const sortOptions = [
  { label: '最新', value: 'latest' },
  { label: '热门', value: 'hot' },
  { label: '推荐', value: 'recommend' },
] as const

async function loadPosts() {
  isLoading.value = true
  try {
    posts.value = await blogApi.getPosts({
      keyword: keyword.value || undefined,
      categorySlug: route.name === 'category' ? String(route.params.slug) : undefined,
      tagSlug: route.name === 'tag' ? String(route.params.slug) : undefined,
    })
  } finally {
    isLoading.value = false
  }
}

onMounted(async () => {
  void authStore.loadMe()
  await Promise.all([
    loadPosts(),
    blogApi.getCategories().then((items) => (categories.value = items)),
    blogApi.getTags().then((items) => (tags.value = items)),
  ])
})

watch(() => route.fullPath, () => void loadPosts())
</script>

<template>
  <main class="page-container">
    <NCard v-if="featuredPost" class="hero-card" content-style="padding: 0" :bordered="false">
      <div class="hero-grid">
        <section class="hero-copy">
          <NSpace align="center" :size="8" wrap>
            <NTag type="primary" round>精选文章</NTag>
          </NSpace>
          <RouterLink :to="`/posts/${featuredPost.slug}`" class="hero-title">
            {{ featuredPost.title }}
          </RouterLink>
          <NText depth="2" class="hero-summary">{{ featuredPost.summary }}</NText>
          <NSpace align="center" :size="10">
            <NAvatar round :size="36" :src="resolveAssetUrl(featuredPost.creator.avatarUrl)" />
            <NText depth="2">由 {{ featuredPost.creator.nickname }} 创作</NText>
            <NText depth="3">{{ featuredPost.viewCount }} 次阅读</NText>
          </NSpace>
          <NSpace>
            <NTag v-for="tag in featuredPost.tags" :key="tag.id" round>{{ tag.name }}</NTag>
          </NSpace>
        </section>
        <NImage
          :src="featuredPost.coverUrl"
          :alt="featuredPost.title"
          preview-disabled
          object-fit="cover"
          class="hero-image"
        />
      </div>
    </NCard>

    <NGrid :cols="4" :x-gap="16" :y-gap="16" responsive="screen" class="overview-grid">
      <NGridItem>
        <NCard>
          <NStatistic label="文章" :value="posts.length" />
        </NCard>
      </NGridItem>
      <NGridItem>
        <NCard>
          <NStatistic label="分类" :value="categories.length" />
        </NCard>
      </NGridItem>
      <NGridItem>
        <NCard>
          <NStatistic label="标签" :value="tags.length" />
        </NCard>
      </NGridItem>
      <NGridItem>
        <NCard>
          <NStatistic label="阅读" :value="totalViews" />
        </NCard>
      </NGridItem>
    </NGrid>

    <NCard v-if="authStore.isLoggedIn" class="creator-panel">
      <NSpace align="center" justify="space-between">
        <div>
          <NText strong>欢迎回来，{{ authStore.user?.nickname }}</NText>
          <NText depth="3" class="creator-hint">可以继续创作，也可以回到草稿整理未完成的文章。</NText>
        </div>
        <NSpace>
          <RouterLink to="/write">
            <NButton type="primary">写文章</NButton>
          </RouterLink>
          <RouterLink to="/drafts">
            <NButton>我的投稿</NButton>
          </RouterLink>
        </NSpace>
      </NSpace>
    </NCard>

    <NGrid :cols="12" :x-gap="24" :y-gap="24" responsive="screen" class="content-grid">
      <NGridItem :span="12" :lg="8">
        <NSpace vertical :size="18">
          <NCard>
            <NSpace align="center" justify="space-between" class="toolbar">
              <NSpace align="center" :wrap="false">
              <NInput
                style="width: 250px;"
                v-model:value="keyword"
                clearable
                placeholder="搜索文章标题、摘要或正文"
                @keyup.enter="loadPosts"
              />
              <NButton type="primary" :loading="isLoading" @click="loadPosts">
                <template #icon>
                  <SearchOutline />
                </template>
                搜索
              </NButton>
              </NSpace>
              <NSpace :size="8">
                <NButton
                  v-for="option in sortOptions"
                  :key="option.value"
                  size="small"
                  :type="sortMode === option.value ? 'primary' : 'default'"
                  secondary
                  @click="sortMode = option.value"
                >
                  {{ option.label }}
                </NButton>
              </NSpace>
            </NSpace>
          </NCard>

          <!-- grid布局 -->
          <!-- <NGrid
            v-if="recommendPosts.length > 0"
            :cols="3"
            :x-gap="16"
            :y-gap="16"
            responsive="screen"
            class="recommend-grid"
          >
            <NGridItem v-for="post in recommendPosts" :key="post.id">
              <RouterLink :to="`/posts/${post.slug}`" class="recommend-card">
                <NImage :src="post.coverUrl" :alt="post.title" preview-disabled object-fit="cover" class="recommend-cover" />
                <div class="recommend-body">
                  <NSpace align="center" :size="8" wrap>
                    <NTag size="small" type="success" round >推荐</NTag>
                  </NSpace>
                  <strong>{{ post.title }}</strong>
                  <NText depth="3">{{ post.creator.nickname }} · {{ post.viewCount }} 次阅读</NText>
                </div>
              </RouterLink>
            </NGridItem>
          </NGrid> -->
          
          <!-- flex布局 -->
          <!-- <div class="recommend-container">
            <NFlex
              v-if="recommendPosts.length > 0"
              responsive="screen"
              class="recommend-flex"
            >
              <div v-for="post in recommendPosts" :key="post.id" class="recommend-flex-item">
                <RouterLink :to="`/posts/${post.slug}`" class="recommend-card">
                  <NImage :src="post.coverUrl" :alt="post.title" preview-disabled object-fit="cover" class="recommend-cover" />
                  <div class="recommend-body">
                    <NSpace align="center" :size="8" wrap>
                      <NTag size="small" type="success" round >推荐</NTag>
                    </NSpace>
                    <strong>{{ post.title }}</strong>
                    <NText depth="3">{{ post.creator.nickname }} · {{ post.viewCount }} 次阅读</NText>
                  </div>
                </RouterLink>
              </div>
            </NFlex>
          </div> -->

          <!-- flex布局 + 滚动组件 -->
          <ScrollView>
            <template v-if="recommendPosts.length > 0">
              <div v-for="post in recommendPosts" :key="post.id" class="recommend-flex-item">
                <RouterLink :to="`/posts/${post.slug}`" class="recommend-card">
                  <NImage :src="post.coverUrl" :alt="post.title" preview-disabled object-fit="cover" class="recommend-cover" />
                  <div class="recommend-body">
                    <NSpace align="center" :size="8" wrap>
                      <NTag size="small" type="success" round >推荐</NTag>
                    </NSpace>
                    <strong>{{ post.title }}</strong>
                    <NText depth="3">{{ post.creator.nickname }} · {{ post.viewCount }} 次阅读</NText>
                  </div>
                </RouterLink>
              </div>
            </template>
          </ScrollView>

          <template v-if="isLoading">
            <NCard v-for="index in 3" :key="index">
              <NSkeleton text :repeat="3" />
            </NCard>
          </template>

          <NEmpty v-else-if="regularPosts.length === 0" description="暂无匹配文章" class="empty-state" />
          <TransitionGroup v-else name="post-list" tag="div" class="post-list">
            <PostCard v-for="post in regularPosts" :key="post.id" :post="post" />
          </TransitionGroup>
        </NSpace>
      </NGridItem>

      <NGridItem :span="12" :lg="4">
        <NSpace vertical :size="18">
          <NCard title="热门文章">
            <NSpace vertical :size="12">
              <RouterLink
                v-for="(post, index) in hotPosts"
                :key="post.id"
                :to="`/posts/${post.slug}`"
                class="hot-link"
                :style="{ animationDelay: `${index * 0.04}s` }"
              >
                <span class="hot-rank">{{ index + 1 }}</span>
                <span class="hot-title">{{ post.title }}</span>
                <NText depth="3">{{ post.viewCount }} 阅读</NText>
              </RouterLink>
            </NSpace>
          </NCard>

          <NCard title="分类">
            <NSpace vertical :size="8">
              <RouterLink v-for="category in categories" :key="category.id" :to="`/category/${category.slug}`" class="side-link">
                {{ category.name }}
              </RouterLink>
            </NSpace>
          </NCard>

          <NCard title="标签">
            <NSpace :size="8" wrap>
              <RouterLink v-for="tag in tags" :key="tag.id" :to="`/tag/${tag.slug}`" class="tag-link">
                <NTag round>{{ tag.name }}</NTag>
              </RouterLink>
            </NSpace>
          </NCard>
        </NSpace>
      </NGridItem>
    </NGrid>
  </main>
</template>

<style scoped>
.page-container {
  max-width: 1180px;
  margin: 0 auto;
  padding: 28px 24px 56px;
}

.hero-card {
  overflow: hidden;
  margin-bottom: 24px;
}

.overview-grid,
.creator-panel {
  margin-bottom: 24px;
}

.creator-hint {
  display: block;
  margin-top: 6px;
}

.hero-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 460px;
  min-height: 420px;
}

.hero-copy {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 22px;
  padding: 44px;
}

.hero-title {
  color: var(--n-text-color);
  font-size: clamp(36px, 5vw, 50px);
  font-weight: 900;
  line-height: 1.05;
  text-decoration: none;
}

.hero-title:hover {
  color: var(--n-primary-color);
}

.hero-summary {
  display: block;
  max-width: 680px;
  font-size: 18px;
  line-height: 1.8;
}

.hero-image {
  height: 100%;
  width: 100%;
}

.content-grid {
  align-items: start;
}

.toolbar {
  width: 100%;
}

.post-list {
  display: grid;
  gap: 18px;
}

.post-list-enter-active,
.post-list-leave-active {
  transition: opacity 0.28s ease, transform 0.28s ease;
}

.post-list-enter-from,
.post-list-leave-to {
  opacity: 0;
  transform: translateY(12px);
}

.post-list-move {
  transition: transform 0.28s ease;
}


.recommend-flex-item {
  width: 33.33%;
  padding: 0 8px;
  flex-wrap: wrap;
  position: relative;
  box-sizing: border-box;
  flex-shrink: 0;
}

.recommend-card {
  height: 100%;
  display: block;
  overflow: hidden;
  color: var(--n-text-color);
  border: 1px solid var(--n-border-color);
  border-radius: 8px;
  background: var(--n-color);
  text-decoration: none;
  transition: border-color 0.22s ease, box-shadow 0.22s ease, transform 0.22s ease;
}

.recommend-card:hover {
  border-color: var(--n-primary-color);
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.1);
  transform: translateY(-3px);
}

.recommend-cover {
  width: 100%;
  height: 128px;
  transition: transform 0.32s ease;
}

.recommend-card:hover .recommend-cover {
  transform: scale(1.035);
}

.recommend-body {
  display: grid;
  gap: 8px;
  padding: 14px;
}

.recommend-body strong {
  line-height: 1.45;
}

.hot-link {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr);
  gap: 8px 10px;
  color: var(--n-text-color);
  text-decoration: none;
  animation: section-fade-in 0.32s ease both;
  transition: transform 0.2s ease;
}

.hot-link:hover {
  transform: translateX(3px);
}

.hot-link:hover .hot-title {
  color: var(--n-primary-color);
}

.hot-rank {
  align-items: center;
  align-self: start;
  background: rgba(15, 118, 110, 0.12);
  border-radius: 6px;
  color: var(--n-primary-color);
  display: inline-flex;
  font-weight: 800;
  height: 28px;
  justify-content: center;
}

.hot-title {
  overflow: hidden;
  font-weight: 700;
  line-height: 1.45;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hot-link :deep(.n-text) {
  grid-column: 2;
}

.side-link {
  color: var(--n-text-color-2);
  font-weight: 650;
  text-decoration: none;
}

.side-link:hover {
  color: var(--n-primary-color);
}

.tag-link {
  text-decoration: none;
}

.empty-state {
  padding: 48px 0;
}

@keyframes section-fade-in {
  from {
    opacity: 0;
    transform: translateY(12px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 960px) {
  .hero-grid {
    grid-template-columns: 1fr;
  }

  .hero-image {
    height: 280px;
  }

  .hero-copy {
    padding: 30px;
  }

  .toolbar,
  .creator-panel :deep(.n-space) {
    align-items: flex-start !important;
    flex-direction: column !important;
  }

  .toolbar :deep(.n-input) {
    width: 100% !important;
  }
}
</style>
