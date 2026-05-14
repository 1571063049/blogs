<script setup lang="ts">
import { computed, onMounted, onUnmounted, provide, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  NConfigProvider,
  NDialogProvider,
  NGlobalStyle,
  NLoadingBarProvider,
  NMessageProvider,
  darkTheme,
  lightTheme,
  type GlobalThemeOverrides,
} from 'naive-ui'
import { useMessage } from 'naive-ui'
import { useAuthStore } from './stores/auth'

const isDark = ref(false)
const router = useRouter()
const authStore = useAuthStore()
const routeTransitionName = ref('route-forward')

router.beforeEach((to, from, next) => {
  const toDepth = to.path.split('/').filter(Boolean).length
  const fromDepth = from.path.split('/').filter(Boolean).length
  routeTransitionName.value = toDepth >= fromDepth ? 'route-forward' : 'route-backward'
  next()
})

const theme = computed(() => (isDark.value ? darkTheme : lightTheme))

const themeOverrides: GlobalThemeOverrides = {
  common: {
    primaryColor: '#0F766E',
    primaryColorHover: '#0D9488',
    primaryColorPressed: '#115E59',
    primaryColorSuppl: '#14B8A6',
    successColor: '#16A34A',
    warningColor: '#D97706',
    errorColor: '#DC2626',
    borderRadius: '10px',
    borderRadiusSmall: '8px',
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontSize: '15px',
    lineHeight: '1.65',
    boxShadow2: '0 12px 32px rgba(15, 23, 42, 0.08)',
    boxShadow3: '0 18px 48px rgba(15, 23, 42, 0.14)',
  },
  Card: {
    borderRadius: '14px',
    paddingMedium: '24px',
  },
  Button: {
    borderRadiusMedium: '10px',
    heightMedium: '40px',
    fontWeight: '650',
  },
  Input: {
    borderRadius: '10px',
    heightMedium: '40px',
  },
  DataTable: {
    thFontWeight: '700',
    tdPaddingMedium: '14px 16px',
    thPaddingMedium: '14px 16px',
  },
  Layout: {
    color: isDark.value ? '#0F172A' : '#F7F8FA',
    siderColor: isDark.value ? '#111827' : '#FFFFFF',
    headerColor: isDark.value ? '#111827' : '#FFFFFF',
  },
}

function toggleTheme() {
  isDark.value = !isDark.value
}

provide('isDarkTheme', isDark)
provide('toggleTheme', toggleTheme)

function handleAuthExpired(event: Event) {
  authStore.clearSession()
  const message = useMessage() 
  const detail = event instanceof CustomEvent ? event.detail : '登录状态已失效，请重新登录'
  message.warning(detail || '登录状态已失效，请重新登录')
  void router.push({
    name: 'login',
    query: { redirect: router.currentRoute.value.fullPath },
  })
}

onMounted(() => {
  window.addEventListener('auth:expired', handleAuthExpired)
})

onUnmounted(() => {
  window.removeEventListener('auth:expired', handleAuthExpired)
})
</script>

<template>
  <NConfigProvider :theme="theme" :theme-overrides="themeOverrides">
    <NGlobalStyle />
    <NMessageProvider>
      <NDialogProvider>
        <NLoadingBarProvider>
          <RouterView v-slot="{ Component, route }">
            <Transition :name="routeTransitionName" mode="out-in" appear>
              <component :is="Component" :key="route.fullPath" class="route-page" />
            </Transition>
          </RouterView>
        </NLoadingBarProvider>
      </NDialogProvider>
    </NMessageProvider>
  </NConfigProvider>
</template>

<style scoped>
.route-page {
  will-change: transform, opacity;
}

.route-forward-enter-active,
.route-forward-leave-active,
.route-backward-enter-active,
.route-backward-leave-active {
  transition: opacity 0.28s ease, transform 0.28s ease;
}

.route-forward-enter-from,
.route-backward-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.route-forward-leave-to,
.route-backward-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
