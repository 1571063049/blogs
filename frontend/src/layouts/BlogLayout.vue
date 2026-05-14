<script setup lang="ts">
import { computed, h, inject, onMounted, type Ref } from 'vue'
import { RouterLink, RouterView, useRouter } from 'vue-router'
import {
  NAvatar,
  NButton,
  NDropdown,
  NLayout,
  NLayoutContent,
  NLayoutFooter,
  NLayoutHeader,
  NSpace,
  NSwitch,
  NText,
  type DropdownOption,
} from 'naive-ui'
import { useAuthStore } from '../stores/auth'
import { useSiteStore } from '../stores/site'
import { resolveAssetUrl } from '../utils/url'

const router = useRouter()
const siteStore = useSiteStore()
const authStore = useAuthStore()
const isDarkTheme = inject<Ref<boolean>>('isDarkTheme')
const toggleTheme = inject<() => void>('toggleTheme')

const userOptions = computed<DropdownOption[]>(() => [
  { key: 'workspace', label: '周报与计划' },
  { key: 'write', label: '写文章' },
  { key: 'posts/mine', label: '我的投稿' },
  { key: 'notifications', label: '通知中心' },
  { key: 'profile', label: '个人中心' },
  { key: 'favorites', label: '我的收藏' },
  { key: 'admin', label: '进入后台', show: authStore.isAdmin },
  { key: 'divider', type: 'divider' },
  { key: 'logout', label: '退出登录' },
])

onMounted(() => {
  void siteStore.loadConfig()
  void authStore.loadMe()
})

function handleUserAction(key: string | number) {
  if (key === 'logout') {
    authStore.logout()
    void router.push('/')
    return
  }

  void router.push(`/${key}`)
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
  <NLayout class="blog-shell">
    <NLayoutHeader bordered class="blog-header">
      <div class="blog-header-inner">
        <RouterLink to="/" class="brand-link">
          {{ siteStore.config.siteName }}
        </RouterLink>

        <NSpace align="center" :size="18" class="desktop-nav">
          <RouterLink to="/">首页</RouterLink>
          <RouterLink v-if="authStore.isLoggedIn" to="/workspace">周报计划</RouterLink>
          <RouterLink to="/archive">归档</RouterLink>
          <RouterLink to="/about">关于</RouterLink>
          <RouterLink to="/admin">后台</RouterLink>
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
      </div>
    </NLayoutHeader>

    <NLayoutContent>
      <RouterView />
    </NLayoutContent>

    <NLayoutFooter bordered class="blog-footer">
      <NText depth="3">由 {{ siteStore.config.owner }} 用心维护。</NText>
    </NLayoutFooter>
  </NLayout>
</template>

<style scoped>
.blog-shell {
  min-height: 100vh;
}

.blog-header {
  position: sticky;
  top: 0;
  z-index: 20;
  backdrop-filter: blur(16px);
}

.blog-header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 1180px;
  margin: 0 auto;
  padding: 16px 24px;
}

.brand-link {
  color: var(--n-text-color);
  font-size: 22px;
  font-weight: 850;
  text-decoration: none;
}

.desktop-nav a {
  color: var(--n-text-color-2);
  font-weight: 650;
  text-decoration: none;
}

.desktop-nav a:hover,
.desktop-nav a.router-link-active {
  color: var(--n-primary-color);
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

.blog-footer {
  padding: 24px;
  text-align: center;
}

@media (max-width: 760px) {
  .blog-header-inner {
    align-items: flex-start;
    flex-direction: column;
    gap: 14px;
  }

  .desktop-nav {
    flex-wrap: wrap;
  }
}
</style>
