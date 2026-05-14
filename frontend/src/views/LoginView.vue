<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { NButton, NCard, NForm, NFormItem, NGrid, NGridItem, NInput, NSpace, NTabs, NTabPane, NText, useMessage } from 'naive-ui'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const message = useMessage()
const authStore = useAuthStore()
const mode = ref<'login' | 'register'>('login')
const username = ref('admin')
const nickname = ref('')
const password = ref('admin123')
const isSubmitting = ref(false)

async function submit() {
  if (!username.value.trim() || !password.value.trim()) {
    message.warning('请填写用户名和密码')
    return
  }

  if (password.value.length < 6) {
    message.warning('密码至少需要 6 位')
    return
  }

  isSubmitting.value = true
  try {
    if (mode.value === 'login') {
      await authStore.login(username.value.trim(), password.value)
      message.success('登录成功')
    } else {
      await authStore.register(username.value.trim(), password.value, nickname.value.trim())
      message.success('注册成功')
    }
    await router.push('/admin/posts')
  } catch (error) {
    message.error(error instanceof Error ? error.message : '认证失败，请检查用户名和密码')
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <main class="auth-page">
    <NCard class="auth-card" :bordered="false">
      <NGrid :cols="12" responsive="screen" :x-gap="28" :y-gap="24">
        <NGridItem :span="12" :md="5">
          <section class="auth-intro">
            <NText depth="3">用户入口</NText>
            <h1>发布、收藏和管理你的博客</h1>
            <p>演示管理员账号：admin，密码：admin123。普通注册用户可以收藏喜欢的文章。</p>
          </section>
        </NGridItem>

        <NGridItem :span="12" :md="7">
          <NTabs v-model:value="mode" type="segment" animated>
            <NTabPane name="login" tab="登录" />
            <NTabPane name="register" tab="注册" />
          </NTabs>

          <NForm label-placement="top" class="auth-form" @submit.prevent="submit">
            <NFormItem label="用户名" required>
              <NInput v-model:value="username" clearable placeholder="请输入用户名" />
            </NFormItem>
            <NFormItem v-if="mode === 'register'" label="昵称">
              <NInput v-model:value="nickname" clearable placeholder="可选，默认使用用户名" />
            </NFormItem>
            <NFormItem label="密码" required>
              <NInput v-model:value="password" type="password" show-password-on="click" placeholder="请输入密码" />
            </NFormItem>
            <NSpace justify="end">
              <NButton quaternary @click="router.push('/')">返回首页</NButton>
              <NButton type="primary" attr-type="submit" :loading="isSubmitting">
                {{ mode === 'login' ? '登录' : '创建账号' }}
              </NButton>
            </NSpace>
          </NForm>
        </NGridItem>
      </NGrid>
    </NCard>
  </main>
</template>

<style scoped>
.auth-page {
  display: grid;
  min-height: calc(100vh - 140px);
  place-items: center;
  padding: 32px 24px;
}

.auth-card {
  max-width: 960px;
  width: 100%;
}

.auth-intro {
  display: flex;
  min-height: 320px;
  flex-direction: column;
  justify-content: center;
  border-radius: 14px;
  background: linear-gradient(135deg, rgba(15, 118, 110, 0.16), rgba(20, 184, 166, 0.08));
  padding: 32px;
}

.auth-intro h1 {
  margin: 16px 0;
  font-size: 36px;
  font-weight: 900;
  line-height: 1.18;
}

.auth-intro p {
  margin: 0;
  color: var(--n-text-color-2);
  line-height: 1.8;
}

.auth-form {
  margin-top: 24px;
}
</style>
