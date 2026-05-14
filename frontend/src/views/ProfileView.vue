<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import {
  NAlert,
  NAvatar,
  NButton,
  NCard,
  NEmpty,
  NForm,
  NFormItem,
  NGrid,
  NGridItem,
  NInput,
  NModal,
  NSlider,
  NSpace,
  NStatistic,
  NTag,
  NText,
  NUpload,
  useMessage,
  type UploadCustomRequestOptions,
} from 'naive-ui'
import { useAuthStore } from '../stores/auth'
import { resolveAssetUrl } from '../utils/url'

const message = useMessage()
const authStore = useAuthStore()
const nicknameMaxLength = 20
const bioMaxLength = 200
const avatarCanvasSize = 280
const isSubmitting = ref(false)
const isUploadingAvatar = ref(false)
const previewAvatarUrl = ref('')
const cropModalVisible = ref(false)
const cropScale = ref(1)
const cropOffsetX = ref(0)
const cropOffsetY = ref(0)
const sourceAvatarFile = ref<File | null>(null)
const sourceImageUrl = ref('')
const sourceImage = ref<HTMLImageElement | null>(null)
const sourceImageWidth = ref(0)
const sourceImageHeight = ref(0)
const croppedFile = ref<File | null>(null)
const cropCanvasRef = ref<HTMLCanvasElement | null>(null)
let cropRenderRaf = 0
const form = ref({
  nickname: '',
  avatarUrl: '',
  bio: '',
})

const avatarSrc = computed(() => resolveAssetUrl(previewAvatarUrl.value || form.value.avatarUrl || authStore.user?.avatarUrl))
const nicknameLengthText = computed(() => `${form.value.nickname.length}/${nicknameMaxLength}`)
const bioLengthText = computed(() => `${form.value.bio.length}/${bioMaxLength}`)

function revokeObjectUrl(url: string) {
  if (url.startsWith('blob:')) {
    URL.revokeObjectURL(url)
  }
}

function resetCropState() {
  cropScale.value = 1
  cropOffsetX.value = 0
  cropOffsetY.value = 0
  sourceAvatarFile.value = null
  sourceImage.value = null
  sourceImageWidth.value = 0
  sourceImageHeight.value = 0
  if (sourceImageUrl.value) {
    revokeObjectUrl(sourceImageUrl.value)
    sourceImageUrl.value = ''
  }
  if (cropRenderRaf) {
    cancelAnimationFrame(cropRenderRaf)
    cropRenderRaf = 0
  }
  const canvas = cropCanvasRef.value
  if (canvas) {
    const ctx = canvas.getContext('2d')
    ctx?.clearRect(0, 0, avatarCanvasSize, avatarCanvasSize)
  }
  croppedFile.value = null
}

watch(
  () => authStore.user,
  (user) => {
    if (!user) return
    form.value = {
      nickname: user.nickname,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
    }
    previewAvatarUrl.value = ''
  },
  { immediate: true },
)

watch(
  () => form.value.nickname,
  (value) => {
    if (value.length > nicknameMaxLength) {
      form.value.nickname = value.slice(0, nicknameMaxLength)
    }
  },
)

watch(
  () => form.value.bio,
  (value) => {
    if (value.length > bioMaxLength) {
      form.value.bio = value.slice(0, bioMaxLength)
    }
  },
)

onMounted(async () => {
  await authStore.loadMe()
})

onBeforeUnmount(() => {
  if (previewAvatarUrl.value) {
    revokeObjectUrl(previewAvatarUrl.value)
  }
  resetCropState()
})

function computeCropBounds() {
  const imageWidth = sourceImageWidth.value
  const imageHeight = sourceImageHeight.value
  const minScale = Math.max(avatarCanvasSize / imageWidth, avatarCanvasSize / imageHeight)
  const currentScale = Math.max(cropScale.value, minScale)
  const renderedWidth = imageWidth * currentScale
  const renderedHeight = imageHeight * currentScale
  const maxOffsetX = Math.max(0, (renderedWidth - avatarCanvasSize) / 2)
  const maxOffsetY = Math.max(0, (renderedHeight - avatarCanvasSize) / 2)
  const offsetX = Math.min(Math.max(cropOffsetX.value, -maxOffsetX), maxOffsetX)
  const offsetY = Math.min(Math.max(cropOffsetY.value, -maxOffsetY), maxOffsetY)

  return { renderedWidth, renderedHeight, offsetX, offsetY }
}

function drawCropToCanvas(canvas: HTMLCanvasElement) {
  const image = sourceImage.value
  if (!image) return false

  const { renderedWidth, renderedHeight, offsetX, offsetY } = computeCropBounds()
  canvas.width = avatarCanvasSize
  canvas.height = avatarCanvasSize
  const ctx = canvas.getContext('2d')
  if (!ctx) return false

  const drawX = (avatarCanvasSize - renderedWidth) / 2 + offsetX
  const drawY = (avatarCanvasSize - renderedHeight) / 2 + offsetY
  ctx.clearRect(0, 0, avatarCanvasSize, avatarCanvasSize)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(image, drawX, drawY, renderedWidth, renderedHeight)
  return true
}

function renderCropPreview() {
  const canvas = cropCanvasRef.value
  if (!canvas) return
  drawCropToCanvas(canvas)
}

function scheduleCropPreviewRender() {
  if (!cropModalVisible.value || cropRenderRaf) return
  cropRenderRaf = requestAnimationFrame(() => {
    cropRenderRaf = 0
    renderCropPreview()
  })
}

watch([cropScale, cropOffsetX, cropOffsetY], () => {
  scheduleCropPreviewRender()
})

async function uploadAvatar({ file, onFinish, onError }: UploadCustomRequestOptions) {
  const rawFile = file.file

  if (!rawFile) {
    onError()
    message.error('请选择头像图片')
    return
  }

  if (!rawFile.type.startsWith('image/')) {
    onError()
    message.error('只能上传图片文件')
    return
  }

  if (rawFile.size > 2 * 1024 * 1024) {
    onError()
    message.error('头像图片不能超过 2MB')
    return
  }

  resetCropState()
  sourceAvatarFile.value = rawFile
  sourceImageUrl.value = URL.createObjectURL(rawFile)
  const image = new Image()
  image.src = sourceImageUrl.value
  image.onload = () => {
    sourceImage.value = image
    sourceImageWidth.value = image.naturalWidth
    sourceImageHeight.value = image.naturalHeight
    const minScale = Math.max(avatarCanvasSize / image.naturalWidth, avatarCanvasSize / image.naturalHeight)
    cropScale.value = Math.max(minScale, 1)
    cropOffsetX.value = 0
    cropOffsetY.value = 0
    cropModalVisible.value = true
    scheduleCropPreviewRender()
  }
  image.onerror = () => {
    onError()
    message.error('图片加载失败，请重试')
    resetCropState()
  }

  onFinish()
}

function cancelAvatarCrop() {
  cropModalVisible.value = false
  resetCropState()
}

async function confirmAvatarCrop() {
  const canvas = cropCanvasRef.value
  if (!canvas) {
    message.warning('请先完成头像裁剪')
    return
  }

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png', 0.92))
  if (!blob) {
    message.error('头像处理失败，请重试')
    return
  }

  const baseName = sourceAvatarFile.value?.name.replace(/\.[^.]+$/, '') || 'avatar'
  croppedFile.value = new File([blob], `${baseName}-cropped.png`, { type: 'image/png' })

  if (previewAvatarUrl.value) {
    revokeObjectUrl(previewAvatarUrl.value)
  }
  previewAvatarUrl.value = URL.createObjectURL(blob)
  cropModalVisible.value = false
  isUploadingAvatar.value = true

  try {
    await authStore.uploadAvatar(croppedFile.value)
    message.success('头像已更新')
  } catch (error) {
    revokeObjectUrl(previewAvatarUrl.value)
    previewAvatarUrl.value = ''
    message.error(error instanceof Error ? error.message : '头像上传失败，请稍后重试')
  } finally {
    isUploadingAvatar.value = false
    if (sourceImageUrl.value) {
      revokeObjectUrl(sourceImageUrl.value)
      sourceImageUrl.value = ''
    }
    sourceAvatarFile.value = null
    sourceImage.value = null
    sourceImageWidth.value = 0
    sourceImageHeight.value = 0
    croppedFile.value = null
  }
}

async function submitProfile() {
  if (!form.value.nickname.trim()) {
    message.warning('昵称不能为空')
    return
  }

  isSubmitting.value = true
  try {
    await authStore.updateProfile({
      nickname: form.value.nickname.trim(),
      avatarUrl: form.value.avatarUrl.trim(),
      bio: form.value.bio.trim(),
    })
    message.success('个人资料已更新')
  } catch (error) {
    message.error(error instanceof Error ? error.message : '保存失败，请稍后重试')
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <main class="profile-page">
    <NEmpty v-if="!authStore.isLoggedIn" description="请先登录后查看个人中心">
      <template #extra>
        <RouterLink to="/login">
          <NButton type="primary">前往登录</NButton>
        </RouterLink>
      </template>
    </NEmpty>

    <NGrid v-else :cols="12" :x-gap="24" :y-gap="24" responsive="screen">
      <NGridItem :span="12" :lg="4">
        <NCard>
          <NSpace vertical align="center" :size="16">
            <NAvatar round :size="104" :src="avatarSrc" />
            <NUpload
              accept="image/png,image/jpeg,image/webp,image/gif"
              :show-file-list="false"
              :custom-request="uploadAvatar"
              :disabled="isUploadingAvatar"
            >
              <NButton size="small" secondary :loading="isUploadingAvatar">上传头像</NButton>
            </NUpload>
            <!-- <div class="profile-name">{{ authStore.user?.nickname }}</div> -->
            <!-- <NText depth="3">@{{ authStore.user?.username }}</NText> -->
            <NTag :type="authStore.isAdmin ? 'success' : 'default'" round>
              {{ authStore.isAdmin ? '管理员' : '普通用户' }}
            </NTag>
            <NText depth="2" class="profile-bio">{{ authStore.user?.bio }}</NText>
          </NSpace>
        </NCard>

        <NGrid :cols="2" :x-gap="12" class="profile-stats">
          <NGridItem>
            <NCard embedded>
              <NStatistic label="收藏文章" class="tatistic-color" :value="authStore.user?.favorites.length ?? 0" />
            </NCard>
          </NGridItem>
          <NGridItem>
            <NCard embedded>
              <NStatistic label="用户编号" class="tatistic-color" :value="authStore.user?.id ?? 0" />
            </NCard>
          </NGridItem>
        </NGrid>
      </NGridItem>

      <NGridItem :span="12" :lg="8">
        <NCard title="个人资料">
          <NForm label-placement="top" @submit.prevent="submitProfile">
            <NFormItem label="昵称" required :feedback="`字数：${nicknameLengthText}`">
              <NInput
                v-model:value="form.nickname"
                clearable
                show-count
                :maxlength="nicknameMaxLength"
                placeholder="请输入昵称"
              />
            </NFormItem>
            <NFormItem label="头像地址">
              <NInput v-model:value="form.avatarUrl" clearable placeholder="可粘贴图片地址，也可使用顶部上传头像"/>
            </NFormItem>
            <NFormItem label="个人简介" :feedback="`字数：${bioLengthText}`">
              <NInput
                v-model:value="form.bio"
                type="textarea"
                show-count
                :maxlength="bioMaxLength"
                :autosize="{ minRows: 4, maxRows: 8 }"
                placeholder="介绍一下你自己"
              />
            </NFormItem>
            <NSpace justify="end">
              <RouterLink to="/">
                <NButton>返回首页</NButton>
              </RouterLink>
              <NButton type="primary" attr-type="submit" :loading="isSubmitting">保存资料</NButton>
            </NSpace>
          </NForm>
        </NCard>
      </NGridItem>
    </NGrid>

    <NModal v-model:show="cropModalVisible" preset="card" title="裁剪头像并确认" style="width: 640px" :mask-closable="false">
      <NSpace vertical :size="16">
        <NAlert type="info" :show-icon="false">请调整缩放与偏移，确认后上传新头像。</NAlert>
        <div class="avatar-crop-preview-wrap">
          <canvas ref="cropCanvasRef" class="avatar-crop-canvas" width="280" height="280"></canvas>
        </div>
        <NSpace vertical :size="10">
          <NText depth="2">缩放</NText>
          <NSlider v-model:value="cropScale" :step="0.01" :min="0.4" :max="3" />
          <NText depth="2">水平偏移</NText>
          <NSlider v-model:value="cropOffsetX" :step="1" :min="-200" :max="200" />
          <NText depth="2">垂直偏移</NText>
          <NSlider v-model:value="cropOffsetY" :step="1" :min="-200" :max="200" />
        </NSpace>
        <NSpace justify="end">
          <NButton @click="cancelAvatarCrop">取消</NButton>
          <NButton type="primary" :loading="isUploadingAvatar" @click="confirmAvatarCrop">确认上传</NButton>
        </NSpace>
      </NSpace>
    </NModal>
  </main>
</template>

<style scoped>
.profile-page {
  max-width: 1080px;
  margin: 0 auto;
  padding: 32px 24px 56px;
}

.profile-name {
  font-size: 24px;
  font-weight: 850;
}

.profile-bio {
  display: block;
  text-align: center;
  line-height: 1.75;
}

.profile-stats {
  margin-top: 16px;
}

.avatar-crop-preview-wrap {
  width: 280px;
  height: 280px;
  margin: 0 auto;
  border-radius: 50%;
  overflow: hidden;
  border: 1px solid var(--n-border-color);
}

.avatar-crop-canvas {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
