<script setup lang="ts">
import { computed, h, inject, onMounted, type Ref } from 'vue'
import { RouterLink, RouterView, useRouter } from 'vue-router'
import {
  NAvatar,
  NButton,
  NDropdown,
  NLayout,
  NLayoutContent,
  NLayoutHeader,
  NLayoutSider,
  NSpace,
  NSwitch,
  type DropdownOption,
} from 'naive-ui'
import { useAuthStore } from '../stores/auth'
import { resolveAssetUrl } from '../utils/url'

const router = useRouter()
const authStore = useAuthStore()
const isDarkTheme = inject<Ref<boolean>>('isDarkTheme')
const toggleTheme = inject<() => void>('toggleTheme')

const userOptions = computed<DropdownOption[]>(() => [
  { key: 'profile', label: '个人中心' },
  { key: 'favorites', label: '我的收藏' },
  { key: 'site', label: '返回站点' },
  { key: 'divider', type: 'divider' },
  { key: 'logout', label: '退出登录' },
])

onMounted(() => {
  void authStore.loadMe()
})

function handleUserAction(key: string | number) {
  if (key === 'logout') {
    authStore.logout()
    void router.push('/')
    return
  }

  void router.push(key === 'site' ? '/' : `/${key}`)
}

function renderUserLabel() {
  if (!authStore.user) return null

  return h('div', { class: 'user-trigger' }, [
    h(NAvatar, { round: true, size: 34, src: resolveAssetUrl(authStore.user.avatarUrl) }),
    h('div', { class: 'user-meta' }, [
      h('strong', authStore.user.nickname),
      h('span', authStore.isAdmin ? '管理员' : '普通用户'),
    ]),
  ])
}
</script>

<template>
  <NLayout has-sider class="admin-shell">
    <NLayoutSider bordered collapse-mode="width" :collapsed-width="0" :width="248" class="admin-sider">
      <div class="admin-brand">博客后台</div>
      <nav class="admin-nav">
        <RouterLink to="/admin">数据概览</RouterLink>
        <RouterLink to="/admin/posts">文章管理</RouterLink>
        <RouterLink to="/admin/reviews">审核队列</RouterLink>
        <RouterLink to="/admin/comments">评论审核</RouterLink>
        <RouterLink to="/admin/taxonomy">分类标签</RouterLink>
        <RouterLink to="/workspace">周报计划</RouterLink>
        <RouterLink to="/">查看站点</RouterLink>
        <RouterLink v-if="!authStore.isLoggedIn" to="/login">登录</RouterLink>
      </nav>
    </NLayoutSider>

    <NLayout>
      <NLayoutHeader bordered class="admin-header">
        <NSpace align="center" justify="space-between">
          <div>
            <strong>管理控制台</strong>
            <span class="admin-subtitle">统一管理文章、评论、分类与标签</span>
          </div>
          <NSpace align="center">
            <NSwitch :value="isDarkTheme" @update:value="toggleTheme?.()">
              <template #checked>深色</template>
              <template #unchecked>浅色</template>
            </NSwitch>
            <RouterLink v-if="!authStore.isLoggedIn" to="/login">
              <NButton type="primary">登录</NButton>
            </RouterLink>
            <NDropdown v-else :options="userOptions" trigger="click" @select="handleUserAction">
              <button class="user-button" type="button">
                <component :is="renderUserLabel" />
              </button>
            </NDropdown>
          </NSpace>
        </NSpace>
      </NLayoutHeader>
      <NLayoutContent class="admin-content">
        <RouterView />
      </NLayoutContent>
    </NLayout>
  </NLayout>
</template>

<style scoped>
.admin-shell {
  min-height: 100vh;
}

.admin-sider {
  min-height: 100vh;
}

.admin-brand {
  padding: 24px 22px 18px;
  font-size: 22px;
  font-weight: 850;
}

.admin-nav {
  display: grid;
  gap: 6px;
  padding: 0 14px;
}

.admin-nav a {
  border-radius: 10px;
  color: var(--n-text-color-2);
  font-weight: 650;
  padding: 10px 12px;
  text-decoration: none;
}

.admin-nav a:hover,
.admin-nav a.router-link-active {
  color: var(--n-primary-color);
  background: rgba(15, 118, 110, 0.1);
}

.admin-header {
  padding: 16px 28px;
}

.admin-subtitle {
  display: block;
  margin-top: 4px;
  color: var(--n-text-color-3);
  font-size: 13px;
}

.user-button {
  border: 0;
  border-radius: 999px;
  background: transparent;
  cursor: pointer;
  padding: 4px 8px;
}

.user-button:hover,
.user-button:focus-visible {
  background: rgba(15, 118, 110, 0.1);
  outline: none;
}

:deep(.user-trigger) {
  display: flex;
  align-items: center;
  gap: 10px;
}

:deep(.user-meta) {
  display: grid;
  line-height: 1.2;
  text-align: left;
}

:deep(.user-meta span) {
  color: var(--n-text-color-3);
  font-size: 12px;
}

.admin-content {
  padding: 28px;
}

@media (max-width: 760px) {
  .admin-shell {
    display: block;
  }

  .admin-sider {
    display: none;
  }

  .admin-content {
    padding: 18px;
  }
}
</style>
