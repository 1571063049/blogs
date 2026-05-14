<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { NCard, NGrid, NGridItem, NNumberAnimation, NSkeleton, NStatistic } from 'naive-ui'
import { blogApi } from '../api/blog'
import type { DashboardStats } from '../types/blog'

const stats = ref<DashboardStats>({
  posts: 0,
  comments: 0,
  views: 0,
  categories: 0,
  tags: 0,
})
const isLoading = ref(true)

const statCards = computed(() => [
  { label: '文章数', value: stats.value.posts },
  { label: '评论数', value: stats.value.comments },
  { label: '阅读量', value: stats.value.views },
  { label: '分类数', value: stats.value.categories },
  { label: '标签数', value: stats.value.tags ?? 0 },
])

onMounted(async () => {
  try {
    stats.value = await blogApi.getDashboardStats()
  } finally {
    isLoading.value = false
  }
})
</script>

<template>
  <section>
    <NCard title="数据概览">
      <NGrid :cols="5" :x-gap="16" :y-gap="16" responsive="screen">
        <NGridItem v-for="item in statCards" :key="item.label" :span="5" :sm="2" :lg="1">
          <NCard embedded>
            <NSkeleton v-if="isLoading" text :repeat="2" />
            <NStatistic v-else :label="item.label" class="tatistic-color">
              <NNumberAnimation :from="0" :to="item.value" />
            </NStatistic>
          </NCard>
        </NGridItem>
      </NGrid>
    </NCard>
  </section>
</template>
