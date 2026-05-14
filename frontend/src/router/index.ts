import { createRouter, createWebHistory } from 'vue-router'
import BlogLayout from '../layouts/BlogLayout.vue'
import AdminLayout from '../layouts/AdminLayout.vue'
import { useAuthStore } from '../stores/auth'

const HomeView = () => import('../views/HomeView.vue')
const PostDetailView = () => import('../views/PostDetailView.vue')
const ArchiveView = () => import('../views/ArchiveView.vue')
const AboutView = () => import('../views/AboutView.vue')
const LoginView = () => import('../views/LoginView.vue')
const FavoritesView = () => import('../views/FavoritesView.vue')
const ProfileView = () => import('../views/ProfileView.vue')
const WritePostView = () => import('../views/WritePostView.vue')
const MyPostsView = () => import('../views/MyPostsView.vue')
const NotificationsView = () => import('../views/NotificationsView.vue')
const WorkspaceView = () => import('../views/WorkspaceView.vue')
const AdminDashboardView = () => import('../views/AdminDashboardView.vue')
const AdminPostsView = () => import('../views/AdminPostsView.vue')
const AdminReviewQueueView = () => import('../views/AdminReviewQueueView.vue')
const AdminCommentsView = () => import('../views/AdminCommentsView.vue')
const AdminTaxonomyView = () => import('../views/AdminTaxonomyView.vue')

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: BlogLayout,
      children: [
        { path: '', name: 'home', component: HomeView },
        { path: 'posts/:slug', name: 'post-detail', component: PostDetailView },
        { path: 'category/:slug', name: 'category', component: HomeView },
        { path: 'tag/:slug', name: 'tag', component: HomeView },
        { path: 'archive', name: 'archive', component: ArchiveView },
        { path: 'about', name: 'about', component: AboutView },
        { path: 'favorites', name: 'favorites', component: FavoritesView, meta: { requiresAuth: true } },
        { path: 'write', name: 'write-post', component: WritePostView, meta: { requiresAuth: true } },
        { path: 'write/:id', name: 'edit-my-post', component: WritePostView, meta: { requiresAuth: true } },
        { path: 'posts/mine', name: 'my-posts', component: MyPostsView, meta: { requiresAuth: true } },
        { path: 'notifications', name: 'notifications', component: NotificationsView, meta: { requiresAuth: true } },
        { path: 'workspace', name: 'workspace', component: WorkspaceView, meta: { requiresAuth: true } },
        { path: 'drafts', redirect: { name: 'my-posts' } },
        { path: 'profile', name: 'profile', component: ProfileView, meta: { requiresAuth: true } },
        { path: 'login', name: 'login', component: LoginView },
      ],
    },
    {
      path: '/admin',
      component: AdminLayout,
      meta: { requiresAuth: true, requiresAdmin: true },
      children: [
        { path: '', name: 'admin-dashboard', component: AdminDashboardView },
        { path: 'posts', name: 'admin-posts', component: AdminPostsView },
        { path: 'reviews', name: 'admin-reviews', component: AdminReviewQueueView },
        { path: 'comments', name: 'admin-comments', component: AdminCommentsView },
        { path: 'taxonomy', name: 'admin-taxonomy', component: AdminTaxonomyView },
      ],
    },
  ],
})

router.beforeEach(async (to) => {
  const authStore = useAuthStore()

  if (authStore.token && !authStore.user) {
    await authStore.loadMe()
  }

  if (to.meta.requiresAuth && !authStore.isLoggedIn) {
    return {
      name: 'login',
      query: { redirect: to.fullPath },
    }
  }

  if (to.meta.requiresAdmin && !authStore.isAdmin) {
    return { name: 'home' }
  }

  if (to.name === 'login' && authStore.isLoggedIn) {
    return authStore.isAdmin ? { name: 'admin-dashboard' } : { name: 'home' }
  }

  return true
})

export default router
