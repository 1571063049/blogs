<template>
  <main class="about-page">
    <NCard :bordered="false" class="about-card">
      <NTag type="primary" round>关于</NTag>
      <h1>一个用来沉淀长期笔记的空间</h1>
      <NText depth="2" class="about-copy">
        这个博客项目用于发布技术文章、项目记录和个人随笔，前端基于 Vue 3，后端基于 NestJS API。
      </NText>
      <NGrid :cols="3" :x-gap="16" :y-gap="16" responsive="screen" class="about-grid">
        <NGridItem>
          <NCard size="small" title="技术写作">记录方案、问题和复盘。</NCard>
        </NGridItem>
        <NGridItem>
          <NCard size="small" title="项目笔记">沉淀从想法到实现的过程。</NCard>
        </NGridItem>
        <NGridItem>
          <NCard size="small" title="日常思考">保留值得回看的观察。</NCard>
        </NGridItem>
      </NGrid>
    </NCard>
  </main>
</template>

<script setup lang="ts">
import { NCard, NGrid, NGridItem, NTag, NText } from 'naive-ui'
</script>

<style scoped>
.about-page {
  max-width: 980px;
  margin: 0 auto;
  padding: 32px 24px 56px;
}

.about-card {
  padding: 20px;
}

.about-card h1 {
  margin: 18px 0;
  font-size: clamp(34px, 5vw, 58px);
  font-weight: 900;
  line-height: 1.12;
}

.about-copy {
  display: block;
  max-width: 760px;
  font-size: 18px;
  line-height: 1.85;
}

.about-grid {
  margin-top: 28px;
}
</style>
