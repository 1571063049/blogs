<script setup lang="ts">
import { ref, useSlots, onMounted, watch, nextTick } from "vue";

// 定义内部的状态
const showLeftArrow = ref(false);
const showRightArrow = ref(false);
const positionIndex = ref(0);

const totalDistance = ref(0);
const scrollContentRef = ref<HTMLElement | null>(null);

// 获取插槽内容，用于监听 children 变化（对应 React 的 props.children）
const slots = useSlots();

// 更新滚动状态和总距离
const updateScrollInfo = () => {
  if (!scrollContentRef.value) return;

  const childElScrollWidth = scrollContentRef.value.scrollWidth;
  const childElClientWidth = scrollContentRef.value.clientWidth;
  console.log('childElScrollWidth',childElScrollWidth);
  console.log('childElClientWidth',childElClientWidth);
  
  totalDistance.value = childElScrollWidth - childElClientWidth;

  // 判断是否需要显示右侧箭头
  showRightArrow.value = totalDistance.value > 0;
  // 初始化时左侧箭头肯定不显示
  showLeftArrow.value = false;
  positionIndex.value = 0;
};

// 监听插槽变化，并在 DOM 更新后重新计算（对应 React 的 useEffect 依赖 props.children）
watch(
  () => slots.default?.(),
  async () => {
    await nextTick();
    updateScrollInfo();
  },
  { deep: true },
);

// 组件挂载时初始化
onMounted(() => {
  updateScrollInfo();
});

const arrowClick = (isRight: boolean) => {
  if (!scrollContentRef.value) return;

  let newIndex = isRight ? positionIndex.value + 1 : positionIndex.value - 1;
  // 边界检查，防止索引越界
  if (!scrollContentRef.value.children[newIndex]) return;

  let newEl = scrollContentRef.value.children[newIndex] as HTMLElement;
  let newElOffsetLeft = newEl.offsetLeft;
  console.log('newElOffsetLeft',newElOffsetLeft);
  
  // 执行滚动
  scrollContentRef.value.style.transform = `translateX(-${newElOffsetLeft}px)`;

  // 更新状态
  positionIndex.value = newIndex;
  showRightArrow.value = totalDistance.value > newElOffsetLeft;
  showLeftArrow.value = newIndex > 0;
};
</script>

<template>
  <div class="scroll-view">
    <div class="control left" @click="() => arrowClick(false)" v-show="showLeftArrow">
      <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M5.64645 3.14645C5.45118 3.34171 5.45118 3.65829 5.64645 3.85355L9.79289 8L5.64645 12.1464C5.45118 12.3417 5.45118 12.6583 5.64645 12.8536C5.84171 13.0488 6.15829 13.0488 6.35355 12.8536L10.8536 8.35355C11.0488 8.15829 11.0488 7.84171 10.8536 7.64645L6.35355 3.14645C6.15829 2.95118 5.84171 2.95118 5.64645 3.14645Z"
          fill="currentColor"
        ></path>
      </svg>
    </div>
    <div class="control right" @click="() => arrowClick(true)" v-show="showRightArrow">
      <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M5.64645 3.14645C5.45118 3.34171 5.45118 3.65829 5.64645 3.85355L9.79289 8L5.64645 12.1464C5.45118 12.3417 5.45118 12.6583 5.64645 12.8536C5.84171 13.0488 6.15829 13.0488 6.35355 12.8536L10.8536 8.35355C11.0488 8.15829 11.0488 7.84171 10.8536 7.64645L6.35355 3.14645C6.15829 2.95118 5.84171 2.95118 5.64645 3.14645Z"
          fill="currentColor"
        ></path>
      </svg>
    </div>
    <div class="scroll">
      <div class="scroll-content" ref="scrollContentRef">
        <slot></slot>
      </div>
    </div>
  </div>
</template>

<style scoped>
.scroll-view {
  position: relative;
}

.scroll{
  overflow: hidden;
}

.scroll-content{
  display: flex;
  transition: transform 300ms ease;
}

.control {
  z-index: 999;
  position: absolute;
  z-index: 9;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 50%;
  cursor: pointer;
  border-width: 1px;
  border-style: solid;
  border-color: #fff;
  background-color: #fff;
  box-shadow: 0px 1px 1px 2px rgba(0, 0, 0, 0.1);
}

.control:hover {
  transition: box-shadow 200ms ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.18);
}

.left {
  top: 50%;
  transform: translateY(-50%);
  left: -14px;
  transform: rotate(180deg);
}

.right {
  top: 50%;
  transform: translateY(-50%);
  right: -14px;
}

.scroll-content{
  display: flex;
}
</style>
