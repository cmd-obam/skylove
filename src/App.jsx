import { BrowserRouter, Routes, Route, Navigate, useParams, Outlet } from 'react-router-dom'
import SiteHeader from '@/components/layout/SiteHeader'
import Footer from '@/components/layout/Footer'
import CategoryLayout from '@/components/layout/CategoryLayout'
import SubLayout from '@/components/layout/SubLayout'
import ImageProtection from '@/components/common/ImageProtection'
import Home from '@/pages/Home'
import About from '@/pages/About'
import ChurchHistory from '@/pages/ChurchHistory'
import Worship from '@/pages/Worship'
import Location from '@/pages/Location'
import Auth from '@/pages/Auth'
import Signup from '@/pages/Signup'
import AuthCallback from '@/pages/AuthCallback'
import EmailConfirmSuccess from '@/pages/EmailConfirmSuccess'
import MemberEdit from '@/pages/MemberEdit'
import MemberManagement from '@/pages/MemberManagement'
import ResetPassword from '@/pages/ResetPassword'
import ResetPasswordSecurityQuestion from '@/pages/ResetPasswordSecurityQuestion'
import ResetPasswordEmailVerify from '@/pages/ResetPasswordEmailVerify'
import ChangePassword from '@/pages/ChangePassword'
import Admin from '@/pages/Admin'
import AdminRoute from '@/components/auth/AdminRoute'
import ChurchNews from '@/pages/ChurchNews'
import ChurchNewsDetail from '@/pages/ChurchNewsDetail'
import ChurchNewsWrite from '@/pages/ChurchNewsWrite'
import ChurchNewsEdit from '@/pages/ChurchNewsEdit'
import EventPhotos from '@/pages/EventPhotos'
import EventPhotoDetail from '@/pages/EventPhotoDetail'
import BoardPostViewerPage from '@/pages/BoardPostViewerPage'
import AlbumWrite from '@/pages/AlbumWrite'
import AlbumEdit from '@/pages/AlbumEdit'
import SundayWorshipList from '@/pages/worshipWord/SundayWorshipList'
import SundayWorshipDetail from '@/pages/worshipWord/SundayWorshipDetail'
import SundayWorshipWrite from '@/pages/worshipWord/SundayWorshipWrite'
import SundayWorshipEdit from '@/pages/worshipWord/SundayWorshipEdit'
import ElShaddaiList from '@/pages/worshipWord/ElShaddaiList'
import ElShaddaiDetail from '@/pages/worshipWord/ElShaddaiDetail'
import ElShaddaiWrite from '@/pages/worshipWord/ElShaddaiWrite'
import ElShaddaiEdit from '@/pages/worshipWord/ElShaddaiEdit'
import MemberRoute from '@/components/auth/MemberRoute'
import SuperAdminRoute from '@/components/auth/SuperAdminRoute'
import NewFamilyGuide from '@/pages/NewFamilyGuide'
import WorshipGuidePage from '@/pages/WorshipGuidePage'
import Facilities from '@/pages/Facilities'
import {
  Education,
  Mission,
  Fellowship,
  FacilityVr,
} from '@/pages/PlaceholderPage'
import ScrollToTop from '@/components/common/ScrollToTop'
import '@/App.css'
import { AuthProvider } from '@/contexts/AuthContext'

function LegacyEventPhotoDetailRedirect() {
  const { postId } = useParams()
  return <Navigate to={`/church-news/album/${postId}`} replace />
}

function LegacyBoardPostViewerRedirect() {
  const { postId } = useParams()
  return <Navigate to={`/viewer/${postId}`} replace />
}

function SiteShell() {
  return (
    <div className="app">
      <SiteHeader />
      <main className="main">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}

function App() {
  const basename = import.meta.env.BASE_URL.replace(/\/$/, '')

  return (
    <BrowserRouter basename={basename || undefined}>
      <ScrollToTop />
      <AuthProvider>
        <ImageProtection />
        <Routes>
          <Route
            path="/viewer/:postId"
            element={
              <MemberRoute>
                <BoardPostViewerPage />
              </MemberRoute>
            }
          />
          <Route path="/church-news/album/:postId/viewer" element={<LegacyBoardPostViewerRedirect />} />
          <Route path="/church-news/:postId/viewer" element={<LegacyBoardPostViewerRedirect />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/auth/confirm" element={<EmailConfirmSuccess />} />
          <Route path="/email-confirm" element={<EmailConfirmSuccess />} />
          <Route element={<SiteShell />}>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Auth />} />
            <Route path="/reset-password/security-question" element={<ResetPasswordSecurityQuestion />} />
            <Route path="/reset-password/email-verify" element={<ResetPasswordEmailVerify />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/member/edit" element={<MemberEdit />} />
            <Route path="/mypage/change-password" element={<ChangePassword />} />
            <Route
              path="/member/management"
              element={
                <SuperAdminRoute>
                  <MemberManagement />
                </SuperAdminRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <Admin />
                </AdminRoute>
              }
            />
            <Route path="/church-news/news" element={<Navigate to="/church-news" replace />} />
            <Route path="/church-life" element={<Navigate to="/church-news" replace />} />
            <Route path="/church-life/album" element={<Navigate to="/church-news/album" replace />} />
            <Route path="/church-life/service" element={<Navigate to="/church-news" replace />} />
            <Route path="/church-life/worship-praise" element={<Navigate to="/church-news/album" replace />} />
            <Route path="/church-news/event-photos" element={<Navigate to="/church-news/album" replace />} />
            <Route path="/church-news/event-photos/:postId" element={<LegacyEventPhotoDetailRedirect />} />
            <Route path="/sunday-school" element={<Navigate to="/church-news" replace />} />
            <Route path="/church-news/new-family" element={<Navigate to="/church-news" replace />} />
            <Route path="/notice" element={<Navigate to="/church-news" replace />} />
            <Route path="/word-worship" element={<Navigate to="/worship-guide/sunday-blessing" replace />} />
            <Route element={<CategoryLayout />}>
              <Route element={<SubLayout />}>
                <Route path="/about" element={<About />} />
                <Route path="/about/history" element={<ChurchHistory />} />
                <Route path="/about/facility-vr" element={<FacilityVr />} />
                <Route path="/about/facilities" element={<Facilities />} />
                <Route path="/about/location" element={<Location />} />
                <Route path="/worship" element={<Worship />} />
                <Route path="/worship-guide" element={<Navigate to="/worship-guide/sunday-blessing" replace />} />
                <Route path="/worship-guide/sunday-blessing/communion" element={<WorshipGuidePage />} />
                <Route path="/worship-guide/sunday-blessing" element={<WorshipGuidePage />} />
                <Route path="/worship-guide/sunday-praise" element={<WorshipGuidePage />} />
                <Route path="/worship-guide/wednesday" element={<WorshipGuidePage />} />
                <Route path="/worship-guide/dawn-prayer" element={<WorshipGuidePage />} />
                <Route path="/worship-guide/el-shaddai-choir" element={<WorshipGuidePage />} />
                <Route path="/worship-guide/cell-meeting" element={<WorshipGuidePage />} />
                <Route path="/worship-word" element={<Navigate to="/worship-word/sunday" replace />} />
                <Route path="/worship-word/sunday" element={<SundayWorshipList />} />
                <Route path="/worship-word/el-shaddai" element={<ElShaddaiList />} />
                <Route path="/education" element={<Education />} />
                <Route path="/mission" element={<Mission />} />
                <Route path="/fellowship" element={<Fellowship />} />
                <Route path="/church-news" element={<ChurchNews />} />
                <Route path="/church-news/album" element={<EventPhotos />} />
                <Route element={<AdminRoute />}>
                  <Route path="/worship-word/sunday/write" element={<SundayWorshipWrite />} />
                  <Route path="/worship-word/sunday/edit/:postId" element={<SundayWorshipEdit />} />
                  <Route path="/worship-word/el-shaddai/write" element={<ElShaddaiWrite />} />
                  <Route path="/worship-word/el-shaddai/edit/:postId" element={<ElShaddaiEdit />} />
                  <Route path="/news/write" element={<ChurchNewsWrite />} />
                  <Route path="/news/edit/:postId" element={<ChurchNewsEdit />} />
                  <Route path="/album/write" element={<AlbumWrite />} />
                  <Route path="/album/edit/:postId" element={<AlbumEdit />} />
                </Route>
                <Route element={<MemberRoute />}>
                  <Route path="/worship-word/sunday/:postId" element={<SundayWorshipDetail />} />
                  <Route path="/worship-word/el-shaddai/:postId" element={<ElShaddaiDetail />} />
                  <Route path="/church-news/album/:postId" element={<EventPhotoDetail />} />
                  <Route path="/church-news/:postId" element={<ChurchNewsDetail />} />
                </Route>
                <Route path="/church-news/write" element={<Navigate to="/news/write" replace />} />
                <Route path="/church-news/album/write" element={<Navigate to="/album/write" replace />} />
                <Route path="/new-family" element={<NewFamilyGuide />} />
              </Route>
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
