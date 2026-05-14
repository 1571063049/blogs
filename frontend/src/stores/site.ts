import { defineStore } from 'pinia'
import { ref } from 'vue'
import { blogApi } from '../api/blog'
import type { SiteConfig } from '../types/blog'

export const useSiteStore = defineStore('site', () => {
  const config = ref<SiteConfig>({
    siteName: '个人博客',
    tagline: '记录工程实践、产品思考和日常学习。',
    owner: '博主',
    email: 'hello@example.com',
  })

  async function loadConfig() {
    config.value = await blogApi.getSiteConfig()
  }

  return { config, loadConfig }
})
