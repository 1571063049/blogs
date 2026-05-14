<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  NButton,
  NCard,
  NEmpty,
  NFlex,
  NForm,
  NFormItem,
  NGrid,
  NGridItem,
  NInput,
  NInputNumber,
  NModal,
  NPopconfirm,
  NProgress,
  NSelect,
  NSpace,
  NTabPane,
  NTabs,
  NTag,
  NText,
  useMessage,
} from 'naive-ui'
import { blogApi } from '../api/blog'
import type {
  PersonalPlan,
  PersonalPlanPayload,
  PlanStatus,
  PlanType,
  WeeklyReport,
  WeeklyReportPayload,
} from '../types/blog'

const message = useMessage()
const weeklyReports = ref<WeeklyReport[]>([])
const plans = ref<PersonalPlan[]>([])
const activeReport = ref<WeeklyReport | null>(null)
const activePlan = ref<PersonalPlan | null>(null)
const editingReportId = ref<number | null>(null)
const editingPlanId = ref<number | null>(null)
const isLoading = ref(true)
const isSubmitting = ref(false)
const showReportEditor = ref(false)
const showPlanEditor = ref(false)
const reportKeyword = ref('')
const reportWeekFilter = ref('')

const reportForm = ref<WeeklyReportPayload>(createEmptyReportForm())
const planForm = ref<PersonalPlanPayload>(createEmptyPlanForm())

const planTypeOptions: Array<{ label: string; value: PlanType }> = [
  { label: '个人计划', value: 'PERSONAL' },
  { label: '工作计划', value: 'WORK' },
  { label: '旅行计划', value: 'TRAVEL' },
  { label: '学习计划', value: 'STUDY' },
  { label: '其他计划', value: 'OTHER' },
]

const planStatusOptions: Array<{ label: string; value: PlanStatus }> = [
  { label: '未开始', value: 'NOT_STARTED' },
  { label: '进行中', value: 'IN_PROGRESS' },
  { label: '已完成', value: 'DONE' },
  { label: '已暂停', value: 'PAUSED' },
  { label: '已取消', value: 'CANCELED' },
]

const typeLabels = Object.fromEntries(planTypeOptions.map((item) => [item.value, item.label])) as Record<PlanType, string>
const statusLabels = Object.fromEntries(planStatusOptions.map((item) => [item.value, item.label])) as Record<PlanStatus, string>
const statusTypes: Record<PlanStatus, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
  NOT_STARTED: 'default',
  IN_PROGRESS: 'info',
  DONE: 'success',
  PAUSED: 'warning',
  CANCELED: 'error',
}

const reportStats = computed(() => ({
  total: weeklyReports.value.length,
  latest: weeklyReports.value[0]?.title ?? '暂无周报',
}))
const planStats = computed(() => ({
  total: plans.value.length,
  active: plans.value.filter((plan) => plan.status === 'IN_PROGRESS').length,
  done: plans.value.filter((plan) => plan.status === 'DONE').length,
}))
const renderedReportContent = computed(() => renderMarkdown(activeReport.value?.content ?? ''))
const renderedPlanContent = computed(() => renderMarkdown(activePlan.value?.content ?? ''))
const renderedReportDraftContent = computed(() => renderMarkdown(reportForm.value.content ?? ''))
const renderedPlanDraftContent = computed(() => renderMarkdown(planForm.value.content ?? ''))
const reportTocItems = computed(() => extractHeadings(activeReport.value?.content ?? ''))
const planTocItems = computed(() => extractHeadings(activePlan.value?.content ?? ''))
const filteredWeeklyReports = computed(() => {
  const keyword = reportKeyword.value.trim().toLowerCase()

  return weeklyReports.value.filter((report) => {
    const matchesKeyword =
      !keyword ||
      [report.title, report.summary, report.content].some((field) => field.toLowerCase().includes(keyword))

    const matchesWeek = !reportWeekFilter.value || report.weekStart.slice(0, 10) === reportWeekFilter.value

    return matchesKeyword && matchesWeek
  })
})

onMounted(() => {
  void loadWorkspace()
})

async function loadWorkspace() {
  isLoading.value = true
  try {
    const [reportItems, planItems] = await Promise.all([blogApi.getMyWeeklyReports(), blogApi.getMyPlans()])
    weeklyReports.value = reportItems
    plans.value = planItems
    activeReport.value = reportItems[0] ?? null
    activePlan.value = planItems[0] ?? null
  } finally {
    isLoading.value = false
  }
}

function selectDefaultReport() {
  activeReport.value = filteredWeeklyReports.value[0] ?? null
}

function createEmptyReportForm(): WeeklyReportPayload {
  const today = new Date()
  const day = today.getDay() || 7
  const monday = new Date(today)
  monday.setDate(today.getDate() - day + 1)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)

  return {
    title: `第 ${formatDate(monday)} 周报`,
    summary: '',
    weekStart: toDateInputValue(monday),
    weekEnd: toDateInputValue(sunday),
    content: '# 本周总结\n\n## 已完成\n\n- \n\n## 进行中\n\n- \n\n## 问题与风险\n\n- \n\n## 下周计划\n\n- \n',
  }
}

function createEmptyPlanForm(): PersonalPlanPayload {
  return {
    title: '',
    type: 'PERSONAL',
    status: 'NOT_STARTED',
    progress: 0,
    currentPlan: '',
    nextPlan: '',
    content: '# 计划说明\n\n## 目标\n\n- \n\n## 关键事项\n\n- \n\n## 时间安排\n\n- \n',
  }
}

function openReportEditor(report?: WeeklyReport) {
  editingReportId.value = report?.id ?? null
  reportForm.value = report
    ? {
        title: report.title,
        summary: report.summary,
        content: report.content,
        weekStart: report.weekStart.slice(0, 10),
        weekEnd: report.weekEnd.slice(0, 10),
      }
    : createEmptyReportForm()
  showReportEditor.value = true
}

function openPlanEditor(plan?: PersonalPlan) {
  editingPlanId.value = plan?.id ?? null
  planForm.value = plan
    ? {
        title: plan.title,
        type: plan.type,
        status: plan.status,
        progress: plan.progress,
        currentPlan: plan.currentPlan,
        nextPlan: plan.nextPlan,
        content: plan.content,
      }
    : createEmptyPlanForm()
  showPlanEditor.value = true
}

async function submitReport() {
  if (!reportForm.value.title.trim() || !reportForm.value.content.trim()) {
    message.warning('请填写周报标题和 Markdown 内容')
    return
  }

  isSubmitting.value = true
  try {
    const report = editingReportId.value
      ? await blogApi.updateMyWeeklyReport(editingReportId.value, reportForm.value)
      : await blogApi.createMyWeeklyReport(reportForm.value)
    await loadWorkspace()
    activeReport.value = filteredWeeklyReports.value.find((item) => item.id === report.id) ?? report
    showReportEditor.value = false
    message.success(editingReportId.value ? '周报已更新' : '周报已保存')
  } catch (error) {
    message.error(error instanceof Error ? error.message : '周报保存失败')
  } finally {
    isSubmitting.value = false
  }
}

async function submitPlan() {
  if (!planForm.value.title.trim() || !planForm.value.content.trim()) {
    message.warning('请填写计划标题和 Markdown 内容')
    return
  }

  isSubmitting.value = true
  try {
    const plan = editingPlanId.value
      ? await blogApi.updateMyPlan(editingPlanId.value, planForm.value)
      : await blogApi.createMyPlan(planForm.value)
    await loadWorkspace()
    activePlan.value = plans.value.find((item) => item.id === plan.id) ?? plan
    showPlanEditor.value = false
    message.success(editingPlanId.value ? '计划已更新' : '计划已保存')
  } catch (error) {
    message.error(error instanceof Error ? error.message : '计划保存失败')
  } finally {
    isSubmitting.value = false
  }
}

async function deleteReport(report: WeeklyReport) {
  await blogApi.deleteMyWeeklyReport(report.id)
  await loadWorkspace()
  message.success('周报已删除')
}

async function deletePlan(plan: PersonalPlan) {
  await blogApi.deleteMyPlan(plan.id)
  await loadWorkspace()
  message.success('计划已删除')
}

function exportReport(report: WeeklyReport) {
  const filename = `${safeFilename(report.title)}.md`
  const blob = new Blob([report.content], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function exportPlan(plan: PersonalPlan) {
  const filename = `${safeFilename(plan.title)}.md`
  const blob = new Blob([plan.content], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10)
}

function formatDate(dateValue: string | Date) {
  return new Date(dateValue).toLocaleDateString('zh-CN')
}

function safeFilename(value: string) {
  return value.trim().replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, '-').slice(0, 80) || 'weekly-report'
}

function clearReportFilters() {
  reportKeyword.value = ''
  reportWeekFilter.value = ''
  selectDefaultReport()
}

function handleReportFiltersChange() {
  if (!activeReport.value) {
    selectDefaultReport()
    return
  }

  if (!filteredWeeklyReports.value.some((item) => item.id === activeReport.value?.id)) {
    selectDefaultReport()
  }
}

function renderMarkdown(markdown: string) {
  if (!markdown.trim()) {
    return '<p>暂无内容</p>'
  }

  const lines = markdown.replace(/\r\n/g, '\n').split('\n')
  const htmlParts: string[] = []
  const paragraphBuffer: string[] = []
  const listBuffer: string[] = []
  const headingCounter = new Map<string, number>()
  let inCodeBlock = false
  let codeBuffer: string[] = []
  let tableBuffer: string[] = []
  let listKind: 'ul' | 'task' = 'ul'

  const flushParagraph = () => {
    if (paragraphBuffer.length === 0) return
    htmlParts.push(`<p>${renderInline(paragraphBuffer.join('<br />'))}</p>`)
    paragraphBuffer.length = 0
  }

  const flushList = () => {
    if (listBuffer.length === 0) return
    if (listKind === 'task') {
      htmlParts.push(
        `<ul class="task-list">${listBuffer
          .map((item) => {
            const taskMatch = item.match(/^\[( |x|X)\]\s+(.*)$/)
            const checked = taskMatch?.[1].toLowerCase() === 'x'
            const text = taskMatch?.[2] ?? item
            return `<li class="task-item"><input type="checkbox" disabled ${checked ? 'checked' : ''} /><span>${renderInline(text)}</span></li>`
          })
          .join('')}</ul>`,
      )
    } else {
      htmlParts.push(`<ul>${listBuffer.map((item) => `<li>${renderInline(item)}</li>`).join('')}</ul>`)
    }
    listBuffer.length = 0
    listKind = 'ul'
  }

  const flushCodeBlock = () => {
    htmlParts.push(`<pre><code>${escapeHtml(codeBuffer.join('\n'))}</code></pre>`)
    codeBuffer = []
  }

  const flushTable = () => {
    if (tableBuffer.length < 2) {
      tableBuffer = []
      return
    }

    const rows = tableBuffer.map((line) =>
      line
        .trim()
        .replace(/^\|/, '')
        .replace(/\|$/, '')
        .split('|')
        .map((cell) => cell.trim()),
    )

    const [headerRow, , ...bodyRows] = rows
    const headerHtml = headerRow.map((cell) => `<th>${renderInline(escapeHtml(cell))}</th>`).join('')
    const bodyHtml = bodyRows
      .map((row) => `<tr>${row.map((cell) => `<td>${renderInline(escapeHtml(cell))}</td>`).join('')}</tr>`)
      .join('')

    htmlParts.push(`<div class="table-wrap"><table><thead><tr>${headerHtml}</tr></thead><tbody>${bodyHtml}</tbody></table></div>`)
    tableBuffer = []
  }

  for (const rawLine of lines) {
    const line = rawLine.trimEnd()

    if (line.startsWith('```')) {
      flushParagraph()
      flushList()
      flushTable()
      if (inCodeBlock) {
        flushCodeBlock()
      }
      inCodeBlock = !inCodeBlock
      continue
    }

    if (inCodeBlock) {
      codeBuffer.push(rawLine)
      continue
    }

    const headingMatch = line.match(/^(#{1,4})\s+(.*)$/)
    if (headingMatch) {
      flushParagraph()
      flushList()
      flushTable()
      const level = headingMatch[1].length
      const title = headingMatch[2].trim()
      const anchorId = buildUniqueHeadingId(title, headingCounter)
      htmlParts.push(`<h${level} id="${anchorId}">${renderInline(title)}</h${level}>`)
      continue
    }

    const listMatch = line.match(/^\s*[-*]\s+(.*)$/)
    if (listMatch) {
      flushParagraph()
      flushTable()
      if (/^\[( |x|X)\]\s+/.test(listMatch[1])) {
        listKind = 'task'
      }
      listBuffer.push(listMatch[1])
      continue
    }

    const isTableLine = /^\|(.+)\|$/.test(line)
    if (isTableLine) {
      flushParagraph()
      flushList()
      tableBuffer.push(line)
      continue
    }

    if (!line.trim()) {
      flushParagraph()
      flushList()
      flushTable()
      continue
    }

    flushList()
    flushTable()
    paragraphBuffer.push(escapeHtml(line))
  }

  flushParagraph()
  flushList()
  flushTable()

  if (inCodeBlock) {
    flushCodeBlock()
  }

  return htmlParts.join('')
}

function extractHeadings(markdown: string) {
  const headingCounter = new Map<string, number>()

  return markdown
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.match(/^(#{1,4})\s+(.*)$/))
    .filter((match): match is RegExpMatchArray => Boolean(match))
    .map((match) => ({
      level: match[1].length,
      title: match[2].trim(),
      id: buildUniqueHeadingId(match[2].trim(), headingCounter),
    }))
}

function buildHeadingId(text: string) {
  const normalized = text
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fa5\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')

  return normalized || 'section'
}

function buildUniqueHeadingId(text: string, counter: Map<string, number>) {
  const baseId = buildHeadingId(text)
  const currentCount = counter.get(baseId) ?? 0
  counter.set(baseId, currentCount + 1)

  return currentCount === 0 ? baseId : `${baseId}-${currentCount + 1}`
}

function renderInline(text: string) {
  return text
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
</script>

<template>
  <main class="workspace-page">
    <section class="workspace-header">
      <div>
        <NText depth="3">个人工作台</NText>
        <h1>周报与计划</h1>
        <p>保存 Typora 友好的 Markdown 周报，跟踪个人、工作、旅行和学习计划。</p>
      </div>
      <NSpace>
        <NButton secondary @click="openPlanEditor()">新建计划</NButton>
        <NButton type="primary" @click="openReportEditor()">新建周报</NButton>
      </NSpace>
    </section>

    <NGrid :cols="4" :x-gap="16" :y-gap="16" responsive="screen" class="stats-grid">
      <NGridItem>
        <NCard>
          <NText depth="3">周报数量</NText>
          <strong>{{ reportStats.total }}</strong>
        </NCard>
      </NGridItem>
      <NGridItem>
        <NCard>
          <NText depth="3">最近周报</NText>
          <strong>{{ reportStats.latest }}</strong>
        </NCard>
      </NGridItem>
      <NGridItem>
        <NCard>
          <NText depth="3">进行中计划</NText>
          <strong>{{ planStats.active }}</strong>
        </NCard>
      </NGridItem>
      <NGridItem>
        <NCard>
          <NText depth="3">已完成计划</NText>
          <strong>{{ planStats.done }} / {{ planStats.total }}</strong>
        </NCard>
      </NGridItem>
    </NGrid>

    <NTabs type="line" animated>
      <NTabPane name="reports" tab="个人周报">
        <NGrid :cols="12" :x-gap="18" :y-gap="18" responsive="screen">
          <NGridItem :span="12" :lg="4">
            <NCard title="周报列表" :loading="isLoading">
              <NSpace vertical :size="10" class="filter-panel">
                <NInput v-model:value="reportKeyword" clearable placeholder="搜索标题、摘要或正文" @update:value="handleReportFiltersChange" />
                <input
                  v-model="reportWeekFilter"
                  type="date"
                  class="native-date-input"
                  @change="handleReportFiltersChange"
                />
                <NSpace justify="space-between">
                  <NText depth="3">共 {{ filteredWeeklyReports.length }} 篇</NText>
                  <NButton size="tiny" tertiary @click="clearReportFilters">清空筛选</NButton>
                </NSpace>
              </NSpace>
              <NEmpty v-if="weeklyReports.length === 0" description="暂无周报" />
              <NEmpty v-else-if="filteredWeeklyReports.length === 0" description="没有匹配的周报" />
              <NSpace v-else vertical :size="10">
                <button
                  v-for="report in filteredWeeklyReports"
                  :key="report.id"
                  class="list-item"
                  :class="{ active: activeReport?.id === report.id }"
                  type="button"
                  @click="activeReport = report"
                >
                  <strong>{{ report.title }}</strong>
                  <span>{{ formatDate(report.weekStart) }} 至 {{ formatDate(report.weekEnd) }}</span>
                </button>
              </NSpace>
            </NCard>
          </NGridItem>

          <NGridItem :span="12" :lg="8">
            <NCard v-if="activeReport" :title="activeReport.title">
              <template #header-extra>
                <NSpace>
                  <NButton size="small" secondary @click="exportReport(activeReport)">导出 MD</NButton>
                  <NButton size="small" @click="openReportEditor(activeReport)">编辑</NButton>
                  <NPopconfirm positive-text="删除" negative-text="取消" @positive-click="deleteReport(activeReport)">
                    <template #trigger>
                      <NButton size="small" type="error" tertiary>删除</NButton>
                    </template>
                    确认删除这篇周报吗？
                  </NPopconfirm>
                </NSpace>
              </template>
              <NSpace vertical :size="14">
                <NCard v-if="reportTocItems.length > 0" embedded title="目录">
                  <div class="toc-list">
                    <a
                      v-for="item in reportTocItems"
                      :key="item.id"
                      :href="`#${item.id}`"
                      class="toc-link"
                      :style="{ paddingLeft: `${(item.level - 1) * 14}px` }"
                    >
                      {{ item.title }}
                    </a>
                  </div>
                </NCard>
                <NSpace align="center" :size="8" wrap>
                  <NTag round>{{ formatDate(activeReport.weekStart) }} 至 {{ formatDate(activeReport.weekEnd) }}</NTag>
                  <NText depth="3">更新于 {{ formatDate(activeReport.updatedAt) }}</NText>
                </NSpace>
                <p v-if="activeReport.summary" class="summary-text">{{ activeReport.summary }}</p>
                <article class="markdown-preview markdown-rendered" v-html="renderedReportContent" />
              </NSpace>
            </NCard>
            <NCard v-else>
              <NEmpty description="选择或新建一篇周报" />
            </NCard>
          </NGridItem>
        </NGrid>
      </NTabPane>

      <NTabPane name="plans" tab="个人计划">
        <NGrid :cols="12" :x-gap="18" :y-gap="18" responsive="screen">
          <NGridItem :span="12" :lg="4">
            <NCard title="计划列表" :loading="isLoading">
              <NEmpty v-if="plans.length === 0" description="暂无计划" />
              <NSpace v-else vertical :size="10">
                <button
                  v-for="plan in plans"
                  :key="plan.id"
                  class="list-item"
                  :class="{ active: activePlan?.id === plan.id }"
                  type="button"
                  @click="activePlan = plan"
                >
                  <strong>{{ plan.title }}</strong>
                  <span>{{ typeLabels[plan.type] }} · {{ statusLabels[plan.status] }} · {{ plan.progress }}%</span>
                </button>
              </NSpace>
            </NCard>
          </NGridItem>

          <NGridItem :span="12" :lg="8">
            <NCard v-if="activePlan" :title="activePlan.title">
              <template #header-extra>
                <NSpace>
                  <NButton size="small" secondary @click="exportPlan(activePlan)">导出 MD</NButton>
                  <NButton size="small" @click="openPlanEditor(activePlan)">编辑</NButton>
                  <NPopconfirm positive-text="删除" negative-text="取消" @positive-click="deletePlan(activePlan)">
                    <template #trigger>
                      <NButton size="small" type="error" tertiary>删除</NButton>
                    </template>
                    确认删除这个计划吗？
                  </NPopconfirm>
                </NSpace>
              </template>
              <NSpace vertical :size="16">
                <NCard v-if="planTocItems.length > 0" embedded title="目录">
                  <div class="toc-list">
                    <a
                      v-for="item in planTocItems"
                      :key="item.id"
                      :href="`#${item.id}`"
                      class="toc-link"
                      :style="{ paddingLeft: `${(item.level - 1) * 14}px` }"
                    >
                      {{ item.title }}
                    </a>
                  </div>
                </NCard>
                <NSpace align="center" :size="8" wrap>
                  <NTag round>{{ typeLabels[activePlan.type] }}</NTag>
                  <NTag round :type="statusTypes[activePlan.status]">{{ statusLabels[activePlan.status] }}</NTag>
                  <NText depth="3">更新于 {{ formatDate(activePlan.updatedAt) }}</NText>
                </NSpace>
                <NProgress type="line" :percentage="activePlan.progress" indicator-placement="inside" />
                <NGrid :cols="2" :x-gap="14" :y-gap="14" responsive="screen">
                  <NGridItem>
                    <NCard embedded title="当前规划">
                      <p class="summary-text">{{ activePlan.currentPlan || '暂未填写' }}</p>
                    </NCard>
                  </NGridItem>
                  <NGridItem>
                    <NCard embedded title="下一阶段">
                      <p class="summary-text">{{ activePlan.nextPlan || '暂未填写' }}</p>
                    </NCard>
                  </NGridItem>
                </NGrid>
                <article class="markdown-preview markdown-rendered" v-html="renderedPlanContent" />
              </NSpace>
            </NCard>
            <NCard v-else>
              <NEmpty description="选择或新建一个计划" />
            </NCard>
          </NGridItem>
        </NGrid>
      </NTabPane>
    </NTabs>

    <NModal v-model:show="showReportEditor" preset="card" :title="editingReportId ? '编辑周报' : '新建周报'" class="workspace-modal">
      <NForm label-placement="top" @submit.prevent="submitReport">
        <NFlex :wrap="false">
          <NGrid :cols="2" :x-gap="14" responsive="screen" class="workspace-editor">
            <NGridItem :span="2">
              <NFormItem label="标题" required>
                <NInput v-model:value="reportForm.title" clearable placeholder="例如：2026-05-11 周报" />
              </NFormItem>
            </NGridItem>
            <NGridItem>
              <NFormItem label="开始日期" required>
                <input v-model="reportForm.weekStart" type="date" class="native-date-input" />
              </NFormItem>
            </NGridItem>
            <NGridItem>
              <NFormItem label="结束日期" required>
                <input v-model="reportForm.weekEnd" type="date" class="native-date-input" />
              </NFormItem>
            </NGridItem>
            <NGridItem :span="2">
              <NFormItem label="摘要">
                <NInput v-model:value="reportForm.summary" clearable placeholder="本周一句话概览" />
              </NFormItem>
            </NGridItem>
            <NGridItem :span="2">
              <NFormItem label="Markdown 内容" required>
                <NInput v-model:value="reportForm.content" type="textarea" class="editor-input-week" :autosize="{ minRows: 16, maxRows: 28 }" />
              </NFormItem>
            </NGridItem>
          </NGrid>
          <NCard embedded title="实时预览" class="editor-preview-card">
            <article class="markdown-preview markdown-rendered markdown-preview-week" v-html="renderedReportDraftContent" />
          </NCard>
        </NFlex>
        <NSpace justify="end" class="workspace-bottom-btn">
          <NButton :disabled="isSubmitting" @click="showReportEditor = false">取消</NButton>
          <NButton type="primary" attr-type="submit" :loading="isSubmitting">保存周报</NButton>
        </NSpace>
      </NForm>
    </NModal>

    <NModal v-model:show="showPlanEditor" preset="card" :title="editingPlanId ? '编辑计划' : '新建计划'" class="workspace-modal">
      <NForm label-placement="top" @submit.prevent="submitPlan">
        <NFlex :wrap="false">
          <NGrid :cols="2" :x-gap="14" responsive="screen" class="workspace-editor">
            <NGridItem :span="2">
              <NFormItem label="标题" required>
                <NInput v-model:value="planForm.title" clearable placeholder="例如：杭州旅行计划、Q2 个人成长计划" />
              </NFormItem>
            </NGridItem>
            <NGridItem>
              <NFormItem label="类型">
                <NSelect v-model:value="planForm.type" :options="planTypeOptions" />
              </NFormItem>
            </NGridItem>
            <NGridItem>
              <NFormItem label="状态">
                <NSelect v-model:value="planForm.status" :options="planStatusOptions" />
              </NFormItem>
            </NGridItem>
            <NGridItem :span="2">
              <NFormItem label="完成进度">
                <NInputNumber v-model:value="planForm.progress" :min="0" :max="100" :step="5" class="full-input" />
              </NFormItem>
            </NGridItem>
            <NGridItem>
              <NFormItem label="当前规划">
                <NInput v-model:value="planForm.currentPlan" type="textarea" :autosize="{ minRows: 4, maxRows: 8 }" />
              </NFormItem>
            </NGridItem>
            <NGridItem>
              <NFormItem label="下一阶段规划">
                <NInput v-model:value="planForm.nextPlan" type="textarea" :autosize="{ minRows: 4, maxRows: 8 }" />
              </NFormItem>
            </NGridItem>
            <NGridItem :span="2">
              <NFormItem label="Markdown 详情" required>
                <NInput v-model:value="planForm.content" type="textarea" class="editor-input-plan" :autosize="{ minRows: 14, maxRows: 26 }" />
              </NFormItem>
            </NGridItem>
            
          </NGrid>
          <NCard embedded title="实时预览" class="editor-preview-card">
            <article class="markdown-preview markdown-rendered markdown-preview-plan" v-html="renderedPlanDraftContent" />
          </NCard>
        </NFlex>
        <NSpace justify="end" class="workspace-bottom-btn">
          <NButton :disabled="isSubmitting" @click="showPlanEditor = false">取消</NButton>
          <NButton type="primary" attr-type="submit" :loading="isSubmitting">保存计划</NButton>
        </NSpace>
      </NForm>
    </NModal>
  </main>
</template>

<style>
.workspace-page {
  max-width: 1180px;
  margin: 0 auto;
  padding: 28px 24px 56px;
}

.workspace-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 20px;
}

.workspace-header h1 {
  margin: 4px 0 8px;
  font-size: 34px;
  line-height: 1.2;
}

.workspace-header p {
  margin: 0;
  color: var(--n-text-color-2);
}

.stats-grid {
  margin-bottom: 20px;
}

.stats-grid strong {
  display: block;
  margin-top: 8px;
  overflow: hidden;
  font-size: 24px;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.filter-panel {
  margin-bottom: 12px;
}

.list-item {
  width: 100%;
  border: 1px solid var(--n-border-color);
  border-radius: 8px;
  background: var(--n-color);
  color: var(--n-text-color);
  cursor: pointer;
  display: grid;
  gap: 6px;
  padding: 12px;
  text-align: left;
  transition: border-color 0.2s ease, background 0.2s ease;
}

.list-item:hover,
.list-item.active {
  border-color: var(--n-primary-color);
  background: rgba(15, 118, 110, 0.08);
}

.list-item span {
  color: var(--n-text-color-3);
  font-size: 12px;
}

.summary-text {
  margin: 0;
  color: var(--n-text-color-2);
  line-height: 1.8;
  white-space: pre-wrap;
}

.toc-list {
  display: grid;
  gap: 8px;
}

.toc-link {
  color: var(--n-text-color-2);
  line-height: 1.5;
  text-decoration: none;
}

.toc-link:hover {
  color: var(--n-primary-color);
}

.markdown-preview {
  overflow: auto;
  border: 1px solid var(--n-border-color);
  border-radius: 8px;
  background: var(--n-color-modal);
  color: var(--n-text-color);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace;
  line-height: 1.75;
  margin: 0;
  padding: 16px;
  white-space: pre-wrap;
  word-break: break-word;
}

.markdown-preview-plan{
  max-height: 740px;

}
.markdown-preview-week{
  max-height: 670px;
}

.markdown-rendered {
  white-space: normal;
}

.markdown-rendered :deep(h1),
.markdown-rendered :deep(h2),
.markdown-rendered :deep(h3),
.markdown-rendered :deep(h4) {
  margin: 0 0 14px;
  line-height: 1.35;
}

.markdown-rendered :deep(p) {
  margin: 0 0 14px;
}

.markdown-rendered :deep(ul) {
  margin: 0 0 14px;
  padding-left: 22px;
}

.markdown-rendered :deep(.task-list) {
  padding-left: 0;
}

.markdown-rendered :deep(.task-item) {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  list-style: none;
}

.markdown-rendered :deep(.task-item input) {
  margin-top: 4px;
}

.markdown-rendered :deep(li) {
  margin-bottom: 8px;
}

.markdown-rendered :deep(pre) {
  overflow: auto;
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.06);
  margin: 0 0 14px;
  padding: 14px;
  white-space: pre-wrap;
}

.markdown-rendered :deep(code) {
  border-radius: 4px;
  background: rgba(15, 23, 42, 0.08);
  padding: 2px 6px;
}

.markdown-rendered :deep(pre code) {
  background: transparent;
  padding: 0;
}

.markdown-rendered :deep(a) {
  color: var(--n-primary-color);
  text-decoration: none;
}

.markdown-rendered :deep(a:hover) {
  text-decoration: underline;
}

.markdown-rendered :deep(.table-wrap) {
  overflow-x: auto;
  margin: 0 0 14px;
}

.markdown-rendered :deep(table) {
  width: 100%;
  border-collapse: collapse;
}

.markdown-rendered :deep(th),
.markdown-rendered :deep(td) {
  border: 1px solid var(--n-border-color);
  padding: 10px 12px;
  text-align: left;
  vertical-align: top;
}

.markdown-rendered :deep(th) {
  background: rgba(15, 23, 42, 0.05);
  font-weight: 700;
}

.workspace-modal {
  width: 1200px;
}

.workspace-editor{
  flex: 1;
}

.editor-input-week{
  max-height: 450px;
}

.editor-input-plan{
  max-height: 370px;
}

.editor-preview-card {
  flex: 1;
  overflow: hidden;
}

.workspace-bottom-btn{
  margin-top: 15px;
}

.full-input {
  width: 100%;
}

.native-date-input {
  width: 100%;
  min-height: 40px;
  border: 1px solid var(--n-border-color);
  border-radius: 6px;
  background: var(--n-color);
  color: var(--n-text-color);
  padding: 0 12px;
}

.native-date-input:focus {
  border-color: var(--n-primary-color);
  outline: none;
}

@media (max-width: 760px) {
  .workspace-page {
    padding: 18px;
  }

  .workspace-header {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
